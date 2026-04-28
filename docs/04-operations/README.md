# Operations Runbook

Dokumen ini berisi panduan operasional untuk menjalankan, memvalidasi, dan deploy codebase.

## Turbo Task Orchestration

Penjelasan lengkap alur dependency Turbo (task graph, dependsOn, env propagation, cache behavior, root command flow, dan filter per repo) ada di dokumen berikut:

- [Turbo Workflow and Dependency Graph](./turbo-workflow.md)

## Environment Strategy

Ada 3 jenis env yang harus dibedakan:

1. App env (`apps/web/.env.local`, `apps/widget/.env.local`) untuk runtime lokal
2. Root tooling env (`.env.local`) untuk variabel tooling root-level (contoh: deploy key)
3. Convex deployment env (`npx convex env set`) untuk secret backend

## Environment Matrix

| Variable                            | Lokasi Set                                       | Dipakai Oleh                | Catatan                        |
| ----------------------------------- | ------------------------------------------------ | --------------------------- | ------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL`            | `apps/web/.env.local` + `apps/widget/.env.local` | web + widget                | Shared public URL Convex       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/web/.env.local`                            | web                         | Public key Clerk               |
| `CLERK_SECRET_KEY`                  | `apps/web/.env.local`                            | web middleware              | Secret untuk Clerk server side |
| `ALLOWED_EMAILS`                    | `apps/web/.env.local`                            | web/proxy                   | Super admin bypass             |
| `NEXT_PUBLIC_WIDGET_URL`            | `apps/web/.env.local`                            | web preview + embed snippet | URL host `widget.js`           |
| `CONVEX_DEPLOY_KEY`                 | root `.env.local`                                | turbo/backend deploy        | Deploy auth key                |
| `GROQ_API_KEY`                      | Convex env                                       | backend action              | LLM provider                   |
| `DIGITAL_OCEAN_API_KEY`             | Convex env                                       | backend action              | DeepSeek provider              |
| `GEMINI_API_KEY`                    | Convex env                                       | backend action              | Embedding                      |
| `FIRECRAWL_API_KEY`                 | Convex env                                       | backend action              | Crawl ingestion                |
| `WEB_ALLOWED_DOMAIN_URL`            | Convex env                                       | conversations domain check  | Fallback allow domain          |

Catatan embed: `apps/embed` tidak membutuhkan `WIDGET_URL` env. Loader embed mengikuti origin dari script `widget.js` secara otomatis. Jika perlu override host, gunakan atribut `data-widget-url` di script tag.

## Daily Commands

Dari root:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

Per repo:

```bash
pnpm dev --filter web
pnpm dev --filter widget
pnpm build --filter embed
pnpm dev --filter @workspace/backend
```

## Build and Release Order

Turborepo sudah mengatur dependency build, namun urutan logis operasional adalah:

1. Validasi env
2. Deploy backend Convex (jika perlu)
3. Build embed (`widget.js` artifact, tanpa deploy apps/embed)
4. Build widget/web

Catatan deployment: jangan deploy `apps/embed` sebagai service. Yang dideploy adalah `apps/widget` (yang membawa `public/widget.js`) dan `apps/web`.

## Convex Ops

### Set secret

```bash
cd packages/backend
npx convex env set GROQ_API_KEY "..."
npx convex env set GEMINI_API_KEY "..."
npx convex env set FIRECRAWL_API_KEY "..."
npx convex env set DIGITAL_OCEAN_API_KEY "..."
```

### Verify

```bash
npx convex env list
```

## Troubleshooting

### Dashboard login sukses tapi query gagal

- cek `NEXT_PUBLIC_CONVEX_URL`
- cek OIDC `CLERK_ISSUER_URL` di backend
- cek Clerk token forwarding via `ConvexProviderWithClerk`

### Widget tidak muncul di website client

- cek script tag punya `data-api-key`
- cek URL `widget.js` benar
- jika host iframe perlu dipaksa, gunakan `data-widget-url` pada script embed

### Widget muncul tapi pesan gagal

- cek `allowedDomain` chatbot
- cek query param `origin` terkirim
- cek rate limit status

### RAG tidak memberikan context

- cek knowledge sudah ter-ingest
- cek `GEMINI_API_KEY` dan `FIRECRAWL_API_KEY` pada Convex env
- cek skor retrieval mungkin di bawah threshold

### Build green tapi runtime error env kosong

- build-time success tidak menjamin runtime env lengkap
- validasi env di target deployment (Vercel/host/Convex) terpisah

## Saran CI Minimum

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- optional smoke test route dashboard + widget
