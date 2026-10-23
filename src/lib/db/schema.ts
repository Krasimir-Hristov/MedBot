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

// Zod Schemas for Validation
export const insertMedicalDocumentSchema = createInsertSchema(medicalDocuments);
export const selectMedicalDocumentSchema = createSelectSchema(medicalDocuments);

export const insertDoctorNoteSchema = createInsertSchema(doctorNotes);
export const selectDoctorNoteSchema = createSelectSchema(doctorNotes);

export type MedicalDocument = typeof medicalDocuments.$inferSelect;
export type NewMedicalDocument = typeof medicalDocuments.$inferInsert;
export type DoctorNote = typeof doctorNotes.$inferSelect;
export type NewDoctorNote = typeof doctorNotes.$inferInsert;
