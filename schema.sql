-- ==============================================================================
-- MEDBOT - DATABASE SCHEMA & VECTOR SETUP (NEON POSTGRESQL)
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
  category TEXT NOT NULL DEFAULT 'general',
  title_bg TEXT,
  title_el TEXT,
  note_el TEXT NOT NULL,
  note_bg TEXT NOT NULL,
  doctor_name TEXT DEFAULT 'Д-р Специалист',
  attachment_base64 TEXT,
  attachment_mime TEXT,
  attachment_name TEXT,
  extracted_text TEXT,
  semantic_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions for upgrading existing databases from earlier steps
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS title_bg TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS title_el TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS attachment_base64 TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS attachment_mime TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS semantic_text TEXT;
ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 4. Create chat_sessions table (Doctor & Patient history with rename/delete)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL, -- 'doctor' | 'patient'
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create HNSW Cosine Vector Indexes for fast semantic RAG queries
CREATE INDEX IF NOT EXISTS medical_documents_embedding_hnsw_idx 
ON medical_documents 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS doctor_notes_embedding_hnsw_idx 
ON doctor_notes 
USING hnsw (embedding vector_cosine_ops);

-- Index on session_id for fast chat loading
CREATE INDEX IF NOT EXISTS chat_messages_session_idx 
ON chat_messages (session_id);

-- 7. Row Level Security
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 8. AI Dossier Summary & Patient Guidelines (drafts)
CREATE TABLE IF NOT EXISTS dossier_summaries (
  id SERIAL PRIMARY KEY,
  content_el TEXT NOT NULL,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_count INTEGER NOT NULL,
  truncated_doc_count INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_guideline_items (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL, -- 'diet' | 'exercise' | 'therapy' | 'general'
  text_el TEXT NOT NULL,
  rationale_el TEXT,
  source TEXT NOT NULL DEFAULT 'ai', -- 'ai' | 'doctor'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dossier_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_guideline_items ENABLE ROW LEVEL SECURITY;
