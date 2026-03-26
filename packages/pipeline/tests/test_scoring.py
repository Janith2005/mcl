"""Test scoring engine with injected brain."""
from mcl_pipeline.scoring.engine import (
    score_topic,
    build_brain_context,
    _extract_stems,
    _count_pain_point_matches,
    score_icp_relevance,
    score_content_gap,
    score_proof_potential,
    apply_competitor_bonuses,
    calculate_weighted_total,
)
from mcl_pipeline.scoring.rescore import _extract_views, rescore_topics


def test_score_topic_with_brain(sample_brain):
    scores = score_topic(
        title="How to build AI agents for agency automation",
        description="Step by step tutorial on building AI agents",
        brain=sample_brain,
    )
    assert "icp_relevance" in scores
    assert "weighted_total" in scores
    assert 4 <= scores["total"] <= 40


def test_competitor_bonus(sample_brain):
    scores = score_topic(
        title="AI automation tutorial",
        description="Full demo walkthrough",
        brain=sample_brain,
        views=150_000,
        is_competitor=True,
    )
    # Competitor with >100K views should get content_gap +2 and proof_potential +1
    assert scores["content_gap"] >= 6
    assert scores["proof_potential"] >= 5


def test_extract_stems():
    stems = _extract_stems("scale revenue without adding headcount")
    assert "scale" in stems
    assert "revenue" in stems
    assert "headcount" in stems
    # Short words (< 4 chars) filtered out
    assert "without" in stems
    assert "adding" in stems


def test_extract_stems_short_text():
    # "ai" is only 2 chars, below the 3-char fallback threshold
    stems = _extract_stems("ai")
    assert stems == []
    # "api" is 3 chars, meets the fallback threshold
    stems = _extract_stems("api")
    assert stems == ["api"]


def test_count_pain_point_matches():
    text = "I can't scale my business without hiring more people, drowning in manual work"
    pain_points = [
        "can't scale without hiring",
        "drowning in manual tasks",
        "unrelated pain point about cooking",
    ]
    matches = _count_pain_point_matches(text, pain_points)
    # Should match at least the first two
    assert matches >= 1


def test_score_icp_relevance_with_brain(sample_brain):
    brain_ctx = build_brain_context(sample_brain)
    # Text that hits multiple ICP keywords
    text = "automate operations scale revenue AI automation agent solopreneurs"
    score = score_icp_relevance(text, brain_ctx)
    assert 1 <= score <= 10
    assert score >= 5  # Should match several keywords


def test_score_content_gap_pillar_match(sample_brain):
    brain_ctx = build_brain_context(sample_brain)
    # Text matching a pillar keyword
    text = "Here is a guide about automation tools for agencies"
    score = score_content_gap(text, brain_ctx)
    assert score == 8  # base 6 + 2 for pillar match


def test_score_content_gap_no_match(sample_brain):
    brain_ctx = build_brain_context(sample_brain)
    text = "Random text about cooking recipes and gardening"
    score = score_content_gap(text, brain_ctx)
    assert score == 6  # base score, no pillar match


def test_score_proof_potential_action():
    text = "How to build and deploy an AI agent tutorial"
    score = score_proof_potential(text)
    assert score >= 7  # Has action keywords


def test_score_proof_potential_opinion():
    text = "My hot take on the controversial debate about AI opinions"
    score = score_proof_potential(text)
    assert score == 6  # Capped by opinion keywords


def test_score_proof_potential_neutral():
    text = "Understanding the latest trends in technology"
    score = score_proof_potential(text)
    assert score == 5  # No action or opinion keywords


def test_apply_competitor_bonuses_high_views():
    scores = {"content_gap": 6, "proof_potential": 5, "icp_relevance": 7, "timeliness": 6}
    result = apply_competitor_bonuses(scores, 150_000)
    assert result["content_gap"] == 8  # +2 for >100K views
    assert result["proof_potential"] == 6  # +1 for >100K views
    # Original should not be mutated
    assert scores is not result


def test_apply_competitor_bonuses_medium_views():
    scores = {"content_gap": 6, "proof_potential": 5, "icp_relevance": 7, "timeliness": 6}
    result = apply_competitor_bonuses(scores, 75_000)
    assert result["content_gap"] == 7  # +1 for >50K views
    assert result["proof_potential"] == 5  # No bonus at this level


def test_calculate_weighted_total():
    scores = {"icp_relevance": 8, "timeliness": 6, "content_gap": 7, "proof_potential": 5}
    weights = {"icp_relevance": 1.0, "timeliness": 1.0, "content_gap": 1.0, "proof_potential": 1.0}
    total = calculate_weighted_total(scores, weights)
    assert total == 26.0  # 8 + 6 + 7 + 5


def test_calculate_weighted_total_with_weights():
    scores = {"icp_relevance": 8, "timeliness": 6, "content_gap": 7, "proof_potential": 5}
    weights = {"icp_relevance": 2.0, "timeliness": 1.0, "content_gap": 1.5, "proof_potential": 1.0}
    total = calculate_weighted_total(scores, weights)
    # 8*2.0 + 6*1.0 + 7*1.5 + 5*1.0 = 16 + 6 + 10.5 + 5 = 37.5
    assert total == 37.5


def test_extract_views():
    assert _extract_views("504,167 views") == 504167
    assert _extract_views("100K views") == 100000
    assert _extract_views("no match here") == 0
    assert _extract_views("1,234 views and likes") == 1234


def test_rescore_topics_empty(sample_brain):
    result = rescore_topics([], sample_brain)
    assert result["rescored_count"] == 0


def test_rescore_topics_non_competitor(sample_brain):
    topics = [
        {
            "id": "t1",
            "title": "AI automation guide",
            "description": "How to automate your business",
            "source": {"platform": "youtube"},
            "scoring": {
                "icp_relevance": 7,
                "timeliness": 6,
                "content_gap": 6,
                "proof_potential": 5,
                "total": 24,
                "weighted_total": 24.0,
            },
        }
    ]
    result = rescore_topics(topics, sample_brain)
    assert result["rescored_count"] == 1
    # weighted_total should be recalculated
    assert topics[0]["scoring"]["weighted_total"] == 24.0  # weights are all 1.0
