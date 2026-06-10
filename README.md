# ⛽ Pom Bensin — Game Isi Bensin 3D

Mini game 3D: jadi petugas SPBU dan isi Pertamax (Rp 16.250/liter) sesuai
pesanan pelanggan. Berhenti sedekat mungkin dengan pesanan — kelebihan berarti
kamu nombok, kurang banyak bikin pelanggan komplain!

## Cara main

- Pelanggan memesan dalam rupiah ("Pertamax Rp 30.000") atau liter ("2 liter").
- **Tahan tombol merah**, atau **arahkan nozzle ke tangki lalu tahan klik** —
  nozzle otomatis tercolok ke lubang tangki.
- Tap singkat untuk menambah sedikit demi sedikit di akhir.
- Tekan **Serahkan** saat pas. Pas ±Rp 100 = 100 poin. Kelebihan atau kurang
  lebih dari Rp 1.500 = kehilangan 1 nyawa (dari 3).
- Geser area kosong untuk memutar kamera. Garis merah di tangki = batas pesanan.

## Teknologi

React 19 + Vite + three.js (react-three-fiber + drei) + Tailwind CSS v4.
Tangki motor transparan dengan simulasi cairan: permukaan bergelombang,
gelembung naik, dan percikan di titik jatuh aliran.

## Menjalankan

```bash
npm install
npm run dev    # development
npm run build  # production → dist/
```

Deploy: static site (SPA) — Netlify/Vercel/GitHub Pages, publish folder `dist`.
