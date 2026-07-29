from __future__ import annotations

from app.documents.service import _eligible_extraction_model


def test_uses_only_the_configured_lightweight_model() -> None:
    assert (
        _eligible_extraction_model(
            "qwen2.5:1.5b",
            ["qwen3:4b", "qwen2.5:1.5b", "gemma4:latest"],
        )
        == "qwen2.5:1.5b"
    )


def test_does_not_silently_substitute_a_larger_installed_model() -> None:
    assert _eligible_extraction_model("qwen2.5:1.5b", ["qwen3:4b"]) is None


def test_model_tags_are_compared_case_insensitively() -> None:
    assert (
        _eligible_extraction_model("QWEN2.5:1.5B", ["qwen2.5:1.5b"])
        == "qwen2.5:1.5b"
    )
