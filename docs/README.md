# Developer Documentation - Chatbot Widget Monorepo

Dokumentasi ini ditulis untuk developer yang ingin memahami arsitektur, menjalankan environment lokal, dan mengembangkan codebase monorepo ini dengan aman.

Dokumen ini tidak fokus ke end-user produk. Fokus utamanya adalah engineering workflow.

## Isi Dokumentasi

- [Getting Started](./01-getting-started/README.md)
- [Architecture Overview](./02-architecture/README.md)
- [System Architecture Diagram](./02-architecture/system-architecture.md)
- [Convex ERD](./02-architecture/convex-erd.md)
- [RAG Pipeline Flow](./02-architecture/rag-pipeline.md)
- [Repository Map](./03-repositories/README.md)
- [apps/web README](./03-repositories/apps-web/README.md)
- [apps/widget README](./03-repositories/apps-widget/README.md)
- [apps/embed README](./03-repositories/apps-embed/README.md)
- [packages/backend README](./03-repositories/packages-backend/README.md)
- [packages/ui README](./03-repositories/packages-ui/README.md)
- [packages/eslint-config README](./03-repositories/packages-eslint-config/README.md)
- [packages/typescript-config README](./03-repositories/packages-typescript-config/README.md)
- [Operations Runbook](./04-operations/README.md)
- [Development Guide](./05-development/README.md)

## Quick Context

Monorepo ini memiliki 3 aplikasi utama dan beberapa package shared:

- `apps/web`: dashboard admin (Next.js)
- `apps/widget`: UI chat yang dijalankan di iframe (Next.js)
- `apps/embed`: pipeline build untuk menghasilkan `widget.js` (Vite, format IIFE), lalu file hasilnya disalin ke `apps/widget/public`
- `packages/backend`: Convex schema + functions + HTTP action
- `packages/ui`: shared UI components + CSS tokens

## Tech Stack per Layer

| Layer                | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| Monorepo Tooling     | Turborepo, pnpm workspaces                                    |
| Dashboard            | Next.js 16, React 19, Clerk, Convex React                     |
| Widget               | Next.js 16, React 19, Convex React, react-markdown            |
| Embed Build Pipeline | Vite (IIFE output), browser DOM API                           |
| Backend              | Convex (queries, mutations, actions, httpAction)              |
| AI                   | Groq (Llama 3.3), DeepSeek via DigitalOcean, Gemini Embedding |
| RAG                  | Firecrawl crawl + chunking + Convex vector index              |
| Shared UI            | Tailwind CSS v4, shadcn/radix components                      |

Catatan penting: repository `apps/embed` bukan service yang dideploy. Deployment runtime dilakukan pada `apps/widget` (yang menyajikan `public/widget.js`) dan `apps/web`.

## Source of Truth

Jika terjadi perbedaan antara dokumen ini dan implementasi, jadikan kode sebagai source of truth. Dokumentasi ini dibuat sebagai peta dan panduan kerja developer.

## Relationship with Root README

File `README.md` di root tetap dipertahankan sebagai ringkasan produk.
Folder `docs/` ini adalah dokumentasi engineering yang lebih detail dan repository-centric.
