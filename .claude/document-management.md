Document Storage & Structure:

All documents are stored on SAN storage (network file system).
Maintain a case-based hierarchy: documents belong to a Case and optionally to a Stage.
Support multiple business services: Insured Registration, Salary Update (single/bulk), Contribution, Outstanding Contribution, End-of-Service, etc.
Support bulk and single document uploads.
Maintain original filenames for display and download, while internally using unique storage identifiers.
Keep metadata per document: id, case_id, stage_id, original_filename, stored_filename, uploaded_by, uploaded_at, document_type.

Document Operations:

Upload documents per case or per stage.
Retrieve all documents filtered by case, stage, insured, or document type.
Delete or replace documents (with audit trail).
Download documents with original filenames preserved.
Optional: support versioning to keep previous uploads.

UI Requirements:

Documents tab per case showing:
Original filename
Upload timestamp
Uploaded by
Stage (if multi-stage)
Allow preview for supported file types (PDF, images, Excel).
Allow download preserving original filename.
Bulk upload with drag-and-drop support.
Indicate document status (active, replaced, deleted).

Integration with Workflow:

Document actions are part of case_activity timeline.
Each uploaded document can be linked to a note or comment.
For multi-stage cases, documents can be stage-specific or global to case.


Physically store documents by case to reduce fragmentation.
Maintain a metadata database with insured_id so you can query all documents for an insured without needing a separate directory.
This avoids duplication on disk while supporting fast retrieval at both levels.

ilename Strategy
Always use UUID + extension as stored filename:
Example: c4f2a1e8-7b3a-4cde-a8f1-123456789abc.pdf
Store original filename in DB:
original_filename = "SalaryUpdate_March.xlsx"
Optional: include date or type in path for easier maintenance (archival, batch cleanup):
/SAN_ROOT/cases/<case_id>/2026-03/salary_updates/<uuid>.xlsx
3. Metadata Storage

Use a relational database for all metadata; never rely on filesystem names alone. Suggested table structure:

Column	Description
document_id	UUID
case_id	FK to case
stage_id	nullable, FK to stage
insured_id	FK to insured profile
original_filename	User-uploaded name
stored_filename	Physical UUID filename
storage_path	Full SAN path or relative path
document_type	Salary Update, Contribution, etc.
uploaded_by	User ID
uploaded_at	Timestamp
status	active/replaced/deleted
version	Optional, for versioning

Query patterns enabled:

Retrieve by Case: WHERE case_id = ? AND status='active'
Retrieve by Insured: WHERE insured_id = ? AND status='active'
Filter by Stage, Type, or Date
4. Additional Best Practices
   Avoid large single folders
   If >10,000 files expected, split folders by case or month.
   Use symbolic links sparingly
   For “insured-level view,” consider DB query + application-level aggregation instead of duplicating files.
   Backup & archival
   Keep a logical structure for incremental backups.
   Access control
   Permissions at the folder level for Case or Stage can prevent unauthorized access.
   Logging & audit
   Maintain an audit trail for all CRUD operations on documents.

✅ Recommended Approach for Your Use Case:

Physically: case-centric directory hierarchy with optional stage subfolders
Log insured_id in DB for fast cross-case retrieval
Store UUID filenames on SAN and keep metadata in DB
Optional versioning can live as subfolders per document or separate rows in DB
