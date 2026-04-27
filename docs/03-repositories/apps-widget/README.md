# apps/widget README

## Tujuan

`apps/widget` adalah aplikasi chat yang ditampilkan di iframe pada website client.

Ia menangani:

- inisialisasi session pengunjung
- input/output percakapan realtime
- handling error (inactive bot, domain forbidden, rate limit)
- UI state untuk clear conversation dan name prompt

## Stack

- Next.js 16
- React 19
- Convex React client (tanpa Clerk)
- `react-markdown`
- Shared UI dari `@workspace/ui`

## Runtime Contract

Widget dibuka lewat URL dengan query param:

- `key`: API key chatbot (wajib)
- `origin`: URL parent page (untuk domain validation backend)

Contoh generated oleh embed script:

```text
https://widget-host/?key=<API_KEY>&origin=<ENCODED_PARENT_URL>
```

## Arsitektur Internal

### Entry Point

- `app/page.tsx` (`ChatInterface`) mengorkestrasi seluruh hook dan komponen.

### Hook Layer

- `use-conversation-init.ts`
  - validasi `apiKey`
  - ambil/generate session id dari localStorage
  - panggil `conversations.getOrCreate`
  - sinkronkan metadata visitor
- `use-chat-actions.ts`
  - optimistic message
  - panggil `messages.send`
  - tangani error code backend
- `use-message-state.ts`
  - sinkronisasi local list dan backend list
- `use-rate-limit.ts`
  - state retry countdown
- `use-chat-scroll.ts`
  - auto scroll saat message baru

### Component Layer

- `chat-header.tsx`
- `message-list.tsx`
- `message-input.tsx`
- `name-prompt-modal.tsx`
- `rate-limit-alert.tsx`
- `widget-error-alert.tsx`
- `clear-confirm-modal.tsx`

## Error Handling Contract dari Backend

Widget mengandalkan code berikut:

- `INVALID_API_KEY`
- `DOMAIN_FORBIDDEN`
- `CHATBOT_INACTIVE`
- `CONVERSATION_NOT_FOUND`
- `RATE_LIMITED`
- `AI_ERROR`

Jika backend menambah/ubah code, update hook `use-chat-actions.ts` dan `use-conversation-init.ts`.

## Session and Metadata

Metadata pengunjung yang direkam:

- visitorName
- visitorUrl
- visitorReferrer
- visitorAgent
- visitorLanguage
- visitorTimezone
- visitorPlatform
- viewport size

Data ini disimpan di tabel `conversations.metadata`.

## Environment Variables

Lokasi file: `apps/widget/.env.local`

- `NEXT_PUBLIC_CONVEX_URL`

Catatan: widget tidak butuh Clerk variable.

## Scripts

```bash
pnpm dev --filter widget
pnpm build --filter widget
pnpm lint --filter widget
pnpm typecheck --filter widget
```

## Developer Notes

- Jangan asumsi `apiKey` selalu tersedia; selalu guard pada initialization state.
- Gunakan `origin` dari query param sebagai sumber domain utama.
- Untuk perubahan UI yang mempengaruhi embed, uji juga lewat `apps/embed` agar contract iframe tetap aman.
