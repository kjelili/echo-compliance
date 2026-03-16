# Echo Compliance Requirements Review

## Source Document
- `Echo Compliance.docx`

## Extracted MVP Requirements
- Foreman can speak or type site updates.
- App converts updates into a structured daily log.
- App supports photo attachments.
- App exports a PDF summary suitable for email sharing.
- App stores logs in searchable history.
- AI assists with summarization, tagging, and formatting.

## Suggested V2 (Not Fully Implemented in MVP)
- Weather import.
- Delay categorization.
- Labor/material usage summaries.
- Risk flag extraction improvements.

## Architecture Choice
- Frontend: React (responsive SPA).
- Backend: Node.js + Express.
- Speech-to-text: browser Web Speech API fallback.
- AI summarization: deterministic NLP rule engine (no key requirement).
- Export: PDF via PDFKit.
- Persistence: JSON storage for rapid MVP delivery.
