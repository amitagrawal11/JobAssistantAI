"""Validate Ollama schema normalization without calling a model."""

from __future__ import annotations

from app.ai.ollama_provider import ollama_compatible_schema
from app.models.job import JobAnalystOutput


def main() -> None:
    schema = ollama_compatible_schema(JobAnalystOutput)

    def keys(value):
        if isinstance(value, dict):
            for key, item in value.items():
                yield key
                if key in {"properties", "$defs"} and isinstance(item, dict):
                    for definition in item.values():
                        yield from keys(definition)
                else:
                    yield from keys(item)
        elif isinstance(value, list):
            for item in value:
                yield from keys(item)

    schema_keys = set(keys(schema))

    for unsupported in (
        "title",
        "default",
        "minLength",
        "maxLength",
        "minimum",
        "exclusiveMinimum",
        "minItems",
        "maxItems",
    ):
        assert unsupported not in schema_keys

    requirement = schema["$defs"]["JobRequirementOutput"]
    assert schema["properties"]["title"]["type"] == "string"
    assert requirement["properties"]["category"]["enum"]
    assert schema["properties"]["requirements"]["items"]["$ref"]
    assert schema["required"] == ["title", "requirements"]

    print("Validated Ollama-compatible structured-output schema")


if __name__ == "__main__":
    main()
