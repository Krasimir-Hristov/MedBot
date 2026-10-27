<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🏥 MedBot RAG – Главен архитектурен наръчник на проекта

## 📌 1. Общо описание на проекта (Project Overview)

**MedBot** е двуезична медицинска RAG платформа (Български 🇧🇬 <-> Гръцки 🇬🇷), създадена специално за обработка, анализ и визуализация на онкологично досие от ~30 документа (епикризи, биопсии, хистологични доклади, образни изследвания и туморни маркери).

### Основни цели:

1. **За лекаря (Гръцки портал `/doctor`):**
   - Двуезичен интерфейс на гръцки език по подразбиране (с превключвател към български).
   - RAG чат асистент с 4 бързи клавиша за онкологична хронология, хистология/стадий, образни изследвания и туморни маркери.
   - Интерактивен преглед на оригиналните сканирани документи със Zoom/Pan.
   - Вграждане на кликаеми цитати към документи във формат `[📄 Заглавие (Дата)](/api/doc/ID)`.
   - Гласово въвеждане на лекарски бележки и въпроси (Web Speech API `el-GR` / Whisper) или писане с клавиатура.
   - Възможност лекарят директно да качва файлове (PDF / снимки) с терапии, предписания за диета, упражнения и нови изследвания. AI автоматично ги анализира, векторизира и превежда на български за пациента.
2. **За пациента и семейството (Български портал `/patient`):**
   - Ултра изчистен Mobile-First интерфейс на български език с едър и лесен за четене шрифт.
   - Последната преведена препоръка и качени терапевтични насоки от гръцкия лекар стоят най-отгоре.
   - Разговорен чатбот с емпатия, обясняващ изследванията и терминологията на разбираем език.
   - Бутон с микрофон за гласово диктуване на въпроси (Web Speech API `bg-BG` / Whisper) за майка ви, както и възможност за писане.
3. **За администратора (`/admin`):**
   - Качване на сканирани изображения (`.jpg`, `.jpeg`, `.jfif`, `.png`, `.webp`) с автоматична компресия в браузъра (до JPEG max 1600px, ~350KB) и PDF документи (до 10 MB в оригинал), конвертирани в Base64.
   - Автоматичен мултимодален анализ (OCR + структуриран JSON), генериране на семантичен вектор и запис в Neon PostgreSQL.

---

## 🛠️ 2. Технологичен стек и конфигурация

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Стилизиране:** Tailwind CSS v4, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`
- **База данни:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) с разширение `pgvector`
- **ORM & Схема:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `zod`)
- **AI доставчик:** OpenRouter (`openai` SDK, `baseURL: "https://openrouter.ai/api/v1"`)
  - **Vision / OCR:** `google/gemini-3.8-flash` (1M токена контекст, безупречен OCR на български медицински бланки и таблици)
    - Заявката подава `reasoning_effort: "low"` и `max_tokens: 16000`. Моделът е reasoning и без ограничение на нивото на мислене латентността при плътен гръцки скан достига ~57s (близо до лимита на маршрута). С `low` времето пада до ~40s без загуба на точност при OCR.
  - **Medical Chat & Reasoning:** `deepseek/deepseek-v4.1-flash` (двуезичен медицински анализ, силно логическо мислене, символична цена)
  - **Embeddings:** `openai/text-embedding-3-small` (1536 измерения в `pgvector`)
    - ⚠️ **КРИТИЧНО:** Контекстният прозорец на модела е **8192 токена**, а не брой символи. Гръцкият текст изразходва ~1.15 токена/знак (10 000 знака ≈ 11 500 токена → грешка 400), кирилицата ~0.55, латиницата ~0.2–0.65. Затова семантичният текст **никога** не се реже по брой символи, а по токен бюджет чрез `buildBilingualSemanticText` (виж `src/features/admin/lib/ai-pipeline.ts`). `createMedicalEmbedding` има и предпазен повторен опит с намален бюджет при грешка за надвишен контекст.
  - **Audio / Диктовка:** Браузърен Web Speech API + `openai/whisper-large-v3`
    - ⚠️ Транскрипцията минава **само** през `/api/v1/audio/transcriptions` (STT endpoint). Същият модел се отхвърля с грешка 400 при `/chat/completions`.

---

## 🧱 3. Структура на базата данни (Drizzle Schema)

- **`medical_documents`**:
  - `id`: serial (primary key) – ползва се за `/api/doc/[id]`
  - `title_bg`: Заглавие на български
  - `title_el`: Заглавие на гръцки
  - `doc_date`: Дата на документа
  - `category`: Категория (Хистология, Образна диагностика, Маркери, Епикризи и др.)
  - `summary_el`: Резюме на гръцки за лекаря
  - `metadata`: JSONB с допълнителни структурирани параметри
  - `extracted_text`: Пълен извлечен текст от OCR
  - `semantic_text`: Двуезичен текст за RAG индекс
  - `embedding`: Вектор `vector(1536)` за косинусно сходство
  - `file_base64`: Base64 кодирано компресирано изображение или PDF документ
  - `mime_type`: Тип на файла (`image/jpeg`, `application/pdf`)
- **`doctor_notes`**:
  - `id`: serial (primary key)
  - `note_el`: Оригинална бележка от лекаря на гръцки
  - `note_bg`: Преведена бележка на български
  - `doctor_name`: Име на лекаря
  - `created_at`: Времева марка
- **`dossier_summaries`**:
  - `id`: serial (primary key)
  - `content_el`: Клинично обобщение на досието на гръцки с кликаеми цитати [📄 ...](/api/doc/ID)
  - `document_ids`: JSONB списък с ID-тата на документите
  - `document_count`: Брой документи
  - `truncated_doc_count`: Брой съкратени документи
  - `model`: Модел за дълъг контекст (1M)
  - `created_at`: Времева марка
- **`patient_guideline_items`**:
  - `id`: serial (primary key)
  - `category`: Категория (diet, exercise, therapy, general)
  - `text_el`: Текст на насоката на гръцки (редактируем от лекаря)
  - `rationale_el`: Клинична обосновка с цитати (само за лекаря)
  - `source`: Източник (ai или doctor)
  - `status`: Статус на одобрение (pending, approved, rejected)
  - `published_at`: Време на публикуване към пациента (в doctor_notes)
  - `created_at` / `updated_at`: Времеви марки

---

## 🛡️ 4. Задължителни инженерни стандарти

1. **No-Middleware Policy:** Без `middleware.ts`. Всички проверки за роли и автентикация се правят на ниво Route Handlers, Server Actions или Proxy.
2. **React компоненти:** Всички компоненти се пишат като **Arrow Functions** (`const Component: React.FC = () => { ... }`). Без използване на `function Component()`.
3. **Strict TypeScript:** Забранено използване на `any`. Винаги стриктни интерфейси или `unknown` с Type Guards.
4. **Error Handling:** Задължителни `try/catch` блокове за всички асинхронни операции и API маршрути.
5. **Mobile-First & Responsive:** Адаптивност за мобилни телефони и десктоп Split-Screen.
6. **Token Budget, не брой символи:** Всеки вход към AI модел с ограничен контекст (embeddings, chat) се ограничава по **токени**, а не по `String.slice(0, N)`. Символите не са мярка за токени — гръцкият текст е ~1.15 токена/знак, кирилицата ~0.55, латиницата ~0.2–0.65. Използвай `estimateTokens` и `truncateToTokenBudget` от `src/features/admin/lib/ai-pipeline.ts`.
7. **Никога не губи структурирани данни при съкращаване:** При съкращаване на дълъг текст клиничната глава (заглавие, маркери, стадий, резюме) се пази изцяло; съкращава се само `extracted_text`, като се пазят едновременно началото и краят му.

---

## 📍 5. Какво правим в момента (Текущ статус)

- [x] **Инициализация:** Инсталиран пълен тек стек (Next.js 16, Tailwind v4, Drizzle, Neon, OpenRouter, Zod).
- [x] **База данни:** Свързан Neon PostgreSQL, активиран `pgvector`, приложена Drizzle схема с `medical_documents` и `doctor_notes`.
- [x] **AI & Конфигурация:** Създаден единствен [.env](file:///d:/myProjects/medbot/.env) с актуалните най-мощни и икономични модели, създаден OpenRouter клиент [src/lib/openrouter.ts](file:///d:/myProjects/medbot/src/lib/openrouter.ts).
- [x] **СТЪПКА 1 (Завършена):**
  - Начален екран `/` с форма за ПИН код, `jose` JWT криптирана сесия и пренасочване към `/admin`, `/doctor`, `/patient`.
  - Next.js 16 `src/proxy.ts` за филтриране на заглавни части (Header scrubbing за CVE-2025-29927) и защита на защитените маршрути.
  - DAL слой и маршрут `src/app/api/doc/[id]/route.ts` за директно отваряне на сканираните документи с двоен слой защита.
- [x] **СТЪПКА 2 (Завършена):** Админ дашборд `/admin` за компресия, OCR анализ и запис на документи.
- [x] **СТЪПКА 3 (Завършена):** Докторски портал `/doctor` (Split-Screen / Drawer, хибриден RAG чат с линкове към документи, сесии, гласова диктовка и качване на нови файлове).
- [ ] **СТЪПКА 4:** Пациентски портал `/patient` и лекарски бележки.
