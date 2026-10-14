# CutType Motion Studio v2

Generator motion typography / text match cut yang berjalan di browser:
- Animated text entrance/exit dengan slide, zoom, micro-tilt, dan mode auto mix.
- Setiap cut dirender melalui frame animation, bukan slideshow statis.
- Sound effects sintetis bervariasi: whoosh, click, pop, dan low thump, dijadwalkan di batas cut.
- Preview loop, progress render, download, dan kembali ke editor.
- Pengaturan aspect ratio, FPS, durasi, jumlah cut, ukuran font, highlight/background, grain, volume SFX.
- Tidak membutuhkan backend, API key, atau environment variables.

## Jalankan lokal
Gunakan Node.js 20 LTS:
```bash
npm install
npm run dev
```
Buka http://localhost:3000. Tes build:
```bash
npm run build
```

## Deploy ke Vercel via GitHub
1. Ekstrak ZIP lalu upload **isi folder** ke root repository GitHub (pastikan `package.json` ada di root).
2. Vercel → Add New → Project → import repository.
3. Framework Preset: Next.js.
4. Root Directory: `./`.
5. Build Command: `npm run build` (default juga boleh).
6. Install Command: `npm install` (default juga boleh).
7. **Output Directory: biarkan default / Override OFF. Jangan isi `out`.**
8. Tidak perlu environment variables. Klik Deploy.

`next.config.mjs` memakai output Next.js standar agar kompatibel dengan deployment Next.js Vercel dan menghindari error `out/routes-manifest.json`.

## Penting
- Ekspor WebM melalui MediaRecorder, karena rekaman canvas MP4/H.264 tidak didukung secara konsisten di browser.
- Gunakan Chrome desktop terbaru untuk dukungan MediaRecorder dan Web Audio yang lebih stabil. Perangkat/browser mobile dapat berbeda dukungannya.
- Jangan tutup tab ketika render berlangsung.
- Ini adalah motion-graphics renderer deterministik, bukan AI video generation. Efek suara dibuat sintetis via Web Audio; hasilnya perlu dites pada browser target.
- Match continuity mencoba mencari kata yang sama pada dua baris berurutan; bila tidak ada kata yang cocok, tetap menggunakan perpindahan visual berdasarkan mode gerakan.
