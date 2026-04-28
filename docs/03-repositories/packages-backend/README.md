# packages/backend README

## Tujuan

`packages/backend` adalah pusat data model dan business logic aplikasi melalui Convex.

Ia menangani:

- schema database
- query/mutation untuk dashboard dan widget
- action untuk pipeline AI + RAG
- HTTP endpoint `/chat`
- integrasi auth OIDC Clerk

## Struktur Modul Convex

| File                       | Tanggung Jawab                                          |
| -------------------------- | ------------------------------------------------------- |
| `convex/schema.ts`         | Definisi tabel + index + vector index                   |
| `convex/auth.config.ts`    | OIDC provider config dari Clerk                         |
| `convex/http.ts`           | HTTP router untuk `/chat`                               |
| `convex/chatbots.ts`       | CRUD chatbot + statistik dashboard                      |
| `convex/conversations.ts`  | Session init, metadata update, list/delete conversation |
| `convex/messages.ts`       | Main chat action + RAG + LLM + save response            |
| `convex/knowledge.ts`      | Crawl web + ingest file + embedding knowledge           |
| `convex/knowledgeData.ts`  | Simpan/retrieve chunk knowledge docs                    |
| `convex/knowledgeFiles.ts` | Lifecycle upload file knowledge                         |
| `convex/rateLimit.ts`      | Monitoring dan reset rate limit                         |
| `convex/access.ts`         | Access request workflow dashboard                       |
| `convex/users.ts`          | Sinkronisasi profil user dari Clerk                     |

## Function Type Boundaries

- `query`: read-only operation
- `mutation`: write operation
- `internalMutation/internalQuery`: private function antar module backend
- `action`: long-running external call (LLM, embedding, crawl)
- `httpAction`: endpoint publik via HTTP router

## Data Model Ringkas

Tabel utama:

- `users`
- `chatbots`
- `conversations`
- `messages`
- `knowledge` (3072-dim vector)
- `knowledgeFiles`
- `rateLimits`
- `accessRequests`

Lihat detail relasi di [Architecture Convex ERD](../../02-architecture/convex-erd.md).

## Main Chat Pipeline

Entry function: `messages.send`

Tahapan:

1. `prepareSend`: validasi conversation/chatbot + rate limit + insert user message
2. optional RAG retrieval via embedding + vector search
3. panggil model (`groq` atau `deepseek`)
4. sanitize output
5. `saveResponse`: insert assistant message + update stats

Lihat detail diagram di [RAG Pipeline](../../02-architecture/rag-pipeline.md).

## Auth Model

### Dashboard Calls

- Memakai token Clerk yang dikirim dari `apps/web`.
- `ctx.auth.getUserIdentity()` dipakai untuk data scoping (misalnya `chatbots.by_user`).

### Widget Calls

- Tidak memakai Clerk.
- Validasi dengan API key chatbot + domain whitelist di `conversations.getOrCreate`.

## Environment Variables

### Convex Deployment Environment (wajib set di Convex)

- `GROQ_API_KEY`
- `DIGITAL_OCEAN_API_KEY`
- `GEMINI_API_KEY`
- `FIRECRAWL_API_KEY`
- `WEB_ALLOWED_DOMAIN_URL` (fallback domain allowance)

### Build/Deploy Variables

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `CLERK_ISSUER_URL`

## Scripts

```bash
pnpm dev --filter @workspace/backend
pnpm build --filter @workspace/backend
pnpm deploy --filter @workspace/backend
```

## Operational Notes

- `convex/_generated/*` adalah artifact codegen, jangan edit manual.
- Perubahan schema harus diikuti validasi semua query/mutation yang terdampak.
- Perubahan error code di `messages.send` harus disinkronkan ke `apps/widget`.
- Perubahan access logic harus dievaluasi dampaknya ke middleware `apps/web/proxy.ts`.
- Ingestion knowledge sekarang punya dua source: crawl website dan upload file. Keduanya tetap berujung ke tabel `knowledge` yang sama.
- Untuk upload file, ekstraksi isi berjalan lokal di backend: `unpdf` untuk PDF, `mammoth` untuk DOCX, dan `blob.text()` untuk file teks sederhana. Gemini tetap dipakai hanya untuk embedding.

## Suggested Safe Change Workflow

1. Ubah schema/function.
2. Jalankan codegen (`pnpm build --filter @workspace/backend` atau `convex dev`).
3. Jalankan typecheck minimal di `web` dan `widget`.
4. Uji route dashboard + alur kirim pesan widget end-to-end.
