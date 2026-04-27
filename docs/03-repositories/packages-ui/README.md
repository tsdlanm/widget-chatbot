# packages/ui README

## Tujuan

`packages/ui` adalah shared design system untuk semua aplikasi di monorepo.

Tujuan utama:

- menyatukan primitive komponen UI
- menyatukan utility hook
- menyatukan token style/Tailwind config
- mengurangi duplikasi komponen antar app

## Isi Paket

- `src/components/*`: komponen shadcn/radix berbasis React
- `src/hooks/*`: custom hooks UI
- `src/lib/*`: utility (`cn` dan helper lain)
- `src/styles/globals.css`: global Tailwind + theme tokens

## Export Contract

Dari `package.json`:

- `@workspace/ui/globals.css`
- `@workspace/ui/components/*`
- `@workspace/ui/hooks/*`
- `@workspace/ui/lib/*`

## Styling System

- Tailwind CSS v4
- `shadcn/tailwind.css`
- CSS custom properties untuk token warna/radius/sidebar
- mode terang/gelap dengan class `.dark`

## Konsumsi di Apps

- `apps/web` dan `apps/widget` mengimpor komponen dari `@workspace/ui/components/*`
- Kedua app juga memakai `@workspace/ui/globals.css` dari root layout masing-masing

## Scripts

```bash
pnpm lint --filter @workspace/ui
pnpm format --filter @workspace/ui
pnpm typecheck --filter @workspace/ui
```

## Developer Notes

- Jika menambah komponen baru, ekspor lewat pola folder yang konsisten dengan export map package.
- Hindari hardcoded color di app jika sudah tersedia token UI package.
- Pastikan komponen reusable tetap bebas dari dependency domain bisnis tertentu.
