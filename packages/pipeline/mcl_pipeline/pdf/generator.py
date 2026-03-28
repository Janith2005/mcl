"""Script PDF generator using ReportLab."""
from __future__ import annotations

import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.platypus import PageBreak

# ── Brand colours ──────────────────────────────────────────────────────────────
BRAND_DARK   = colors.HexColor("#1A1025")   # deep purple-black
BRAND_ACCENT = colors.HexColor("#A666AA")   # influence pirates purple
BRAND_LIGHT  = colors.HexColor("#F5F0FF")   # lavender tint
SECTION_BG   = colors.HexColor("#2A1F3D")   # card background
TEXT_PRIMARY  = colors.HexColor("#EDE8F5")
TEXT_SECONDARY = colors.HexColor("#B8A8D0")
BORDER_COLOR  = colors.HexColor("#3D2E5A")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=TEXT_PRIMARY,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName="Helvetica",
            fontSize=11,
            textColor=TEXT_SECONDARY,
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=BRAND_ACCENT,
            spaceBefore=10,
            spaceAfter=4,
            leftIndent=0,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=9,
            textColor=TEXT_PRIMARY,
            leading=14,
            spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Helvetica",
            fontSize=9,
            textColor=TEXT_PRIMARY,
            leading=13,
            leftIndent=12,
            spaceAfter=2,
        ),
        "card_title": ParagraphStyle(
            "card_title",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=BRAND_ACCENT,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "label",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=TEXT_SECONDARY,
            spaceAfter=1,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Helvetica",
            fontSize=7,
            textColor=TEXT_SECONDARY,
            alignment=TA_CENTER,
        ),
    }


def _header_footer(canvas, doc):
    """Draw dark background + header/footer on every page."""
    canvas.saveState()
    w, h = A4

    # Full-page dark background
    canvas.setFillColor(BRAND_DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Top accent bar
    canvas.setFillColor(BRAND_ACCENT)
    canvas.rect(0, h - 8 * mm, w, 8 * mm, fill=1, stroke=0)

    # Brand label in top bar
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(colors.white)
    canvas.drawString(15 * mm, h - 5.5 * mm, "INFLUENCE PIRATES")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(w - 15 * mm, h - 5.5 * mm, f"Script Export  ·  {datetime.now().strftime('%d %b %Y')}")

    # Bottom footer
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(TEXT_SECONDARY)
    canvas.drawCentredString(w / 2, 8 * mm, f"Page {doc.page}  ·  Influence Pirates — Confidential")

    canvas.restoreState()


def generate_script_pdf(script: dict) -> bytes:
    """
    Generate a branded PDF from a script dict.

    Expected keys: title, platform, status, script_structure, filming_cards,
                   shortform_structure, estimated_duration.

    Returns raw PDF bytes.
    """
    buf = io.BytesIO()
    w, h = A4

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
    )

    st = _styles()
    story = []

    title       = script.get("title") or "Untitled Script"
    platform    = (script.get("platform") or "").replace("_", " ").title()
    status      = (script.get("status") or "draft").upper()
    duration    = script.get("estimated_duration") or ""
    structure   = script.get("script_structure") or {}
    cards       = script.get("filming_cards") or []
    shortform   = script.get("shortform_structure") or {}

    # ── Title block ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(title, st["title"]))

    meta_parts = []
    if platform:    meta_parts.append(platform)
    if status:      meta_parts.append(status)
    if duration:    meta_parts.append(duration)
    story.append(Paragraph("  ·  ".join(meta_parts), st["subtitle"]))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR))
    story.append(Spacer(1, 4 * mm))

    # ── Longform structure ────────────────────────────────────────────────────
    if isinstance(structure, dict) and structure:
        story.append(Paragraph("SCRIPT STRUCTURE", st["section_header"]))

        opening = structure.get("opening_hook") or structure.get("opening") or ""
        if opening:
            story.append(Paragraph("Opening Hook", st["label"]))
            story.append(Paragraph(str(opening), st["body"]))
            story.append(Spacer(1, 2 * mm))

        intro = structure.get("intro") or structure.get("intro_framework") or ""
        if intro:
            story.append(Paragraph("Intro (Proof / Promise / Plan)", st["label"]))
            story.append(Paragraph(str(intro), st["body"]))
            story.append(Spacer(1, 2 * mm))

        sections = structure.get("sections") or []
        if isinstance(sections, list) and sections:
            story.append(Paragraph("Content Sections", st["label"]))
            story.append(Spacer(1, 1 * mm))
            for i, sec in enumerate(sections, 1):
                if not isinstance(sec, dict):
                    continue
                sec_title   = sec.get("title") or f"Section {i}"
                points      = sec.get("talking_points") or []
                proof       = sec.get("proof_element") or ""
                transition  = sec.get("transition") or ""

                block = [Paragraph(f"{i}. {sec_title}", st["card_title"])]
                for pt in (points if isinstance(points, list) else [points]):
                    block.append(Paragraph(f"• {pt}", st["bullet"]))
                if proof:
                    block.append(Paragraph(f"Proof: {proof}", st["body"]))
                if transition:
                    block.append(Paragraph(f"→ {transition}", st["body"]))
                block.append(Spacer(1, 1 * mm))
                story.append(KeepTogether(block))

        mid_cta = structure.get("mid_cta") or ""
        if mid_cta:
            story.append(Paragraph("Mid CTA", st["label"]))
            story.append(Paragraph(str(mid_cta), st["body"]))
            story.append(Spacer(1, 2 * mm))

        closing_cta = structure.get("closing_cta") or structure.get("closing") or ""
        if closing_cta:
            story.append(Paragraph("Closing CTA", st["label"]))
            story.append(Paragraph(str(closing_cta), st["body"]))
            story.append(Spacer(1, 2 * mm))

        outro = structure.get("outro") or ""
        if outro:
            story.append(Paragraph("Outro", st["label"]))
            story.append(Paragraph(str(outro), st["body"]))

    # ── Shortform beats ───────────────────────────────────────────────────────
    if isinstance(shortform, dict) and shortform:
        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
        story.append(Paragraph("SHORTFORM BEAT SHEET", st["section_header"]))

        beats = shortform.get("beats") or []
        if beats:
            table_data = [["#", "Timestamp", "Action", "Visual", "Text Overlay"]]
            for b in beats:
                if not isinstance(b, dict):
                    continue
                table_data.append([
                    str(b.get("beat_number") or b.get("beat", "")),
                    str(b.get("timestamp", "")),
                    str(b.get("action", ""))[:60],
                    str(b.get("visual", ""))[:50],
                    str(b.get("text_overlay", ""))[:40],
                ])

            col_w = [8*mm, 18*mm, 55*mm, 45*mm, 40*mm]
            tbl = Table(table_data, colWidths=col_w)
            tbl.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, 0),  SECTION_BG),
                ("TEXTCOLOR",    (0, 0), (-1, 0),  BRAND_ACCENT),
                ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
                ("FONTSIZE",     (0, 0), (-1, -1), 7.5),
                ("TEXTCOLOR",    (0, 1), (-1, -1), TEXT_PRIMARY),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),   [BRAND_DARK, colors.HexColor("#221535")]),
                ("GRID",         (0, 0), (-1, -1), 0.3, BORDER_COLOR),
                ("TOPPADDING",   (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
                ("LEFTPADDING",  (0, 0), (-1, -1), 4),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 3 * mm))

        caption = shortform.get("caption") or ""
        if caption:
            story.append(Paragraph("Caption", st["label"]))
            story.append(Paragraph(str(caption), st["body"]))

        hashtags = shortform.get("hashtags") or []
        if hashtags:
            story.append(Paragraph("Hashtags", st["label"]))
            story.append(Paragraph("  ".join(f"#{h.lstrip('#')}" for h in hashtags), st["body"]))

    # ── Filming cards ─────────────────────────────────────────────────────────
    if cards:
        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
        story.append(Paragraph("FILMING CARDS", st["section_header"]))

        for card in cards:
            if not isinstance(card, dict):
                continue
            scene   = card.get("scene_number") or card.get("scene", "")
            sec     = card.get("section_name") or card.get("section", "")
            shot    = (card.get("shot_type") or "").replace("_", " ").upper()
            say     = card.get("say") or ""
            show    = card.get("show") or ""
            dur     = card.get("duration") or ""
            notes   = card.get("notes") or ""

            header = f"Scene {scene}" + (f"  ·  {sec}" if sec else "") + (f"  [{shot}]" if shot else "") + (f"  {dur}" if dur else "")
            card_block = [
                Paragraph(header, st["card_title"]),
            ]
            if say:
                card_block.append(Paragraph(f"SAY: {say}", st["body"]))
            if show:
                card_block.append(Paragraph(f"SHOW: {show}", st["body"]))
            if notes:
                card_block.append(Paragraph(f"Notes: {notes}", st["bullet"]))
            card_block.append(Spacer(1, 2 * mm))
            story.append(KeepTogether(card_block))

    # ── Fallback if no structure at all ───────────────────────────────────────
    if not structure and not shortform and not cards:
        story.append(Paragraph("No script content found.", st["body"]))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()
