from app.documents.ai_extractor import validate_extracted_facts
from app.models.profile_extraction import ExtractedProfileFact
from app.models.parsed_document import ParsedDocument, ParsedElement, ParsedPage


def main() -> None:
    document = ParsedDocument(
        document_id="document-1",
        parser="docling",
        parser_version="test",
        pages=[ParsedPage(number=1)],
        elements=[
            ParsedElement(id="name", element_type="text", text="Amit Agrawal", page_number=1, reading_order=0),
            ParsedElement(id="role", element_type="text", text="Staff Engineer, 13+ years", page_number=1, reading_order=1),
        ],
    )
    facts = validate_extracted_facts(document, [
        ExtractedProfileFact(category="identity", key="full_name", value="Amit Agrawal", confidence=0.99, element_ids=["name"]),
        ExtractedProfileFact(category="experience", key="experience_1", value="Staff Engineer with 13+ years of experience", confidence=0.95, element_ids=["role"]),
        ExtractedProfileFact(category="skills", key="invented", value="COBOL", confidence=0.2, element_ids=["missing"]),
    ])
    assert [fact.key for fact in facts] == ["full_name", "experience_1"]
    assert facts[1].page_number == 1
    assert facts[1].element_ids == ["role"]
    print("Validated evidence-grounded profile extraction contract")


if __name__ == "__main__":
    main()
