<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🏥 MedScan RAG – Главен архитектурен наръчник на проекта

## 📌 1. Общо описание на проекта (Project Overview)
**MedScan RAG** е двуезична медицинска RAG платформа (Български 🇧🇬 <-> Гръцки 🇬🇷), създадена специално за обработка, анализ и визуализация на онкологично досие от ~30 документа (епикризи, биопсии, хистологични доклади, образни изследвания и туморни маркери).

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
   - Качване на сканирани документи с автоматична компресия в браузъра (до JPEG max 1600px, ~350KB) и конвертиране в Base64.
   - Автоматичен мултимодален анализ (OCR + структуриран JSON), генериране на семантичен вектор и запис в Neon PostgreSQL.

---

## 🛠️ 2. Технологичен стек и конфигурация

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Стилизиране:** Tailwind CSS v4, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`
- **База данни:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) с разширение `pgvector`
- **ORM & Схема:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `zod`)
- **AI доставчик:** OpenRouter (`openai` SDK, `baseURL: "https://openrouter.ai/api/v1"`)
  - **Vision / OCR:** `google/gemini-3.8-flash` (1M токена контекст, безупречен OCR на български медицински бланки и таблици)
  - **Medical Chat & Reasoning:** `deepseek/deepseek-v4.1-flash` (двуезичен медицински анализ, силно логическо мислене, символична цена)
  - **Embeddings:** `openai/text-embedding-3-small` (1536 измерения в `pgvector`)
  - **Audio / Диктовка:** Браузърен Web Speech API + `openai/whisper-large-v3`

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
  - `file_base64`: Base64 кодирано компресирано изображение
  - `mime_type`: Тип на файла (`image/jpeg`)
- **`doctor_notes`**:
  - `id`: serial (primary key)
  - `note_el`: Оригинална бележка от лекаря на гръцки
  - `note_bg`: Преведена бележка на български
  - `doctor_name`: Име на лекаря
  - `created_at`: Времева марка

---

## 🛡️ 4. Задължителни инженерни стандарти

1. **No-Middleware Policy:** Без `middleware.ts`. Всички проверки за роли и автентикация се правят на ниво Route Handlers, Server Actions или Proxy.
2. **React компоненти:** Всички компоненти се пишат като **Arrow Functions** (`const Component: React.FC = () => { ... }`). Без използване на `function Component()`.
3. **Strict TypeScript:** Забранено използване на `any`. Винаги стриктни интерфейси или `unknown` с Type Guards.
4. **Error Handling:** Задължителни `try/catch` блокове за всички асинхронни операции и API маршрути.
5. **Mobile-First & Responsive:** Адаптивност за мобилни телефони и десктоп Split-Screen.

---

## 📍 5. Какво правим в момента (Текущ статус)

- [x] **Инициализация:** Инсталиран пълен тек стек (Next.js 16, Tailwind v4, Drizzle, Neon, OpenRouter, Zod).
- [x] **База данни:** Свързан Neon PostgreSQL, активиран `pgvector`, приложена Drizzle схема с `medical_documents` и `doctor_notes`.
- [x] **AI & Конфигурация:** Създаден единствен [.env](file:///d:/myProjects/medbot/.env) с актуалните най-мощни и икономични модели, създаден OpenRouter клиент [src/lib/openrouter.ts](file:///d:/myProjects/medbot/src/lib/openrouter.ts).
- [x] **СТЪПКА 1 (Завършена):**
  - Начален екран `/` с форма за ПИН код, `jose` JWT криптирана сесия и пренасочване към `/admin`, `/doctor`, `/patient`.
  - Next.js 16 `src/proxy.ts` за филтриране на заглавни части (Header scrubbing за CVE-2025-29927) и защита на защитените маршрути.
  - DAL слой и маршрут `src/app/api/doc/[id]/route.ts` за директно отваряне на сканираните документи с двоен слой защита.
- [ ] **СТЪПКА 2:** Админ дашборд `/admin` за компресия, OCR анализ и запис на документи.
- [ ] **СТЪПКА 3:** Докторски портал `/doctor` (Split-Screen / Drawer, RAG чат с линкове към документи).
- [ ] **СТЪПКА 4:** Пациентски портал `/patient` и лекарски бележки.
