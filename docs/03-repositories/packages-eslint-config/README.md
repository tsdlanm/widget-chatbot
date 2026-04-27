# packages/eslint-config README

## Tujuan

`packages/eslint-config` menyediakan preset lint bersama agar standar kualitas kode konsisten di seluruh workspace.

## Isi Paket

- `base.js`
  - baseline JavaScript + TypeScript rules
  - integrasi `eslint-config-prettier`
  - plugin turbo env check (`turbo/no-undeclared-env-vars`)
  - ignore pattern untuk output build/cache
- `next.js`
  - extend base config
  - tambah aturan Next.js (`core-web-vitals`)
  - aturan React dan React Hooks
- `react-internal.js`
  - preset React generic non-Next

## Cara Pakai

Aplikasi/paket cukup import preset yang sesuai pada file `eslint.config.js` masing-masing.

## Catatan

- Rule lint sengaja cenderung warning-friendly (`eslint-plugin-only-warn`) agar flow develop tidak terlalu kaku.
- Jangan menambah exception rule per-app tanpa alasan jelas; utamakan fix source code.
