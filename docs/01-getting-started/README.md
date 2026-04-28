# Getting Started

Panduan ini untuk menyalakan seluruh monorepo di lokal, termasuk dashboard, widget, embed builder, dan backend Convex.

## 1. Prasyarat

- Node.js >= 20
- pnpm >= 9
- Akun Clerk
- Akun Convex
- API key LLM (minimal Groq)
- Opsional: API key Gemini + Firecrawl untuk fitur RAG

## 2. Install Dependency

Jalankan dari root monorepo:

```bash
pnpm install
```

## 3. Setup Environment

### 3.1 Environment Per App

Gunakan template env di masing-masing app:

```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/widget/.env.local.example apps/widget/.env.local
```

Isi variabel utama berikut:

- `apps/web/.env.local`
  - `NEXT_PUBLIC_CONVEX_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `ALLOWED_EMAILS`
  - `NEXT_PUBLIC_WIDGET_URL`
- `apps/widget/.env.local`
  - `NEXT_PUBLIC_CONVEX_URL`

Catatan `apps/embed`: tidak perlu `WIDGET_URL` di env. Loader embed otomatis mengikuti origin dari URL `widget.js` (dan bisa dioverride dengan atribut `data-widget-url` bila diperlukan).

### 3.2 Root Tooling Environment (Opsional)

Root env dipakai untuk variabel tooling yang dijalankan dari root monorepo.

```bash
cp .env.local.example .env.local
```

Isi variabel berikut bila diperlukan:

- `CONVEX_DEPLOY_KEY` (jika deploy Convex dari root/CI)

### 3.3 Convex Secret Environment

**Catatan penting:** Environment variable untuk backend Convex tidak cukup jika hanya ditulis di file `.env.local` aplikasi. Environment ini harus tersimpan di server Convex agar fungsi query dan mutation bisa mengaksesnya.

Environment variable Convex bisa diatur melalui dua cara:

**A. Melalui Terminal (CLI)**  
Jalankan perintah berikut di dalam direktori project:

```bash
cd packages/backend
npx convex env set GROQ_API_KEY "<value>"
npx convex env set DIGITAL_OCEAN_API_KEY "<value>"
npx convex env set GEMINI_API_KEY "<value>"
npx convex env set FIRECRAWL_API_KEY "<value>"
npx convex env set WEB_ALLOWED_DOMAIN_URL "http://localhost:3000"
npx convex env list
```

**B. Melalui Convex Dashboard (GUI)**  
Jika kamu lebih suka menggunakan tampilan web, kamu bisa mengaturnya secara manual:

1. Buka Convex Dashboard.
2. Pilih project kamu.
3. Di sidebar kiri, buka menu **Settings**.
4. Cari bagian **Environment Variables**.
5. Klik **Add Variable**, lalu masukkan key dan value sesuai daftar di atas.
6. Klik **Save** untuk menyimpan perubahan.

## 4. Setup Convex & Clerk Auth

Agar database backend berjalan dan aplikasi memiliki sistem login (autentikasi), kita perlu menyiapkan **Convex** dan menghubungkannya dengan **Clerk**. Berikut panduannya:

**Langkah 1: Inisialisasi Convex**
Agar project lokal kamu terhubung dengan database Convex, lakukan hal berikut:

1. Buka terminal baru dan jalankan perintah:
   ```bash
   cd packages/backend
   npx convex dev
   ```
2. Kamu akan diarahkan ke browser untuk login atau membuat akun Convex.
3. Ikuti instruksi di terminal untuk menyambungkan ke project Convex (atau buat baru jika belum ada). Proses ini otomatis akan menyinkronkan skema database ke cloud.

**Langkah 2: Setup Clerk**

1. Buat aplikasi baru di [Clerk Dashboard](https://dashboard.clerk.com/).
2. Ambil **Publishable Key** dan **Secret Key** dari menu API Keys.
3. Masukkan key tersebut ke dalam file `.env.local` aplikasi (misal: `apps/web/.env.local`).

**Langkah 3: Hubungkan Clerk ke Convex (OIDC)**

1. Di Clerk Dashboard, buka menu **JWT Templates**, buat template baru dan pilih tipe **Convex**.
2. Salin URL **Issuer** dari pengaturan Clerk.
3. Tambahkan URL tersebut sebagai `CLERK_ISSUER_URL` di environment server Convex (lihat panduan langkah 3.3).
   - _Catatan: Convex membutuhkan ini pada konfigurasi backend di `packages/backend/convex/auth.config.ts`._

**Langkah 4: Pastikan Autentikasi Berjalan**

- Coba jalankan aplikasi (`pnpm dev`) dan pastikan halaman dashboard seperti `/dashboard/*` akan otomatis mengarahkanmu ke form login Clerk.

## 5. Menjalankan Semua Service

Dari root:

```bash
pnpm dev
```

Default local endpoints:

- Dashboard: `http://localhost:3000`
- Widget App: `http://localhost:3001`
- Embed dev server (opsional, untuk debug builder): Vite default port
- Convex dev server: dikelola oleh `convex dev`

Catatan penting: `apps/embed` bukan service yang perlu dideploy ke production. Ia hanya build pipeline untuk menghasilkan `widget.js` lalu menyalinnya ke `apps/widget/public/widget.js`.

## 6. Verifikasi Cepat

- Buka dashboard dan login.
- Buat chatbot baru.
- Buka halaman embed, copy script.
- Pastikan `apps/widget/public/widget.js` tersedia (hasil build embed).
- Kirim pesan dari widget dan pastikan message tersimpan ke Convex.

## 7. Command Harian

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

Jika perlu run per repository:

```bash
pnpm dev --filter web
pnpm dev --filter widget
pnpm build --filter embed
pnpm dev --filter @workspace/backend
```

## 8. Kesalahan Umum

- `Missing NEXT_PUBLIC_CONVEX_URL`: variabel belum diisi pada `apps/web/.env.local` atau `apps/widget/.env.local`.
- Login sukses tapi query Convex gagal auth: pastikan integrasi Clerk OIDC benar.
- RAG tidak jalan: pastikan `GEMINI_API_KEY` dan `FIRECRAWL_API_KEY` sudah di-set di env Convex deployment.
- Widget blank pada domain tertentu: cek `allowedDomain` chatbot dan nilai `origin` dari embed.
