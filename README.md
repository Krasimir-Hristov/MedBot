# 🏥 MedBot — двуезична медицинска RAG платформа

**MedBot** (в интерфейса – *MedScan RAG*) е защитена двуезична платформа (**Български 🇧🇬 ⇄ Гръцки 🇬🇷**) за обработка, анализ и визуализация на онкологично досие от ~30 документа: епикризи, биопсии, хистологични доклади, образни изследвания, лабораторни резултати и туморни маркери.

Проектът обслужва три отделни роли с три отделни портала върху едно и също досие:

| Роля | Портал | Език по подразбиране | Предназначение |
| :--- | :--- | :--- | :--- |
| 👨‍⚕️ Лекар | `/doctor` | Гръцки (`el`) с превключвател към `bg` | Клиничен RAG асистент, пълен преглед на скановете, обобщение на досието, чернови и публикуване на насоки |
| 👩‍🦳 Пациент / семейство | `/patient` | Български (`bg`) | Mobile-First портал с последната препоръка, разбираем чатбот и гласово питане |
| 🛠️ Администратор | `/admin` | Български (`bg`) | Качване, OCR анализ, векторно индексиране и редакция на цялото досие |

---

## ✨ Възможности по роли

### 👨‍⚕️ Лекарски портал (`/doctor`)

- **Desktop Split-Screen с преоразмеряващи се панели** (`PanelSplitter`, двоен клик за reset, клавиатурни стъпки, default 42% / min 25% / max 75%).
- **RAG чат** със стрийминг отговор, история на сесиите (преименуване/изтриване) и задължителни кликаеми цитати `[📄 Заглавие (Дата)](/api/doc/ID)`.
- **7 тематични бързи въпроса** (dropdown), съобразени със становището на д-р Анастасиос Вагионас от 19.10.2026 г. (първична биопсия и HER2 ISH, оперативен протокол и следоперативна хистология, протоколи от химиотерапия, лъчетерапия, образна еволюция, маркери, въпроси за обсъждане).
- **Десен панел с 5 таба:** `Σύνοψη` (обобщение на досието), `Έγγραφο` (Zoom 50–250%, ротация, отваряне в нов таб), `Φάκελος` (каталог с търсене/филтри), `Οδηγίες` (чернови на насоки за пациента), `Σημειώσεις` (лекарски бележки).
- **Обобщение на цялото досие** с 1M-контекстен модел и 8 фиксирани клинични глави, със засичане на остаряване при нови/изтрити документи.
- **Гласова диктовка** на въпроси и бележки (Web Speech API `el-GR` + автоматичен fallback към Whisper).
- **Бързо качване** на нови файлове (PDF / снимки) директно от портала – автоматичен OCR, превод и векторизация.
- **Mobile:** отваряне на документ/обобщение в модален Sheet без напускане на разговора.

### 👩‍🦳 Пациентски портал (`/patient`)

- Mobile-First дизайн с едър, лесен за четене шрифт и висок контраст.
- **Последната преведена препоръка** от лекуващия лекар най-отгоре, плюс категорийни карти `🥗 Хранене`, `🤸 Лечебна гимнастика`, `💊 Терапия`.
- Модален лист за подробен преглед с **директно сваляне на оригиналния прикачен файл** (`/api/notes/[id]/file`).
- **Емпатичен RAG чатбот** със стрийминг, постоянна сесия, „Нов разговор“ и 4 бързи въпроса.
- **Голям микрофонен бутон** за гласово питане (`bg-BG`) – за пациенти, които не пишат удобно на клавиатура.

### 🛠️ Административен панел (`/admin`)

- Качване на изображения (`.jpg`, `.jpeg`, `.jfif`, `.png`, `.webp`) с **компресия в браузъра** (JPEG, max 1600px, ≤ ~350 KB) и на **PDF до 10 MB** без прекомпресия.
- Опашка за качване: до **30 файла**, максимум **2 едновременни** заявки, прогрес и грешки по файл.
- Автоматичен мултимодален анализ (OCR → структуриран JSON → семантичен текст → 1536d вектор → Neon).
- Регистър на досието: търсене в реално време, филтри по 6 категории с броячи, пагинация по 8, експорт на метаданните в JSON.
- Преглед на оригинала (zoom, ротация, пълен OCR текст), редакция на метаданни с **преизчисляване на вектора** и сигурно изтриване с потвърждение.
- **„Копирай линк за лекаря“** – връща URL към `/doctor` + ПИН, само след проверка на админ сесията.

---

## 🛠️ Технологичен стек

| Слой | Технологии |
| :--- | :--- |
| Framework | **Next.js 16.4** (App Router, React 19.3, TypeScript strict), `cacheComponents`, `partialPrefetching`, Turbopack |
| Стилове | **Tailwind CSS v4**, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` |
| База данни | **Neon Serverless PostgreSQL** (`@neondatabase/serverless`) + `pgvector` |
| ORM / валидация | **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `drizzle-zod`) + **Zod v4** |
| AI доставчик | **OpenRouter** през `openai` SDK (`baseURL: https://openrouter.ai/api/v1`) |
| Автентикация | `jose` (HS256 JWT в HttpOnly cookie), HMAC-SHA256 сравнение на ПИН |
| Markdown | `react-markdown`, `remark-gfm` |
| Тестове | **Vitest v4** – 25 файла / 134 теста, пълна изолация от мрежата |
| Качество | ESLint 9 (`eslint-config-next`), CodeRabbit (`.coderabbit.yaml`) |

### AI модели (`src/lib/openrouter.ts`)

| Роля | Модел | ENV override | Забележка |
| :--- | :--- | :--- | :--- |
| Vision / OCR | `google/gemini-3.8-flash` | `VISION_MODEL` | `reasoning_effort: "low"`, `max_tokens: 16000` |
| Chat & reasoning | `deepseek/deepseek-v4.1-flash` | `CHAT_MODEL` | Двуезичен медицински анализ |
| Fast (query expansion) | `deepseek/deepseek-v4.1-flash` | `FAST_MODEL` | Разширяване на RAG заявки |
| Long context | `google/gemini-3.8-flash` | `LONG_CONTEXT_MODEL` | Обобщение на цялото досие (1M) |
| Embeddings | `openai/text-embedding-3-small` | `EMBEDDING_MODEL` | **1536** измерения, контекст **8192** токена |
| Audio (STT) | `openai/whisper-large-v3` | `AUDIO_MODEL` | Само през `/api/v1/audio/transcriptions` |

## 🚀 Стартиране локално

```bash
npm install
# попълнете .env (вижте таблицата по-долу)
npm run dev
```

Отворете [http://localhost:3000](http://localhost:3000) и въведете ПИН код.

### Задължителни променливи на средата

| Променлива | Задължителна | Описание |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ | Neon connection string (pooled) – ползва се от `drizzle-orm/neon-http`. |
| `OPENROUTER_API_KEY` | ✅ | Ключ за OCR, чат, embeddings и Whisper. |
| `SESSION_SECRET` | ✅ | Минимум **32 символа** за подпис на JWT. Няма fallback. |
| `ADMIN_PIN` / `DOCTOR_PIN` / `PATIENT_PIN` | ✅ | ПИН кодовете за трите портала. |
| `NEXT_PUBLIC_APP_URL` | ⭕ | Публичен URL – за `HTTP-Referer` към OpenRouter и за share линка. |
| `OPENROUTER_BASE_URL` | ⭕ | По подразбиране `https://openrouter.ai/api/v1`. |
| `VISION_MODEL`, `CHAT_MODEL`, `FAST_MODEL`, `LONG_CONTEXT_MODEL`, `EMBEDDING_MODEL`, `AUDIO_MODEL` | ⭕ | Смяна на модел без промяна в кода. |
| `DATABASE_URL_UNPOOLED`, `PGHOST*`, `PGUSER`, `PGPASSWORD`, `NEON_*` | ⭕ | Генерирани от Neon CLI, ползват се от `neon` / `drizzle-kit`. |

> ⚠️ `.env` е в `.gitignore`. Никога не комитвайте реални ключове и ПИН кодове.

---

## 📜 Скриптове

| Команда | Предназначение |
| :--- | :--- |
| `npm run dev` | Next.js 16 в режим на разработка (Turbopack). |
| `npm run build` | Production билд. |
| `npm run start` | Стартира production сървъра. |
| `npm run lint` | ESLint проверка. |
| `npm run test` | Всички Vitest тестове еднократно. |
| `npm run test:watch` | Vitest във watch режим. |
| `npx tsc --noEmit` | Пълна статична проверка на типовете. |

---

## 🗂️ Структура на проекта

```
src/
├── proxy.ts                     # Next.js 16 Proxy: header scrubbing (CVE-2025-29927) + RBAC
├── app/
│   ├── page.tsx                 # ПИН вход (Server Action → JWT cookie)
│   ├── admin/page.tsx           # SSR зареждане на досието + AdminDashboard
│   ├── doctor/page.tsx          # SSR паралелно зареждане + DoctorPortalShell
│   ├── patient/page.tsx         # SSR + PatientPortalShell
│   └── api/                     # Route Handlers (вижте docs/api.md)
├── features/
│   ├── admin/                   # Компресия, опашка, AI pipeline (OCR + embedding), регистър
│   ├── auth/                    # ПИН, JWT сесии, role guard, rate limit
│   ├── doctor/                  # Split-screen shell, чат, каталог, RAG engine
│   ├── doctor-notes/            # Лекарски бележки и прикачени предписания
│   ├── documents/               # DAL за medical_documents + token-budget контекст
│   ├── dossier-summary/         # Обобщение на досието (1M контекст) + staleness
│   ├── i18n/                    # BG/EL речник и превключвател (useSyncExternalStore)
│   ├── patient/                 # Пациентски портал и чат
│   ├── patient-guidelines/      # Чернови → преглед → публикуване към пациента
│   ├── rag/                     # Векторно търсене и двуезично разширяване на заявки
│   └── voice/                   # Web Speech API + Whisper fallback
├── lib/                         # db (Drizzle + Neon), openrouter, http-payload, utils
└── test/shims/                  # server-only шим за Vitest
```

Всяка feature е самодостатъчна: `components/`, `hooks/`, `lib/`, `dal.ts`, `schemas.ts`, `types.ts`, `constants.ts`, `actions.ts` и `index.ts` за публичен API.

---

## 📚 Документация

| Документ | Съдържание |
| :--- | :--- |
| [`docs/architecture.md`](docs/architecture.md) | Слоеве, потоци на данни, 4 AI конвейера, token бюджети, сигурност, i18n, инженерни стандарти |
| [`docs/api.md`](docs/api.md) | Пълен справочник на Route Handlers: права, лимити, кодове на отговор |
| [`docs/database.md`](docs/database.md) | Схема на 6-те таблици, HNSW индекси, RLS, egress оптимизация |
| [`docs/testing.md`](docs/testing.md) | Стратегия, каталог на 25 файла / 134 теста, стандарти за нови тестове |
| [`ROADMAP.md`](ROADMAP.md) | Изпълнени фази и следващи стъпки |
| [`AGENTS.md`](AGENTS.md) | Архитектурен наръчник и задължителни правила за AI агенти |
| [`docs/designs/`](docs/designs/) | HTML/PNG референции на трите интерфейса |

---

## 🔐 Сигурност накратко

1. **Без `middleware.ts`** – всичко минава през `src/proxy.ts` и се дублира на ниво Route Handler / Server Action (Defense in Depth).
2. **Header scrubbing** на `x-middleware-subrequest`, `x-middleware-rewrite`, `x-middleware-next` (CVE-2025-29927).
3. **ПИН сравнение с константно време** (HMAC-SHA256 + `timingSafeEqual`), JWT с `exp` и `jti`, HttpOnly + SameSite=Lax + `secure` в production.
4. **RBAC на два слоя** – Proxy (пренасочване / 401 / 403) и `requireRoles()` в самите маршрути.
5. **Ограничено тяло на заявките** – поточно четене с брояч на байтовете (`readBoundedJson`), независимо от `Content-Length`.
6. **Rate limiting по сесия (`jti`)** за всички AI маршрути.
7. **Пациентът никога не вижда сурови сканове** – `/api/doc/*` е само за `doctor` и `admin`; пациентът получава само преведените бележки и техни прикачени файлове.
8. **RLS активиран** на всички таблици + липса на директен достъп от браузъра до базата.

