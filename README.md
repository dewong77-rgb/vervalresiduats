# Instrumen Verval Residu & ATS DO — Frontend

Struktur mengikuti pemisahan tiga lapis: presentasi (css/), struktur alur per layar (js/views/), logika data (js/state.js, js/api.js). Sudah tersambung ke backend asli sesuai `API_CONTRACT.md`.

## Struktur

- `index.html` — shell aplikasi
- `panduan.html` — panduan penggunaan, halaman statis
- `css/variables.css` — token warna, font, spacing. Satu-satunya file yang perlu diubah untuk ganti tampilan
- `css/base.css` — komponen bersama: tombol, card, badge status, progress bar
- `css/observasi.css` — aksen khusus alur Observasi Sekolah
- `css/fgd.css` — aksen khusus alur FGD OPD
- `js/util.js` — escape HTML dan render field pertanyaan (dipakai lintas layar)
- `js/state.js` — simpan/ambil draf dari localStorage, hitung persentase & status keterisian
- `js/api.js` — komunikasi ke Google Apps Script, URL exec sudah diisi
- `js/views/pilih-lokus.js` — provinsi, kab/kota, sekolah (Observasi) atau provinsi + Nama/Alamat OPD manual (FGD)
- `js/views/checklist-instrumen.js` — status B1/B2 untuk satu sekolah (Observasi)
- `js/views/daftar-kegiatan.js` — daftar kegiatan RTL, tambah baris, submit semua sekaligus (FGD)
- `js/views/form-isian.js` — identitas + pertanyaan untuk B1/B2, atau pertanyaan per kegiatan untuk RTL
- `js/views/konfirmasi.js` — hasil submit, termasuk pemicu download Excel untuk RTL
- `js/app.js` — router antar layar berbasis hash

## Alur Data (mengikuti API_CONTRACT.md)

- **Observasi (B1/B2)**: tiap instrumen adalah submission independen. Narasumber dan petugas pelaksana bisa lebih dari satu orang, diisi lewat baris yang bisa ditambah/dihapus di form. Saat submit, nama-nama itu digabung jadi satu string dipisah `; ` sebelum dikirim ke `submitB1`/`submitB2`, karena skema backend saat ini satu kolom per field (bukan array). Kalau nanti perlu tiap narasumber jadi baris/kolom terpisah di Kerangka Hasil, itu perubahan skema backend tersendiri. Setiap instrumen juga menampilkan Deskripsi Kegiatan (teks lembar informasi wawancara) sebelum daftar pertanyaan.
- **FGD (RTL)**: identitas OPD (Provinsi, Nama OPD, Alamat OPD) diisi manual sekali, lalu semua kegiatan yang ditambahkan dikirim bersamaan lewat `submitRTL`. Respons membawa file Excel base64 yang langsung diunduh di browser.
- Draf (jawaban yang belum disubmit) disimpan ke localStorage tiap kali diketik. Begitu satu instrumen atau seluruh kegiatan RTL berhasil disubmit, hasilnya bersifat final, aplikasi ini tidak menyediakan jalur edit ulang ke server.
- Semua request POST memakai header `Content-Type: text/plain;charset=utf-8`, bukan `application/json`, sesuai catatan CORS di API_CONTRACT.md.
- Semua respons backend dicek lewat `ok`, bukan HTTP status code. Kalau `ok:false`, pesan error backend ditampilkan lewat `alert()` atau banner sederhana di layar.

## Yang masih perlu diperhatikan

- **Pemetaan `tipeJawaban` ke tipe input** di `js/util.js` (`tipeInputDari`) baru menutup dua kasus: "Teks Panjang (Naratif)" jadi textarea, kata "Angka" jadi input number, sisanya jadi input teks biasa. Kontrak baru memberi satu contoh nilai, jadi kalau Bank Soal punya tipe lain (misalnya pilihan ganda), fungsi ini perlu ditambah.
- **Kab/Kota dengan akhiran "(FGD Dinas)"** sudah difilter keluar dari dropdown alur Observasi, sesuai catatan kontrak bahwa entri itu tidak punya sekolah.
- Belum ada halaman rekap lintas petugas/lintas lokus untuk pemantauan Direktorat SMA, itu di luar cakupan draf ini, perlu endpoint agregasi terpisah kalau dibutuhkan nanti.
- Validasi input masih minim (cek field wajib dasar saja), belum ada validasi format per tipe jawaban.

## Menjalankan

Buka `index.html` langsung di browser, atau deploy folder ini ke Vercel sebagai static site. Karena backend sudah aktif, aplikasi ini langsung memanggil data asli begitu dibuka, tidak ada mode demo/mock lagi.
