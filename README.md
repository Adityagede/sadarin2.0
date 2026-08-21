# SADARIN

Website edukasi lingkungan berbasis HTML, CSS, dan JavaScript murni. Project ini tidak memakai framework atau proses build.

## Struktur utama

- `index.html` — halaman utama dan seluruh konten homepage
- `css/style.css` — design tokens, navigasi, section, dan responsive enhancement
- `js/index.js` — navigasi, dropdown, accordion mobile, slider, dan reveal section
- `assets/` — logo dan fotografi SADARIN
- `lib/swiper/` — library lokal untuk hero slider

## Menjalankan project

Buka `index.html` melalui Live Server di VS Code atau server lokal statis lainnya. Menggunakan server lokal disarankan agar seluruh aset dan fragment navigation diuji dalam kondisi yang sama seperti saat dipublikasikan.

## Responsive system

CSS menggunakan mobile-first sebagai source of truth. Perubahan struktur utama terjadi pada 600px, 768px, 1024px, 1100px, 1180px, dan 1440px berdasarkan kebutuhan layout, bukan nama perangkat tertentu.

## Catatan pemeliharaan

- Pertahankan class dan ID navigasi karena dipakai bersama oleh HTML, CSS, dan JavaScript.
- Tambahkan perubahan pada selector aslinya; hindari menumpuk override di bagian akhir stylesheet.
- Gunakan ikon SVG ringan yang sudah ada untuk kategori Organik, Plastik, Kertas, dan Residu.
- Pastikan seluruh tombol interaksi tetap memiliki `type`, label yang jelas, serta state `aria-expanded` yang sesuai.
