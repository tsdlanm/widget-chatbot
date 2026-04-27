# packages/typescript-config README

## Tujuan

`packages/typescript-config` menyatukan baseline TypeScript compiler options untuk semua repository.

## Isi Paket

- `base.json`
  - strict mode
  - target modern (`ES2022`)
  - `moduleResolution` default `NodeNext`
  - `noUncheckedIndexedAccess` aktif
- `nextjs.json`
  - extend `base.json`
  - plugin Next.js
  - `moduleResolution: Bundler`
  - `noEmit: true`
- `react-library.json`
  - extend `base.json`
  - `jsx: react-jsx`

## Kenapa Penting

- Menjaga perilaku type system konsisten antar app/package.
- Mengurangi konfigurasi berulang di tiap repository.
- Memudahkan upgrade TS version secara terpusat.

## Praktik Disarankan

- App Next.js gunakan preset `nextjs.json`.
- Package library gunakan preset `react-library.json` atau `base.json` sesuai kebutuhan.
- Hindari override tsconfig yang melemahkan strictness tanpa justifikasi teknis.
