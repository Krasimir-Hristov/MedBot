-- ==============================================================================
-- MEDSCAN RAG - DATABASE SCHEMA & VECTOR SETUP (NEON POSTGRESQL)
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create medical_documents table
CREATE TABLE IF NOT EXISTS medical_documents (
  id SERIAL PRIMARY KEY,
  title_bg TEXT NOT NULL,
  title_el TEXT NOT NULL,
  doc_date TEXT NOT NULL,
  category TEXT NOT NULL,
  summary_el TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  extracted_text TEXT NOT NULL,
  semantic_text TEXT,
  embedding vector(1536),
  file_base64 TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create doctor_notes table
CREATE TABLE IF NOT EXISTS doctor_notes (
  id SERIAL PRIMARY KEY,
  note_el TEXT NOT NULL,
  note_bg TEXT NOT NULL,
  doctor_name TEXT DEFAULT 'Д-р Специалист',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create HNSW Cosine Vector Index for fast semantic RAG queries
CREATE INDEX IF NOT EXISTS medical_documents_embedding_hnsw_idx 
ON medical_documents 
USING hnsw (embedding vector_cosine_ops);

-- 5. Row Level Security (RLS) setup
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS med_docs_owner_policy ON medical_documents;
CREATE POLICY med_docs_owner_policy ON medical_documents 
  FOR ALL 
  TO PUBLIC 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS doctor_notes_owner_policy ON doctor_notes;
CREATE POLICY doctor_notes_owner_policy ON doctor_notes 
  FOR ALL 
  TO PUBLIC 
  USING (true) 
  WITH CHECK (true);

