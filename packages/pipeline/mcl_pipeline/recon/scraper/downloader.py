"""Video downloader and transcriber.

Ported from GVB recon/scraper/downloader.py with hardcoded paths removed.
Supports OpenAI Whisper API (default) and local Whisper (fallback).
"""
from __future__ import annotations

import logging
import os
import threading
import time
from pathlib import Path
from typing import Optional, Callable

import requests

from mcl_pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)

# Optional: local Whisper
try:
    import whisper  # type: ignore[import-untyped]

    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


def transcribe_video_openai(
    video_path: str,
    api_key: str,
    output_path: Optional[str] = None,
    max_retries: int = 3,
) -> Optional[str]:
    """
    Transcribe video using OpenAI Whisper API.

    Args:
        video_path: Path to the video/audio file
        api_key: OpenAI API key
        output_path: Optional path to save transcript text
        max_retries: Max retry attempts

    Returns:
        Transcript text, or None on failure
    """
    video_name = os.path.basename(str(video_path))
    url = "https://api.openai.com/v1/audio/transcriptions"

    logger.debug("Starting OpenAI transcription: %s", video_name)

    for attempt in range(max_retries):
        try:
            with open(video_path, "rb") as audio_file:
                files = {
                    "file": (os.path.basename(video_path), audio_file, "video/mp4")
                }
                data = {
                    "model": "whisper-1",
                    "language": "en",
                    "response_format": "text",
                }
                headers = {"Authorization": f"Bearer {api_key}"}

                response = requests.post(
                    url, headers=headers, files=files, data=data, timeout=300
                )

                if response.status_code == 200:
                    transcript = response.text.strip()
                    logger.info(
                        "OpenAI transcription complete: %s (length=%d, attempts=%d)",
                        video_name,
                        len(transcript),
                        attempt + 1,
                    )
                    if output_path and transcript:
                        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                        with open(output_path, "w", encoding="utf-8") as f:
                            f.write(transcript)
                    return transcript

                elif response.status_code == 429:
                    logger.warning(
                        "Rate limited for %s, waiting...", video_name
                    )
                    time.sleep(5 * (attempt + 1))
                elif response.status_code >= 500:
                    logger.warning("Server error %d", response.status_code)
                    time.sleep(2**attempt)
                else:
                    logger.error(
                        "API error for %s: status=%d response=%s",
                        video_name,
                        response.status_code,
                        response.text[:200] if response.text else None,
                    )
                    return None

        except requests.exceptions.Timeout:
            logger.warning(
                "Timeout for %s (attempt %d)", video_name, attempt + 1
            )
            if attempt < max_retries - 1:
                time.sleep(2**attempt)
        except Exception as e:
            logger.error(
                "Exception for %s: %s", video_name, e, exc_info=True
            )
            if attempt < max_retries - 1:
                time.sleep(2)

    logger.error("Failed after %d attempts: %s", max_retries, video_name)
    return None


def transcribe_video_local(
    video_path: str,
    model: object,
    output_path: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
    video_index: Optional[int] = None,
    total_videos: Optional[int] = None,
) -> Optional[str]:
    """
    Transcribe video using local Whisper model with heartbeat updates.

    Args:
        video_path: Path to the video/audio file
        model: Loaded Whisper model
        output_path: Optional path to save transcript text
        progress_callback: Optional progress callback
        video_index: Current video index (for progress)
        total_videos: Total videos (for progress)

    Returns:
        Transcript text, or None on failure
    """
    video_name = os.path.basename(str(video_path))
    logger.debug("Starting local transcription: %s", video_name)

    stop_heartbeat = threading.Event()
    start_time = time.time()

    def heartbeat() -> None:
        tick = 0
        while not stop_heartbeat.is_set():
            stop_heartbeat.wait(5)
            if not stop_heartbeat.is_set():
                tick += 1
                elapsed = int(time.time() - start_time)
                prefix = (
                    f"{video_index}/{total_videos}"
                    if video_index and total_videos
                    else ""
                )
                if progress_callback:
                    progress_callback(
                        f"Transcribing {prefix} - {elapsed}s elapsed..."
                    )

    heartbeat_thread = None
    if progress_callback:
        heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
        heartbeat_thread.start()

    try:
        result = model.transcribe(str(video_path), language="en")  # type: ignore[attr-defined]
        transcript = result["text"].strip()

        if output_path and transcript:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(transcript)

        elapsed = int(time.time() - start_time)
        logger.info(
            "Local transcription complete: %s (length=%d, elapsed=%ds)",
            video_name,
            len(transcript) if transcript else 0,
            elapsed,
        )
        return transcript

    except Exception as e:
        logger.error(
            "Local transcription failed: %s: %s", video_name, e, exc_info=True
        )
        return None
    finally:
        stop_heartbeat.set()
        if heartbeat_thread:
            heartbeat_thread.join(timeout=1)


def load_whisper_model(
    model_name: str = "small.en",
    max_retries: int = 3,
) -> Optional[object]:
    """Load local Whisper model with retry logic."""
    if not WHISPER_AVAILABLE:
        logger.warning(
            "whisper not available -- install with: pip install openai-whisper"
        )
        return None

    import torch  # type: ignore[import-untyped]  # noqa: F401

    device = "cpu"
    cache_dir = str(Path.home() / ".cache" / "whisper")

    logger.info(
        "Loading model '%s' (cache_dir=%s, device=%s)",
        model_name,
        cache_dir,
        device,
    )

    for attempt in range(max_retries):
        try:
            loaded = whisper.load_model(
                model_name, device=device, download_root=cache_dir
            )
            if loaded is not None:
                logger.info("Model '%s' loaded successfully", model_name)
                return loaded
        except Exception as e:
            logger.warning(
                "Load attempt %d failed: %s", attempt + 1, str(e)[:200]
            )
            if attempt < max_retries - 1:
                time.sleep(1)

    logger.error("All %d attempts to load model failed", max_retries)
    return None


def download_direct(
    url: str,
    output_path: Path,
    max_retries: int = 3,
) -> bool:
    """Download a file directly from URL with retries."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(max_retries):
        try:
            resp = requests.get(url, stream=True, timeout=120)
            if resp.status_code == 200:
                with open(output_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                if output_path.exists() and output_path.stat().st_size > 0:
                    logger.info(
                        "Direct download successful (file_size=%d)",
                        output_path.stat().st_size,
                    )
                    return True
        except requests.exceptions.Timeout:
            logger.warning("Timeout (attempt %d)", attempt + 1)
        except Exception as e:
            logger.warning("Error (attempt %d): %s", attempt + 1, e)

        if attempt < max_retries - 1:
            time.sleep(2**attempt)

    return False


def download_and_transcribe(
    url: str,
    config: Optional[PipelineConfig] = None,
    data_dir: Optional[Path] = None,
    progress_callback: Optional[Callable] = None,
) -> str:
    """Download video and transcribe using Whisper (OpenAI API or local).

    Args:
        url: Video URL to download
        config: PipelineConfig for paths and API keys
        data_dir: Explicit temp/output directory (overrides config)
        progress_callback: Optional progress callback

    Returns:
        Transcript text, or empty string on failure
    """
    # Resolve directories
    if data_dir is None and config is not None:
        data_dir = config.data_dir / "recon"
    if data_dir is None:
        raise ValueError("Either data_dir or config must be provided")

    temp_dir = data_dir / "temp"
    transcripts_dir = data_dir / "transcripts"
    temp_dir.mkdir(parents=True, exist_ok=True)
    transcripts_dir.mkdir(parents=True, exist_ok=True)

    # Derive filename from URL
    import hashlib

    url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
    audio_path = temp_dir / f"{url_hash}.m4a"
    transcript_path = transcripts_dir / f"{url_hash}.txt"

    # Check for cached transcript
    if transcript_path.exists():
        logger.info("Using cached transcript: %s", transcript_path)
        return transcript_path.read_text(encoding="utf-8")

    # Download audio
    from mcl_pipeline.recon.scraper.youtube import download_video

    if not download_video(url, audio_path):
        # Try direct download as fallback
        if not download_direct(url, audio_path):
            logger.error("Failed to download: %s", url)
            return ""

    # Transcribe -- prefer OpenAI API if key available
    openai_key = None
    if config and config.llm_api_keys:
        openai_key = config.llm_api_keys.get("openai")

    transcript = None
    if openai_key:
        transcript = transcribe_video_openai(
            str(audio_path), openai_key, str(transcript_path)
        )

    if transcript is None and WHISPER_AVAILABLE:
        model = load_whisper_model()
        if model:
            transcript = transcribe_video_local(
                str(audio_path),
                model,
                str(transcript_path),
                progress_callback=progress_callback,
            )

    if transcript is None:
        logger.error("All transcription methods failed for %s", url)
        return ""

    return transcript
