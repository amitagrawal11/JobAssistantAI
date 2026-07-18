from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

from app.documents.normalizer import parsed_document_from_docling
from app.documents.parser import ParserResult


class DoclingParser:
    def __init__(self) -> None:
        digital_options = PdfPipelineOptions()
        digital_options.do_ocr = False
        self._digital_converter = DocumentConverter(
            allowed_formats=[InputFormat.PDF, InputFormat.DOCX],
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=digital_options)
            },
        )
        self._ocr_converter: DocumentConverter | None = None
        self.parser_version = _package_version("docling")
        self.model_versions = {
            package: _package_version(package)
            for package in ("docling-core", "docling-ibm-models", "docling-parse")
        }

    def parse(self, path: Path, document_id: str) -> ParserResult:
        conversion = self._digital_converter.convert(path)
        lossless = conversion.document.export_to_dict()
        parsed = parsed_document_from_docling(
            document_id=document_id,
            raw=lossless,
            parser_version=self.parser_version,
            model_versions=self.model_versions,
        )
        if path.suffix.lower() == ".pdf" and _needs_ocr(parsed):
            conversion = self._ocr().convert(path)
            lossless = conversion.document.export_to_dict()
            parsed = parsed_document_from_docling(
                document_id=document_id,
                raw=lossless,
                parser_version=self.parser_version,
                model_versions=self.model_versions,
            )
            parsed.provenance["ocr_retry"] = True
        else:
            parsed.provenance["ocr_retry"] = False
        return ParserResult(parsed_document=parsed, lossless=lossless)

    def _ocr(self) -> DocumentConverter:
        if self._ocr_converter is None:
            options = PdfPipelineOptions()
            options.do_ocr = True
            options.ocr_options.force_full_page_ocr = True
            self._ocr_converter = DocumentConverter(
                allowed_formats=[InputFormat.PDF],
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=options)
                },
            )
        return self._ocr_converter


def _needs_ocr(parsed) -> bool:
    meaningful_text = " ".join(
        element.text.strip() for element in parsed.elements if element.text.strip()
    )
    return len(meaningful_text) < 40


def _package_version(package: str) -> str:
    try:
        return version(package)
    except PackageNotFoundError:
        return "unknown"
