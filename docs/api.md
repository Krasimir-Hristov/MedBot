# 🔌 API справочник на MedBot

Пълен списък на Route Handlers, Server Actions и изискванията за достъп. Всички маршрути живеят в `src/app/api/**/route.ts` и връщат JSON (освен файловете и стрийминг отговорите).

---

## 1. Общи правила

| Правило | Детайл |
| :--- | :--- |
| **Автентикация** | HttpOnly cookie `medbot_session` (HS256 JWT, `jti`, `exp` 7 дни). |
| **RBAC на два слоя** | `src/proxy.ts` (първи слой) + `requireRoles()` / `verifySessionToken()` в самия handler (втори слой). |
| **Тяло на заявката** | За маршрутите с файлове – поточно четене през `readBoundedJson(request, N)` → `413` при надвишаване. |
| **Валидация** | Zod схеми от `features/<feature>/schemas.ts`; при грешка → `400` + първото съобщение. |
| **Rate limit** | `checkScopedRateLimit(scope, limit, windowMs, identity)`, identity = `jti` на сесията. |
| **Език** | Cookie `medbot_locale` (`bg` / `el`). |
| **Кеширане** | `private, no-store` за бележки/файлове; `private, max-age=86400` само за `/api/doc/[id]`. |

### Кодове на отговор

| Код | Значение |
| :--- | :--- |
| `200` / `201` | Успех / създаден ресурс |
| `400` | Невалиден JSON, неуспешна валидация или невалиден параметър |
| `401` | Липсваща или невалидна сесия |
| `403` | Валидна сесия, но без права за ресурса |
| `404` | Документ / сесия / файл не е намерен (или принадлежи на друга роля) |
| `409` | Конфликт (дублиран файл, промяна след преглед на насоки) |
| `413` | Тяло над допустимия размер |
| `429` | Превишен rate limit |
| `499` | Клиентът прекъсна заявката (вътрешен код за отменен стрийм) |
| `500` | Неочаквана системна грешка |
| `502` | Невалиден отговор от AI доставчика |

---

## 2. Документи и файлове

### `GET /api/doc/[id]` — оригинален сканиран документ

| | |
| :--- | :--- |
| Права | `admin`, `doctor` (пациентът получава `403`) |
| Параметър | `id` – положително цяло число (`400` при невалидно) |
| Отговор | Бинарен файл (`image/jpeg`, `image/png`, `image/webp` или `application/pdf`), `Content-Disposition: inline`, `Cache-Control: private, max-age=86400, stale-while-revalidate=3600` |
| Грешки | `401`, `403`, `400`, `404`, `500` |
| Забележка | Използва се от цитатите `[📄 Заглавие (Дата)](/api/doc/ID)` в чата и от viewer-а. |

### `GET /api/notes/[id]/file` — прикачен файл към лекарска бележка

| | |
| :--- | :--- |
| Права | `admin`, `doctor`, `patient` |
| Отговор | Бинарен PDF/изображение, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` |
| Грешки | `401`, `400`, `404`, `500` |
| Забележка | Пациентът вижда само този файл – не и суровите сканове. |

### `GET /api/doctor/documents` — каталог на досието

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Отговор | `{ documents: DocumentCatalogItem[] }` (без `file_base64` и `embedding`) |

---

## 3. Качване и обработка

### `POST /api/admin/upload` — OCR + векторизация на нов документ

| | |
| :--- | :--- |
| Права | `admin` (`isAdminSession()`) |
| Тяло | `{ fileName: string, fileBase64: string }` (JPEG data URL или PDF data URL) |
| Лимит на тялото | **20 MB** (`UPLOAD_LIMITS.maxRequestBodyBytes`) → `413` |
| Лимити на файла | изображение ≤ 25 MB преди клиентска компресия; PDF ≤ 10 MB; JPEG след компресия ≤ ~350 KB / 1600px |
| `maxDuration` | **120 s** |
| Отговор | `201 { success: true, document }` |
| Грешки | `403`, `413`, `400`, `409` (файл със същото име вече е качен), `502` (`PipelineError`), `500` |
| Pipeline | `extractMedicalDocumentData` → `buildBilingualSemanticText` → `createMedicalEmbedding` → `createMedicalDocument` → `revalidatePath('/admin')` |

### `POST /api/doctor/upload` — качване от лекарския портал

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Тяло | `{ fileBase64, mimeType: 'image/jpeg' \| 'image/png' \| 'image/webp' \| 'application/pdf', fileName?, autoCreatePatientNote? }` |
| Лимит на тялото | **10 MB**; base64 низ ≤ 7 000 000 знака |
| `maxDuration` | **120 s** |
| Отговор | `{ success: true, document, patientNoteCreated, patientNoteId }` |
| Забележка | При `autoCreatePatientNote: true` (по подразбиране) се създава и преведена бележка за пациента. |

### `POST /api/notes/upload` — прикачено предписание към бележка

| | |
| :--- | :--- |
| Права | `doctor`, `admin` (`requireRoles`) |
| Тяло | `UploadPrescriptionPayloadSchema` (base64 + mime + категория + име на лекар) |
| Лимит на тялото | **8 MB** → `413` |
| Отговор | `201 <DoctorNote>` |
| Pipeline | `processPrescriptionFileAI` (Gemini OCR/PDF анализ + превод + embedding) → `createDoctorNote` → `revalidatePath('/doctor')`, `revalidatePath('/patient')` |

---

## 4. Лекарски бележки

### `/api/doctor/notes`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `doctor`, `admin` | Последните 50 бележки: `{ notes }` |
| `POST` | `doctor`, `admin` | Тяло `{ note, category?, doctorName? }` → `processTextNoteAI` + `createDoctorNote` → `201 { note }`; `400` при празен/прекалено дълъг текст |
| `DELETE` | `doctor`, `admin` | `?id=<number>` → `{ success: boolean }`; `400` при невалиден ID |

---

## 5. Чат

### `POST /api/chat/doctor` — RAG чат за лекаря (SSE)

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Тяло | `{ sessionId?: string (≤100), message: string (1–4000), locale?: 'el' \| 'bg' }` |
| Отговор | `text/event-stream`: `data: {"type":"session","sessionId"}` → `data: {"type":"chunk","text"}`* → `data: {"type":"done","citations"}` |
| Грешки | `401`, `400`, `404` (сесия от друга роля/липсваща), `500` |
| Побочни ефекти | Създава сесия при липса на `sessionId`; записват се `user` и `assistant` съобщения с извлечените цитати |

Контекстът към модела включва: пълен каталог на досието, топ 12 векторни попадения с пълни извадки, последните лекарски бележки и последните 6 съобщения от сесията.

### `POST /api/chat/patient` — емпатичен чат за пациента (plain text stream)

| | |
| :--- | :--- |
| Права | `patient`, `admin` |
| Rate limit | **25 / минута** по `jti` |
| Тяло | `{ message, sessionId: uuid, locale }` (`PatientChatRequestSchema`) |
| Отговор | `text/plain; charset=utf-8` стрийминг |
| Грешки | `401`, `403`, `429`, `400`, `404` (чужда/липсваща сесия), `500` |
| Забележка | Ходът се записва (`savePatientChatTurn`) **преди** `controller.close()`. |

---

## 6. Сесии на чата

### `/api/doctor/sessions`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `doctor`, `admin` | `{ sessions }` |
| `POST` | `doctor`, `admin` | `{ title? }` → `201 { session }` (`'Нова консултация'` по подразбиране) |

### `/api/doctor/sessions/[sessionId]`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `doctor`, `admin` | `{ messages }` |
| `PATCH` | `doctor`, `admin` | `{ title: 1–200 }` → `{ session }`; `404` при липсваща сесия на лекар |
| `DELETE` | `doctor`, `admin` | `{ success: boolean }` |

### `/api/patient/sessions`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `patient`, `admin` | `{ sessions }` (само `role = 'patient'`) |
| `POST` | `patient`, `admin` | `{ title? }` → `201 { session }` (`'Нов разговор'`) |

### `/api/patient/sessions/[sessionId]`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `patient`, `admin` | `{ messages }` |
| `PATCH` | `patient`, `admin` | `{ title }` → `{ session }`; `404` при `SessionNotFoundError` |
| `DELETE` | `patient`, `admin` | `{ success: true }`; `404` при `SessionNotFoundError`, `500` при друга грешка |

---

## 7. Обобщение на досието

### `/api/doctor/summary`

| Метод | Права | Описание |
| :--- | :--- | :--- |
| `GET` | `doctor`, `admin` | `DossierSummaryState` = `{ summary, staleness: { newCount, removedCount } }` |
| `POST` | `doctor`, `admin` | Генерира обобщение чрез стрийминг |

**POST детайли:**

| | |
| :--- | :--- |
| Тяло | няма |
| Rate limit | **3 / минута** по `jti` (`dossier-summary`) → `429` |
| `maxDuration` | **300 s** |
| Модел | `LONG_CONTEXT_MODEL`, `max_tokens: 12000`, `temperature: 0.1` |
| Отговор | SSE: `data: {"type":"chunk","text"}`* → `data: {"type":"done","summary"}` или `data: {"type":"error","message"}` |
| Условие за запис | `finish_reason === 'stop'` **и** ≥ 200 знака; иначе само `warn` и `error` събитие |
| Грешки | `401`, `429`, `400` (празно досие), `499` (клиентът прекъсна), `500` |
| Побочни ефекти | `INSERT dossier_summaries` с `document_ids`, `document_count`, `truncated_doc_count`, `model` |

---

## 8. Насоки за пациента (чернови → публикуване)

### `POST /api/doctor/guidelines/generate`

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Rate limit | **5 / минута** (`guidelines-gen`) → `429` |
| `maxDuration` | **120 s** |
| Контекст | Последното обобщение на досието, а при липса – компактният каталог на всички документи + последните 10 бележки |
| Отговор | `{ items: PatientGuidelineItemEntity[] }` (status `pending`) |
| Грешки | `401`, `429`, `502` (невалиден JSON / схема от AI), `500` |
| Побочни ефекти | `replacePendingAiGuidelines()` – заменя **само** `pending` AI точки; одобрените/отхвърлените остават непокътнати |

### `POST /api/doctor/guidelines/preview`

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Rate limit | **10 / минута** (`guidelines-preview`) |
| `maxDuration` | **120 s** |
| Отговор | `{ previewItems: CategoryPreviewItem[] }` – по една група на категория с `titleBg`, `titleEl`, `noteBg`, `noteEl`, `approvedItemIds` |
| Грешки | `401`, `429`, `400` (няма одобрени точки), `502` (неуспешен превод), `500` |

### `POST /api/doctor/guidelines/publish`

| | |
| :--- | :--- |
| Права | `doctor`, `admin` |
| Rate limit | **10 / минута** (`guidelines-publish`) |
| `maxDuration` | **120 s** |
| Тяло | `{ items: CategoryPreviewItem[], doctorName? }` (`PublishGuidelinesSchema`) |
| Проверки | ID-тата са уникални; всяко принадлежи на съответната категория и е `approved`; `noteEl` съвпада точно с `• <text_el>` редовете от базата; няма новоодобрена точка извън payload-а; няма частично публикувана категория |
| Отговор | `{ success: true }` |
| Грешки | `401`, `429`, `400`, `409` (данните са се променили след прегледа → отворете прегледа отново), `500` |
| Побочни ефекти | `INSERT doctor_notes` (превод + embedding) + `markGuidelinesAsPublished()` в транзакция с `FOR UPDATE`; `revalidatePath('/doctor')`, `revalidatePath('/patient')` |

---

## 9. Гласова транскрипция

### `POST /api/transcribe`

| | |
| :--- | :--- |
| Права | Всяка автентикирана роля (`requireAnyAuthenticatedRole`) |
| Rate limit | **20 / минута** по `jti` |
| Тяло | `TranscribeRequestSchema` – `{ audioBase64, mimeType, language }` (`webm`, `mp3`, `wav`, `ogg`, `m4a`, `mp4`; `bg` / `el`) |
| Лимит на тялото | **5 MB** → `413` |
| Отговор | `{ text: string }` |
| Грешки | `401`, `429`, `413`, `400`, `502` (`TranscriptionError`), `500` |
| Забележка | Извиква **само** `/api/v1/audio/transcriptions` (`openai/whisper-large-v3`); същият модел през `/chat/completions` връща `400`. |

---

## 10. Server Actions (без REST маршрут)

| Action | Файл | Права | Описание |
| :--- | :--- | :--- | :--- |
| `loginWithPinAction` | `features/auth/actions.ts` | публична | Валидира ПИН, задава cookie, връща ролята за пренасочване. Rate limit + константно време. |
| `logoutAction` | `features/auth/actions.ts` | всяка | Изтрива сесийната cookie. |
| `getDoctorShareLinkAction` | `features/admin/actions.ts` | `admin` | Връща `URL + PIN` текст за лекаря (ПИН-ът не напуска сървъра без админ сесия). |
| `getDocumentDetailAction` | `features/admin/actions.ts` | `admin` | Пълен детайл на документ (вкл. `extracted_text`) за модалите. |
| `updateDocumentAction` | `features/admin/actions.ts` | `admin` | Обновява метаданни и **преизчислява** `semantic_text` + `embedding`, за да остане RAG индексът точен. |
| `deleteDocumentAction` | `features/admin/actions.ts` | `admin` | Изтрива документ по ID. |
| `addManualGuidelineAction` | `features/patient-guidelines/actions.ts` | `doctor` | Добавя ръчна точка (`source: 'doctor'`). |
| `updateGuidelineAction` | `features/patient-guidelines/actions.ts` | `doctor` | Редакция на текст/статус. |
| `deleteGuidelineAction` | `features/patient-guidelines/actions.ts` | `doctor` | Изтрива чернова. |

Всички Actions връщат дискиминатиран резултат (`{ success: true, data }` или `{ success: false, error }`) и **не** хвърлят вътрешни грешки към клиента.

---

## 11. Примери с `curl`

```bash
# 1. Вход (запазва cookie)
curl -i -c cookies.txt -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" -d '{"pin":"1234"}'

# 2. Каталог на досието (лекар)
curl -s -b cookies.txt http://localhost:3000/api/doctor/documents

# 3. RAG въпрос със стрийминг (SSE)
curl -N -b cookies.txt -X POST http://localhost:3000/api/chat/doctor \
  -H "Content-Type: application/json" \
  -d '{"message":"Δώσε το χρονολόγιο της θεραπείας","locale":"el"}'

# 4. Оригинален сканиран документ
curl -s -b cookies.txt -o doc-12.jpg http://localhost:3000/api/doc/12
```

> ПИН входът минава през Server Action, затова за автоматизирани тестове е по-надеждно да се използва браузър или да се извика съответната страница и да се вземе `medbot_session` cookie от реалния клиент.


