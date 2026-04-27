# Development Guide

Panduan ini berfokus pada cara mengembangkan fitur baru di monorepo ini tanpa merusak kontrak antar repository.

## Prinsip Umum

1. Anggap `packages/backend/convex/schema.ts` sebagai kontrak data utama.
2. Semua perubahan backend harus dicek dampaknya ke `apps/web` dan `apps/widget`.
3. Jaga compatibility embed contract (`data-api-key`, `key`, `origin`).
4. Hindari duplicate component jika bisa diletakkan di `packages/ui`.

## Workflow Menambah Fitur Chat

1. Definisikan kebutuhan data baru pada schema Convex.
2. Tambahkan query/mutation/action pada module backend yang tepat.
3. Jalankan Convex codegen.
4. Integrasikan ke widget hook (`use-chat-actions` / `use-conversation-init`).
5. Tambahkan observability di dashboard jika relevan.

## Workflow Menambah Halaman Dashboard

1. Tambah route di `apps/web/app/dashboard/...`.
2. Putuskan apakah route butuh admin-only behavior.
3. Tambah item navigasi jika perlu di `components/app-sidebar.tsx`.
4. Gunakan Convex hooks dengan guard auth (`isLoading`, `isAuthenticated`).

## Workflow Menambah Integrasi AI Baru

1. Tambah opsi model pada `chatbots.aiModel` bila perlu.
2. Tambah branch logic di `messages.send`.
3. Pastikan response disanitasi konsisten.
4. Update pengaturan UI model selector di halaman settings chatbot.
5. Update dokumentasi env provider baru.

## Workflow Menambah Data Knowledge/RAG

1. Pertahankan chunking agar token footprint stabil.
2. Gunakan batching untuk panggilan embedding API.
3. Filter retrieval harus tetap scoped per `chatbotId`.
4. Definisikan threshold retrieval secara eksplisit.

## Testing and Verification Checklist

Sebelum merge:

- Lint lulus
- Typecheck lulus
- Build lulus
- Create chatbot flow lulus
- Embed script flow lulus
- Widget send message lulus
- Rate limit behavior lulus
- Access control dashboard lulus

## Practical Guardrails

- Jangan edit `convex/_generated/*` manual.
- Jangan ubah nama env tanpa update semua consumers.
- Jangan hardcode URL host; gunakan env.
- Jangan merge perubahan middleware tanpa uji route protected.

## Suggested Branch PR Template

- Ringkasan fitur
- Perubahan schema (jika ada)
- Perubahan API/backend function
- Perubahan web/widget/embed
- Dampak env variable
- Checklist test manual
