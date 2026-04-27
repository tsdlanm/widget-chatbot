# apps/embed README

## Tujuan

`apps/embed` membangun script `widget.js` yang bisa dipasang pada website apa pun melalui satu tag `<script>`.

Repository ini adalah build utility repository, bukan runtime repository. Artinya `apps/embed` tidak perlu dideploy sebagai service terpisah.

Script ini bertugas:

- membaca `data-api-key` dari script tag
- membuat floating launcher button
- meng-inject iframe ke host widget (mengikuti origin `widget.js`, opsional override `data-widget-url`)
- mengirim parameter `key` dan `origin`
- mendukung drag-and-drop launcher dan close behavior

## Build Output

- Format build: IIFE
- Output: `dist/widget.js`
- Pasca build: otomatis di-copy ke `apps/widget/public/widget.js` via plugin Vite

## Deployment Model

- `apps/embed`: tidak dideploy
- `apps/widget`: dideploy, karena menyajikan file `public/widget.js` dan widget runtime iframe
- `apps/web`: dideploy untuk dashboard admin

## Runtime Behavior

### Input Contract

Embed script mengharuskan atribut `data-api-key`. Atribut `data-widget-url` bersifat opsional.

```html
<script
  type="module"
  crossorigin="anonymous"
  src="https://<widget-host>/widget.js"
  data-api-key="<chatbot-api-key>"
  data-widget-url="https://<widget-host>"
></script>
```

Jika `data-widget-url` tidak diisi, iframe otomatis menggunakan origin dari `src` script.

### DOM Contract

Setelah load:

- dibuat container fixed di pojok kanan bawah
- dibuat iframe:
  - width default `380px`
  - height default `600px`
  - responsive max width/height terhadap viewport
- launcher button dapat di-drag

### Security/Validation Contract

`origin` parent URL dikirim ke iframe query param.
Backend kemudian memvalidasi terhadap `allowedDomain` chatbot.

## Environment Variables

Tidak ada env wajib.

Host iframe widget ditentukan saat runtime dari origin URL `widget.js`.
Jika diperlukan (misalnya split host asset dan host widget), gunakan atribut opsional `data-widget-url` di script tag embed.

## Scripts

```bash
pnpm build --filter embed
pnpm dev-ril --filter embed
pnpm preview --filter embed
```

Catatan: script dev saat ini bernama `dev-ril` (bukan `dev`).

## Developer Notes

- Pastikan setiap perubahan pada query param iframe tetap backward-compatible (`key`, `origin`).
- Jangan hapus plugin `copy-to-widget-public` tanpa mengganti mekanisme distribusi artifact.
- Uji drag behavior di desktop dan mobile viewport sebelum merge.
