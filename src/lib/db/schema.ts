import { pgTable, serial, text, timestamp, jsonb, vector, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const medicalDocuments = pgTable("medical_documents", {
  id: serial("id").primaryKey(),
  titleBg: text("title_bg").notNull(),
  titleEl: text("title_el").notNull(),
  docDate: text("doc_date").notNull(),
  category: text("category").notNull(),
  summaryEl: text("summary_el").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  extractedText: text("extracted_text").notNull(),
  semanticText: text("semantic_text"),
  embedding: vector("embedding", { dimensions: 1536 }),
  fileBase64: text("file_base64").notNull(),
  mimeType: text("mime_type").notNull().default("image/jpeg"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const doctorNotes = pgTable("doctor_notes", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().default("general"), // 'general' | 'therapy' | 'diet' | 'exercise'
  titleBg: text("title_bg"),
  titleEl: text("title_el"),
  noteEl: text("note_el").notNull(),
  noteBg: text("note_bg").notNull(),
  doctorName: text("doctor_name").default("Д-р Специалист"),
  attachmentBase64: text("attachment_base64"),
  attachmentMime: text("attachment_mime"), // 'image/jpeg' | 'application/pdf'
  attachmentName: text("attachment_name"),
  extractedText: text("extracted_text"),
  semanticText: text("semantic_text"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  role: text("role").notNull(), // 'doctor' | 'patient'
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSessions.sessionId, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Array<{ id: number; title: string }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dossierSummaries = pgTable("dossier_summaries", {
  id: serial("id").primaryKey(),
  contentEl: text("content_el").notNull(), // Markdown с цитати
  documentIds: jsonb("document_ids").$type<number[]>().notNull().default([]),
  documentCount: integer("document_count").notNull(),
  truncatedDocCount: integer("truncated_doc_count").notNull().default(0),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const patientGuidelineItems = pgTable("patient_guideline_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // 'diet' | 'exercise' | 'therapy' | 'general'
  textEl: text("text_el").notNull(), // редактируем от лекаря
  rationaleEl: text("rationale_el"), // обяснение с цитати – само за лекаря
  source: text("source").notNull().default("ai"), // 'ai' | 'doctor'
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  sortOrder: integer("sort_order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DossierSummary = typeof dossierSummaries.$inferSelect;
export type PatientGuidelineItem = typeof patientGuidelineItems.$inferSelect;

// Zod Schemas for Validation
export const insertMedicalDocumentSchema = createInsertSchema(medicalDocuments);
export const selectMedicalDocumentSchema = createSelectSchema(medicalDocuments);

export const insertDoctorNoteSchema = createInsertSchema(doctorNotes);
export const selectDoctorNoteSchema = createSelectSchema(doctorNotes);

export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);

export type MedicalDocument = typeof medicalDocuments.$inferSelect;
export type NewMedicalDocument = typeof medicalDocuments.$inferInsert;
export type DoctorNote = typeof doctorNotes.$inferSelect;
export type NewDoctorNote = typeof doctorNotes.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
