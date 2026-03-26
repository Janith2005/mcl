"""Test Redis-backed transcript cache."""
from unittest.mock import MagicMock
from mcl_pipeline.recon.skeleton_ripper.cache import TranscriptCache, is_valid_transcript


def test_is_valid_transcript():
    assert not is_valid_transcript("")
    assert not is_valid_transcript("too short")
    assert is_valid_transcript("This is a valid transcript with more than ten words in it for testing")


def test_cache_set_get():
    mock_redis = MagicMock()
    mock_redis.get.return_value = "cached transcript text with enough words to be valid"
    cache = TranscriptCache(redis_client=mock_redis)

    cache.set("instagram", "testuser", "abc123", "valid transcript with enough words for test purposes here")
    result = cache.get("instagram", "testuser", "abc123")
    assert result is not None
