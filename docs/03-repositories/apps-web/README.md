# apps/web README

## Tujuan

`apps/web` adalah dashboard admin untuk:

- mengelola chatbot
- memonitor conversation dan rate limit
- mengelola knowledge base RAG
- menghasilkan embed snippet
- mengelola access request user dashboard

Aplikasi ini memakai autentikasi Clerk + authorization tambahan berbasis email allowlist dan status access request di Convex.

## Stack

- Next.js 16 (App Router)
- React 19
- Clerk (`@clerk/nextjs`)
- Convex React (`useQuery`, `useMutation`, `useAction`)
- Shared UI dari `@workspace/ui`

## Route Map

| Route | Kegunaan |
| --- | --- |
| `/` | Landing page + auth state |
| `/sign-in` | Login Clerk |
| `/sign-up` | Registrasi Clerk |
| `/unauthorized` | Halaman status akses dashboard |
| `/support` | Halaman support (placeholder) |
| `/dashboard` | Overview + chart ringkasan chatbot |
| `/dashboard/chatbots` | Daftar chatbot |
| `/dashboard/chatbots/new` | Form chatbot baru |
| `/dashboard/chatbots/[id]/conversations` | Daftar session percakapan |
| `/dashboard/chatbots/[id]/conversations/[conversationId]` | Viewer detail percakapan |
| `/dashboard/chatbots/[id]/knowledge` | Scrape URL + edit/hapus knowledge |
| `/dashboard/chatbots/[id]/embed` | Copy embed code + download plugin WP |
| `/dashboard/chatbots/[id]/rate-limit` | Monitor rate limit per session |
| `/dashboard/chatbots/[id]/settings` | Pengaturan nama/prompt/domain/model/status |
| `/dashboard/admin/requests` | Approve/reject request akses |
| `/preview/[id]` | Standalone preview halaman simulasi widget |

## Autentikasi dan Autorisasi

### 1. Authn

- `app/layout.tsx` membungkus app dengan `ClerkProvider`.
- `lib/ConvexClientProvider.tsx` memakai `ConvexProviderWithClerk` agar token Clerk ikut ke request Convex.

### 2. Authz

- `proxy.ts` melindungi route `/dashboard/*`.
- Policy:
  1. Jika email ada di `ALLOWED_EMAILS`: super admin.
  2. Jika bukan super admin: cek `api.access.getAccessStatus(email)`.
  3. Hanya status `approved` yang boleh akses dashboard.
  4. Route `/dashboard/admin/*` hanya untuk super admin.

## Komponen Penting

- `components/dashboard-shell.tsx`: shell dashboard + topbar.
- `components/app-sidebar.tsx`: navigasi dan filter menu admin.
- `app/dashboard/chatbots/_components/chatbot-detail-shell.tsx`:
  - tab detail chatbot
  - tombol `Simulasi` yang membuka `/preview/[id]`
- `app/dashboard/chatbots/_components/rate-limit-monitor.tsx`: observability limit.
- `app/dashboard/chatbots/_components/conversation-viewer.tsx`: viewer metadata + log chat.

## Integrasi ke Backend

Contoh pemakaian API Convex di app ini:

- `api.chatbots.*`
- `api.conversations.*`
- `api.knowledge.*`
- `api.knowledgeData.*`
- `api.rateLimit.*`
- `api.access.*`

Semua function reference berasal dari generated SDK: `@workspace/backend/convex/_generated/api`.

## Environment Variables yang Dipakai

Lokasi file: `apps/web/.env.local`

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `ALLOWED_EMAILS`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_WIDGET_URL`

## Scripts

```bash
pnpm dev --filter web
pnpm build --filter web
pnpm lint --filter web
pnpm typecheck --filter web
```

## Developer Notes

- Halaman dashboard bersifat authenticated; jangan memanggil query protected sebelum auth siap (`isLoading` + `isAuthenticated`).
- Jika menambah route baru di `/dashboard`, pastikan perilaku middleware tetap sesuai policy.
- Jika menambah error code dari backend, sinkronkan handling pada halaman/hook terkait di dashboard.
