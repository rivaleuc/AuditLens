"""Unit tests for the AuditLens GenLayer contract path.

Exercises the real `_normalize` (deterministic findings + risk score) and the
validator invariant (risk_score must equal the weighted sum of agreed findings,
capped at 100). These are the checks the on-chain `validator_fn` enforces so
heterogeneous validators converge on a stable signal.
"""
import json
import audit_lens
from audit_lens import AuditLens, SEVERITIES, SEV_WEIGHT


def derive_score(findings):
    return min(100, sum(SEV_WEIGHT[f["severity"]] for f in findings))


def validator_ok(data: dict) -> bool:
    """Mirror of the on-chain validator_fn body (operating on a parsed dict)."""
    score = data.get("risk_score")
    if not isinstance(score, int) or score < 0 or score > 100:
        return False
    if not isinstance(data.get("summary"), str) or not data["summary"].strip():
        return False
    findings = data.get("findings")
    if not isinstance(findings, list):
        return False
    for f in findings:
        if not isinstance(f, dict):
            return False
        if f.get("severity") not in SEVERITIES:
            return False
        if not isinstance(f.get("title"), str) or not f["title"].strip():
            return False
        if not isinstance(f.get("description"), str) or not f["description"].strip():
            return False
    return score == derive_score(findings)


# ---------- _normalize ----------

def test_clean_code_zero_score():
    out = AuditLens._normalize({"findings": [], "summary": ""})
    assert out["findings"] == []
    assert out["risk_score"] == 0
    assert out["summary"] == "No issues detected."
    assert validator_ok(out)


def test_single_critical_scores_weight():
    out = AuditLens._normalize({
        "findings": [{"severity": "critical", "title": "Reentrancy", "description": "external call before state update"}],
        "summary": "1 issue",
    })
    assert out["risk_score"] == SEV_WEIGHT["critical"] == 40
    assert validator_ok(out)


def test_score_is_capped_at_100():
    findings = [{"severity": "critical", "title": f"c{i}", "description": "x"} for i in range(5)]
    out = AuditLens._normalize({"findings": findings, "summary": "many"})
    assert out["risk_score"] == 100  # 5*40 capped
    assert validator_ok(out)


def test_invalid_severity_dropped():
    out = AuditLens._normalize({
        "findings": [
            {"severity": "apocalyptic", "title": "x", "description": "y"},
            {"severity": "high", "title": "AC", "description": "missing access control"},
        ],
        "summary": "s",
    })
    assert len(out["findings"]) == 1
    assert out["findings"][0]["severity"] == "high"
    assert out["risk_score"] == SEV_WEIGHT["high"]
    assert validator_ok(out)


def test_empty_title_or_description_dropped():
    out = AuditLens._normalize({
        "findings": [
            {"severity": "low", "title": "", "description": "no title"},
            {"severity": "low", "title": "ok", "description": ""},
            {"severity": "low", "title": "valid", "description": "desc"},
        ],
        "summary": "s",
    })
    assert len(out["findings"]) == 1
    assert validator_ok(out)


def test_title_and_description_truncated():
    out = AuditLens._normalize({
        "findings": [{"severity": "medium", "title": "T" * 500, "description": "D" * 2000}],
        "summary": "S" * 1000,
    })
    f = out["findings"][0]
    assert len(f["title"]) <= 120
    assert len(f["description"]) <= 600
    assert len(out["summary"]) <= 240
    assert validator_ok(out)


def test_findings_capped_at_25():
    findings = [{"severity": "info", "title": f"t{i}", "description": "d"} for i in range(60)]
    out = AuditLens._normalize({"findings": findings, "summary": "s"})
    assert len(out["findings"]) <= 25
    assert validator_ok(out)


def test_non_list_findings_raises():
    import pytest
    with pytest.raises(ValueError):
        AuditLens._normalize({"findings": "nope", "summary": "s"})


# ---------- validator rejects tampered output ----------

def test_validator_rejects_wrong_score():
    bad = {"findings": [{"severity": "high", "title": "x", "description": "y"}],
           "risk_score": 1, "summary": "s"}  # should be 25
    assert validator_ok(bad) is False


def test_validator_rejects_out_of_range_score():
    assert validator_ok({"findings": [], "risk_score": 250, "summary": "s"}) is False
    assert validator_ok({"findings": [], "risk_score": -5, "summary": "s"}) is False


def test_validator_rejects_bad_severity():
    bad = {"findings": [{"severity": "boom", "title": "x", "description": "y"}],
           "risk_score": 0, "summary": "s"}
    assert validator_ok(bad) is False


def test_validator_rejects_empty_summary():
    assert validator_ok({"findings": [], "risk_score": 0, "summary": "   "}) is False


def test_normalize_output_always_passes_validator():
    # property: whatever _normalize emits, the validator accepts it
    samples = [
        {"findings": [], "summary": ""},
        {"findings": [{"severity": "critical", "title": "a", "description": "b"}], "summary": "x"},
        {"findings": [{"severity": "low", "title": "a", "description": "b"},
                      {"severity": "medium", "title": "c", "description": "d"}], "summary": "y"},
    ]
    for s in samples:
        assert validator_ok(AuditLens._normalize(s))
