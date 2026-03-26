"""Instagram scraper using Instaloader.

Ported from GVB recon/scraper/instagram.py with hardcoded paths removed.
All path constants replaced with explicit parameters or PipelineConfig.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Callable

import instaloader

from mcl_pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)


class InstaClient:
    """Instaloader-based Instagram client with session persistence."""

    def __init__(
        self,
        session_dir: Optional[Path] = None,
        config: Optional[PipelineConfig] = None,
    ):
        if session_dir is None and config is not None:
            session_dir = config.data_dir / "recon"
        if session_dir is None:
            session_dir = Path.home() / ".mcl" / "instagram"

        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.loader = instaloader.Instaloader(
            download_videos=True,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
        )
        self._logged_in = False
        self._username: Optional[str] = None

    def login(self, username: str, password: str) -> bool:
        """
        Login to Instagram. Tries loading saved session first, falls back to fresh login.

        Args:
            username: Instagram username
            password: Instagram password

        Returns:
            True if login successful
        """
        session_file = self.session_dir / f".session_{username}"

        # Try loading existing session
        if session_file.exists():
            try:
                self.loader.load_session_from_file(username, str(session_file))
                # Verify session is still valid
                self.loader.test_login()
                self._logged_in = True
                self._username = username
                logger.info("Session loaded for @%s", username)
                return True
            except Exception as e:
                logger.warning(
                    "Saved session invalid for @%s, re-logging in: %s",
                    username,
                    e,
                )

        # Fresh login
        try:
            self.loader.login(username, password)
            self.loader.save_session_to_file(str(session_file))
            self._logged_in = True
            self._username = username
            logger.info("Fresh login successful for @%s", username)
            return True
        except instaloader.exceptions.BadCredentialsException:
            logger.error("Bad credentials for @%s", username)
            return False
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            logger.error(
                "2FA required for @%s -- not supported in headless mode", username
            )
            return False
        except Exception as e:
            logger.error("Login failed for @%s: %s", username, e, exc_info=True)
            return False

    def get_competitor_reels(
        self,
        handle: str,
        max_reels: int = 50,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> List[Dict]:
        """
        Fetch reel metadata from a competitor's profile.

        Args:
            handle: Instagram handle (without @)
            max_reels: Maximum reels to fetch
            progress_callback: Optional callback for progress updates

        Returns:
            List of reel dicts sorted by views (descending)
        """
        if not self._logged_in:
            raise RuntimeError("Not logged in. Call login() first.")

        reels: List[Dict] = []
        handle = handle.lstrip("@")

        try:
            profile = instaloader.Profile.from_username(self.loader.context, handle)
        except instaloader.exceptions.ProfileNotExistsException:
            logger.error("Profile @%s does not exist", handle)
            return []
        except Exception as e:
            logger.error("Failed to load profile @%s: %s", handle, e, exc_info=True)
            return []

        if profile.is_private and not profile.followed_by_viewer:
            logger.warning("@%s is private and not followed", handle)
            return []

        profile_info = {
            "full_name": profile.full_name,
            "followers": profile.followers,
            "username": handle,
        }

        logger.info(
            "Fetching reels from @%s (followers=%d, full_name=%s)",
            handle,
            profile.followers,
            profile.full_name,
        )

        if progress_callback:
            progress_callback(
                f"Scanning @{handle} ({profile.followers:,} followers)..."
            )

        count = 0
        for post in profile.get_posts():
            if count >= max_reels:
                break

            # Only interested in video/reel posts
            if not post.is_video:
                continue

            reel = {
                "shortcode": post.shortcode,
                "url": f"https://www.instagram.com/reel/{post.shortcode}/",
                "video_url": post.video_url,
                "views": post.video_view_count or 0,
                "likes": post.likes,
                "comments": post.comments,
                "caption": (post.caption or "")[:200],
                "timestamp": post.date_utc.isoformat(),
                "profile": profile_info,
            }
            reels.append(reel)
            count += 1

            if progress_callback and count % 5 == 0:
                progress_callback(f"Found {count} reels from @{handle}...")

            # Rate limiting
            if count % 12 == 0:
                time.sleep(1)

        # Sort by views descending
        reels.sort(key=lambda x: x.get("views", 0), reverse=True)

        logger.info(
            "Fetched %d reels from @%s (top_views=%d)",
            len(reels),
            handle,
            reels[0]["views"] if reels else 0,
        )

        return reels

    def download_reel(self, shortcode: str, output_path: Path) -> bool:
        """
        Download a single reel video file.

        Args:
            shortcode: Instagram reel shortcode
            output_path: Path to save the video file

        Returns:
            True if download successful
        """
        if not self._logged_in:
            raise RuntimeError("Not logged in. Call login() first.")

        try:
            post = instaloader.Post.from_shortcode(self.loader.context, shortcode)

            if not post.is_video or not post.video_url:
                logger.warning(
                    "Post %s is not a video or has no video URL", shortcode
                )
                return False

            # Download using requests (Instaloader's context has authenticated session)
            import requests

            output_path.parent.mkdir(parents=True, exist_ok=True)

            response = requests.get(post.video_url, stream=True, timeout=120)
            if response.status_code == 200:
                with open(output_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

                if output_path.exists() and output_path.stat().st_size > 0:
                    logger.info(
                        "Downloaded reel %s (file_size=%d)",
                        shortcode,
                        output_path.stat().st_size,
                    )
                    return True

            logger.warning(
                "Download failed for %s: HTTP %d", shortcode, response.status_code
            )
            return False

        except Exception as e:
            logger.error(
                "Download error for %s: %s", shortcode, e, exc_info=True
            )
            return False

    def save_competitor_data(
        self,
        handle: str,
        reels: List[Dict],
        data_dir: Optional[Path] = None,
    ) -> None:
        """Save scraped reel data to the competitor's data directory.

        Args:
            handle: Instagram handle
            reels: List of reel dicts
            data_dir: Directory for storing competitor data.
                      Falls back to self.session_dir if not provided.
        """
        handle = handle.lstrip("@")
        base_dir = data_dir or self.session_dir
        competitor_dir = base_dir / "competitors" / handle
        competitor_dir.mkdir(parents=True, exist_ok=True)

        output = {
            "handle": handle,
            "scraped_at": datetime.utcnow().isoformat(),
            "total_reels": len(reels),
            "reels": reels,
        }

        reels_file = competitor_dir / "reels.json"
        with open(reels_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info("Saved %d reels for @%s to %s", len(reels), handle, reels_file)
