"""YouTube scraper using yt-dlp.

Ported from GVB recon/scraper/youtube.py with hardcoded paths removed.
All path constants replaced with PipelineConfig dependency injection.
"""
from __future__ import annotations

import json
import logging
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Callable

from mcl_pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)


def get_channel_videos(
    handle: str,
    max_videos: int = 20,
    config: Optional[PipelineConfig] = None,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> List[Dict]:
    """
    Fetch recent video metadata from a YouTube channel using yt-dlp.

    Args:
        handle: YouTube handle (e.g., "@Chase-H-AI") or channel URL
        max_videos: Maximum videos to fetch
        config: PipelineConfig (unused for fetching, kept for API consistency)
        progress_callback: Optional progress callback

    Returns:
        List of video dicts sorted by view count (descending)
    """
    # Normalize handle to URL
    if handle.startswith("@"):
        channel_url = f"https://www.youtube.com/{handle}/videos"
    elif handle.startswith("http"):
        channel_url = handle
    else:
        channel_url = f"https://www.youtube.com/@{handle}/videos"

    logger.info("Fetching videos from %s (max_videos=%d)", channel_url, max_videos)

    if progress_callback:
        progress_callback(f"Scanning YouTube channel {handle}...")

    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--flat-playlist",
                "--dump-json",
                "--playlist-end", str(max_videos),
                "--no-warnings",
                "--quiet",
                channel_url,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.error(
                "yt-dlp failed for %s: %s",
                handle,
                result.stderr[:300] if result.stderr else "(no stderr)",
            )
            return []

        videos = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                video = {
                    "video_id": data.get("id", ""),
                    "url": data.get("url", f"https://www.youtube.com/watch?v={data.get('id', '')}"),
                    "title": data.get("title", ""),
                    "views": data.get("view_count", 0) or 0,
                    "likes": data.get("like_count", 0) or 0,
                    "duration": data.get("duration", 0) or 0,
                    "upload_date": data.get("upload_date", ""),
                    "description": (data.get("description", "") or "")[:200],
                    "channel": handle,
                }
                videos.append(video)
            except json.JSONDecodeError:
                continue

        # Sort by views descending
        videos.sort(key=lambda x: x.get("views", 0), reverse=True)

        logger.info(
            "Fetched %d videos from %s (top_views=%d)",
            len(videos),
            handle,
            videos[0]["views"] if videos else 0,
        )

        return videos

    except subprocess.TimeoutExpired:
        logger.error("yt-dlp timed out for %s", handle)
        return []
    except FileNotFoundError:
        logger.error("yt-dlp not found -- install with: pip install yt-dlp")
        return []
    except Exception as e:
        logger.error("Error fetching videos from %s: %s", handle, e, exc_info=True)
        return []


def download_video(
    video_url: str,
    output_path: Path,
    max_retries: int = 3,
) -> bool:
    """
    Download a YouTube video using yt-dlp.

    Args:
        video_url: YouTube video URL
        output_path: Path for output file
        max_retries: Maximum download attempts

    Returns:
        True if download successful
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                [
                    "yt-dlp",
                    "-o", str(output_path),
                    "--quiet",
                    "--no-warnings",
                    "-f", "bestaudio[ext=m4a]/bestaudio/best",
                    video_url,
                ],
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode == 0 and output_path.exists():
                logger.info(
                    "Downloaded video to %s (file_size=%d)",
                    output_path,
                    output_path.stat().st_size,
                )
                return True

            logger.warning(
                "Download attempt %d failed: %s",
                attempt + 1,
                result.stderr[:200] if result.stderr else "(no stderr)",
            )

        except subprocess.TimeoutExpired:
            logger.warning("Download timeout (attempt %d)", attempt + 1)
        except Exception as e:
            logger.warning("Download error (attempt %d): %s", attempt + 1, e)

        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)

    logger.error("All download attempts failed for %s", video_url)
    return False


def save_channel_data(
    handle: str,
    videos: List[Dict],
    data_dir: Optional[Path] = None,
    config: Optional[PipelineConfig] = None,
) -> None:
    """Save scraped video data to the competitor's data directory.

    Args:
        handle: YouTube handle
        videos: List of video dicts
        data_dir: Explicit data directory (takes precedence)
        config: PipelineConfig to derive data_dir from
    """
    if data_dir is None and config is not None:
        data_dir = config.data_dir / "recon"
    if data_dir is None:
        raise ValueError("Either data_dir or config must be provided")

    handle_clean = handle.lstrip("@")
    competitor_dir = data_dir / "competitors" / handle_clean
    competitor_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "handle": handle,
        "platform": "youtube",
        "scraped_at": datetime.utcnow().isoformat(),
        "total_videos": len(videos),
        "videos": videos,
    }

    videos_file = competitor_dir / "videos.json"
    with open(videos_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info("Saved %d videos for %s to %s", len(videos), handle, videos_file)
