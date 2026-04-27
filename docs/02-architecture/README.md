# Architecture Overview

Dokumen ini menjelaskan batas sistem, dependency antar repository, dan alur runtime utama.

## Dokumen Turunan

- [System Architecture Diagram](./system-architecture.md)
- [Convex ERD](./convex-erd.md)
- [RAG Pipeline](./rag-pipeline.md)

## Bounded Context

Sistem dibagi menjadi konteks berikut:

1. Dashboard Context (`apps/web`)
2. Widget Runtime Context (`apps/widget`)
3. Embed Build Context (`apps/embed`)
4. Backend + Data Context (`packages/backend`)
5. Shared UI + Config Context (`packages/ui`, `packages/*-config`)

## Runtime Relationships

- Dashboard memakai Clerk + Convex provider untuk authenticated admin flow.
- Widget tidak memakai Clerk, melainkan API key chatbot + validasi domain.
- `apps/embed` membangun `widget.js` yang meng-inject iframe ke website client, lalu artifact-nya disalin ke `apps/widget/public`.
- Semua data state utama tersimpan di Convex (`chatbots`, `conversations`, `messages`, dll).
- AI response dihasilkan di Convex action `messages.send`.

Catatan: `apps/embed` bukan deployment target runtime.

## Request Flow Ringkas

### Dashboard Admin Flow

- User login via Clerk.
- Middleware (`proxy.ts`) cek route protected dan status akses.
- Frontend memanggil Convex query/mutation untuk CRUD chatbot, conversation monitor, dan pengaturan.

### Public Widget Flow

- Script embed memuat iframe ke `apps/widget` dengan query param `key` dan `origin`.
- Widget inisialisasi session (`conversations.getOrCreate`).
- User kirim pesan -> `messages.send` action -> LLM + optional RAG -> simpan response.

### Knowledge Ingestion Flow

- Admin memasukkan URL dari dashboard.
- Convex action `knowledge.searchAndEmbed` crawl Firecrawl, chunk content, embed Gemini, lalu simpan ke tabel `knowledge`.
- Saat chat, sistem vector search knowledge per chatbot.

## Internal Contracts yang Harus Stabil

- Public embed script contract:
  - `<script ... data-api-key="...">`
  - Query params iframe: `key`, `origin`
- Convex schema relationships (lihat [Convex ERD](./convex-erd.md))
- Error codes dari `messages.send` dan `conversations.getOrCreate` yang dipakai widget UI

## Arsitektur Build

- Monorepo diorkestrasi Turborepo (`turbo.json`)
- `web#build` dan `widget#build` tergantung `@workspace/backend#deploy`
- `widget#build` juga tergantung `embed#build` agar `widget.js` ter-copy ke `apps/widget/public`
