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

-- 6. Create HNSW Cosine Vector Index for fast semantic RAG queries
CREATE INDEX IF NOT EXISTS medical_documents_embedding_hnsw_idx 
ON medical_documents 
USING hnsw (embedding vector_cosine_ops);

-- Index on session_id for fast chat loading
CREATE INDEX IF NOT EXISTS chat_messages_session_idx 
ON chat_messages (session_id);
