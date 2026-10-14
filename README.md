# CutType Studio — Text Match Cut Generator

## Fitur
- Input teks: satu kalimat per baris sebagai variasi cut.
- Rasio 9:16, 16:9, 1:1, 4:5; 24/30/60 FPS; durasi 3–20 detik; jumlah cut.
- Desain editorial: teks hitam tebal, highlight kuning, kertas off-white dan grain.
- Sound tick/click sinkron cut, live preview, render, download, kembali ke editing.
- Render lokal browser, tanpa backend/API key.

## Jalankan lokal
Disarankan Node.js 20 LTS:
```bash
npm install
npm run dev
```
Buka http://localhost:3000. Tes build dengan `npm run build`.

## Deploy Vercel dari GitHub
1. Ekstrak ZIP ini dan upload **isi folder** ke root repository GitHub (package.json harus berada di root).
2. Vercel → Add New → Project → Import repository.
3. Framework Preset: Next.js; Root Directory: `./`.
4. Build Command: `npm run build`; Output Directory: `out`; Install Command: `npm install`.
5. Environment Variables: tidak diperlukan. Klik Deploy.
6. `next.config.mjs` dan `vercel.json` sudah disiapkan untuk static export. Jangan mengubah output folder menjadi `.next`.

## Catatan penting
Ekspor menggunakan WebM lewat MediaRecorder karena MP4/H.264 tidak didukung konsisten untuk perekaman canvas di semua browser. Gunakan Chrome/Edge terbaru. iOS/Safari bisa berbeda dukungannya. Jangan tutup tab saat render. Render 60 FPS dan resolusi tinggi lebih berat. Generator ini membuat motion typography berbasis template, bukan video AI; hasil harus diuji di perangkat target sebelum publikasi.
