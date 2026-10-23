import { pgTable, serial, text, timestamp, jsonb, vector } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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
  noteEl: text("note_el").notNull(),
  noteBg: text("note_bg").notNull(),
  doctorName: text("doctor_name").default("Д-р Специалист"),
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
