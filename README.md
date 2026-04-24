# 🤖 Chatbot Widget — SaaS Monorepo

Platform SaaS untuk membuat, mengelola, dan meng-embed chatbot AI ke website manapun. Dibangun sebagai monorepo menggunakan **Turborepo + pnpm** dengan arsitektur modular yang memisahkan dashboard admin, widget chat, dan embed script.

---

## Tech Stack

| Layer                    | Teknologi                                                       |
| ------------------------ | --------------------------------------------------------------- |
| **Monorepo**             | Turborepo, pnpm Workspaces                                      |
| **Dashboard (web)**      | Next.js 16, React 19, Tailwind CSS 4, Shadcn UI, Recharts       |
| **Widget (widget)**      | Next.js 16, React 19, Tailwind CSS 4, Shadcn UI, react-markdown |
| **Embed Script (embed)** | Vite (IIFE build), TypeScript                                   |
| **Backend**              | Convex (realtime database, serverless functions)                |
| **Auth**                 | Clerk (OAuth, JWT)                                              |
| **AI / LLM**             | Groq (Llama 3.3 70B), DeepSeek R1 via DigitalOcean              |
| **RAG**                  | Google Gemini Embedding → Convex Vector Search                  |

---

## Struktur Folder

```
shadcn-monorepo/
├── apps/
│   ├── web/              # Dashboard admin (Next.js, port 3000)
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page + auth gate
│   │   │   ├── sign-in/              # Halaman login Clerk
│   │   │   ├── sign-up/              # Halaman register Clerk
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Overview + pie charts
│   │   │       └── chatbots/
│   │   │           ├── page.tsx       # Daftar semua chatbot
│   │   │           ├── new/           # Form buat chatbot baru
│   │   │           └── [id]/
│   │   │               ├── settings/      # Pengaturan chatbot
│   │   │               ├── embed/         # Kode embed & preview
│   │   │               ├── conversations/ # Riwayat percakapan
│   │   │               ├── knowledge/     # Knowledge base (RAG)
│   │   │               └── rate-limit/    # Monitor rate limit
│   │   └── components/       # Sidebar, shell, theme provider
│   │
│   ├── widget/           # Chat UI yang di-embed via iframe (Next.js, port 3001)
│   │   ├── app/page.tsx       # Interface chat utama
│   │   ├── components/        # Chat header, message list, input, modals
│   │   ├── hooks/             # Custom hooks (conversation init, chat actions, dll)
│   │   └── public/widget.js   # Build output dari embed (auto-copy)
│   │
│   └── embed/            # Script embed ringan (Vite → IIFE)
│       ├── src/index.ts       # Inject floating button + iframe ke halaman klien
│       └── vite.config.ts     # Build config + auto-copy ke widget/public
│
├── packages/
│   ├── backend/          # Convex backend (serverless functions + schema)
│   │   └── convex/
│   │       ├── schema.ts          # Database schema
│   │       ├── chatbots.ts        # CRUD chatbot + dashboard stats
│   │       ├── conversations.ts   # Manajemen sesi + domain validation
│   │       ├── messages.ts        # Kirim pesan + AI response + rate limit
│   │       ├── knowledge.ts       # Web scraper + RAG pipeline
│   │       ├── knowledgeData.ts   # Vector search helpers
│   │       ├── rateLimit.ts       # Rate limit management
│   │       └── users.ts          # User management via Clerk webhook
│   │
│   ├── ui/               # Shared component library (Shadcn UI)
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
│
├── package.json          # Root workspace scripts
├── pnpm-workspace.yaml   # Workspace definition
└── turbo.json            # Turborepo pipeline config
```

---

## Fitur Utama

- **Multi-chatbot** — Buat dan kelola banyak chatbot dalam satu akun
- **Embeddable Widget** — Satu baris `<script>` untuk embed ke website manapun
- **Dual AI Model** — Pilih antara Groq (Llama 3.3) atau DeepSeek R1
- **RAG Knowledge Base** — Scrape halaman web, hasilkan embedding, jawab berdasarkan pengetahuan
- **Domain Restriction** — Batasi chatbot hanya bisa diakses dari domain tertentu
- **Rate Limiting** — Batas 50 pesan per sesi per jam
- **Visitor Analytics** — Kumpulkan metadata pengunjung (browser, platform, timezone, dll)
- **Dashboard Charts** — Visualisasi statistik balasan AI dan sesi chat per chatbot
- **Draggable Widget** — Tombol chat bisa di-drag ke posisi manapun di layar
- **Dark Mode** — Tema gelap/terang pada dashboard

---

## Cara Menjalankan

### Prasyarat

- **Node.js** ≥ 20
- **pnpm** ≥ 9.x (`npm install -g pnpm`)
- Akun [Clerk](https://clerk.com) (autentikasi)
- Akun [Convex](https://convex.dev) (database & backend)
- API Key [Groq](https://console.groq.com) atau [DigitalOcean GenAI](https://cloud.digitalocean.com) (LLM)
- _(Opsional)_ API Key [Google Gemini](https://aistudio.google.com) (RAG embedding)

### 1. Clone Repository

```bash
git clone <repository-url>
cd <root-folder>
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Clerk

1. Buat project di [Clerk Dashboard](https://dashboard.clerk.com)
2. Salin **Publishable Key** dan **Secret Key**
3. Setup Convex JWT integration:
   - Di Clerk Dashboard → **JWT Templates** → Buat template baru untuk Convex
   - Di Convex Dashboard → **Settings** → **Authentication** → Tambahkan Clerk sebagai provider

### 4. Setup Convex

1. Login ke Convex:
   ```bash
   cd packages/backend
   npx convex login
   ```
2. Inisialisasi project Convex (jika belum):
   ```bash
   npx convex init
   ```
3. Set environment variables di [Convex Dashboard](https://dashboard.convex.dev) → **Settings** → **Environment Variables**:
   ```
   GROQ_API_KEY=<your-groq-api-key>
   DIGITAL_OCEAN_API_KEY=<your-digitalocean-api-key>     # opsional, untuk DeepSeek
   GEMINI_API_KEY=<your-gemini-api-key>                  # opsional, untuk RAG
   ```

### 5. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env.local` di setiap app:

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
NEXT_PUBLIC_EMBED_URL=http://localhost:3001
```

**`apps/widget/.env.local`**

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
```

**`apps/embed/.env`**

```env
WIDGET_URL=http://localhost:3001
```

### 6. Jalankan Semua Service

Dari root directory, jalankan semua service secara bersamaan:

```bash
pnpm dev
```

Ini akan menjalankan:

| Service       | URL                     | Keterangan              |
| ------------- | ----------------------- | ----------------------- |
| **Dashboard** | `http://localhost:3000` | Admin panel             |
| **Widget**    | `http://localhost:3001` | Chat UI (iframe)        |
| **Convex**    | _(otomatis)_            | Backend dev server      |
| **embed**     | /dist/widget.js         | Script hasil build vite |

Saat `pnpm dev` berjalan, embed script juga otomatis di-build dan hasil `widget.js`
langsung di-copy ke `apps/widget/public/widget.js`agar bisa diakses.

---

## Cara Embed ke Website

Setelah membuat chatbot di dashboard, salin kode embed dari halaman **Embed** chatbot, lalu tambahkan ke HTML website target:

```html
<script
  type="module"
  crossorigin="anonymous"
  src="https://<your-widget-url>/widget.js"
  data-api-key="<your-chatbot-api-key>"
></script>
```

---

## Arsitektur

```
┌─ Website Klien ────────────────┐
│                                │
│  <script> embed/widget.js      │──── inject ──── ┐
│                                │                  │
└────────────────────────────────┘                  │
                                                    ▼
                                          ┌──── iframe ────┐
                                          │  Widget App    │
                                          │  (Next.js)     │
                                          │  localhost:3001 │
                                          └───────┬────────┘
                                                  │ Convex SDK
                                                  ▼
                                          ┌──── Convex ────┐
          ┌──── Dashboard ────┐           │  - Schema      │
          │  Admin Panel      │──────────▶│  - Functions   │
          │  (Next.js)        │  Convex   │  - Vector DB   │
          │  localhost:3000   │  SDK      └───────┬────────┘
          └───────────────────┘                   │
                     │                            ▼
                     │                   ┌──── AI APIs ────┐
                     ▼                   │  Groq / DeepSeek│
                  ┌─ Clerk ─┐            │  Gemini (RAG)   │
                  │  Auth   │            └─────────────────┘
                  └─────────┘
```

---

## Scripts

Semua script dijalankan dari root directory:

| Command       | Keterangan                                    |
| ------------- | --------------------------------------------- |
| `pnpm dev`    | Jalankan semua service dalam mode development |
| `pnpm build`  | Build semua apps & packages                   |
| `pnpm lint`   | Jalankan linter di semua workspace            |
| `pnpm format` | Format kode dengan Prettier                   |

---

## License

Private — Hak cipta dilindungi.
