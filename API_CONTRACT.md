# API Backend - Instrumen Verval Residu dan ATS DO

Base URL (exec URL deployment):
`https://script.google.com/macros/s/AKfycbxNyHj4woa8SmLM8KMkRvbDFsnxV1FnB6w8Xsl7zOqwFFoQg8KWUysAAuyODDCQVgofTg/exec`

Semua request lewat parameter `action`. GET untuk baca data, POST untuk submit.

## CORS, wajib dibaca sebelum bikin fetch POST

Apps Script Web App tidak mendukung preflight OPTIONS. Kirim POST dari
frontend dengan header:

```
Content-Type: text/plain;charset=utf-8
```

bukan `application/json`, meski body-nya tetap string JSON biasa. Kalau pakai
`application/json`, browser akan preflight dan gagal kena CORS.

## GET - baca data

### `?action=getPertanyaan&instrumen=B1|B2|RTL`
Daftar butir pertanyaan, urut sesuai kolom Urutan di Bank Soal.
```json
{ "ok": true, "data": [
  { "idButir": "B1-01", "targetResponden": "...", "urutan": 1,
    "labelKolom": "Kondisi Demografi Orang Tua/Wali Siswa",
    "teksPertanyaan": "...", "tipeJawaban": "Teks Panjang (Naratif)", "keterangan": "" }
]}
```

### `?action=getPetugas`
```json
{ "ok": true, "data": [ { "nama": "Uce Veriyanti", "instansi": "Direktorat SMA - Teknis" }, ... ] }
```
Frontend menambahkan sendiri opsi "Lainnya (isi manual)" di UI, backend tidak
memvalidasi nama petugas terhadap daftar ini.

### `?action=getProvinsi`
```json
{ "ok": true, "data": ["Jawa Barat", "DI Yogyakarta", "Jawa Tengah", "Banten"] }
```

### `?action=getKabKota&provinsi=Jawa Barat`
```json
{ "ok": true, "data": ["Kota Bandung (FGD Dinas)", "Kab. Bogor", ...] }
```
Entri yang namanya diakhiri "(FGD Dinas)" tidak punya sekolah, hanya
relevan untuk alur RTL, bukan B1/B2.

### `?action=getSekolah&provinsi=Jawa Barat&kabKota=Kab. Bandung Barat`
```json
{ "ok": true, "data": [ { "nama": "SMAN 1 CILILIN", "npsn": "20206146" }, ... ] }
```
Array kosong berarti lokus FGD Dinas tanpa sekolah. Untuk kab/kota apa pun,
UI tetap perlu opsi "Sekolah lain (isi manual)" yang membuka field Nama
Sekolah dan NPSN bebas, karena Lokus bisa saja belum lengkap.

## POST - submit hasil isian

Body selalu string JSON, dengan `action` di dalamnya.

### `submitB1` / `submitB2`
```json
{
  "action": "submitB1",
  "identity": {
    "Provinsi": "Jawa Barat",
    "Kab/Kota": "Kab. Bandung Barat",
    "Nama Sekolah": "SMAN 1 CILILIN",
    "NPSN": "20206146",
    "Jumlah Siswa": 500,
    "Nama Responden": "...",
    "Jabatan Responden": "...",
    "Nama Petugas Pewawancara": "...",
    "Instansi Petugas": "..."
  },
  "jawaban": { "B1-01": "teks jawaban", "B1-02": "teks jawaban", ... }
}
```
Balasan:
```json
{ "ok": true, "data": { "idIsian": "uuid", "kodeReferensi": "B1-20206146-20260917", "timestamp": "17/09/2026 16:37" } }
```
`jawaban` pakai key ID Butir persis (B1-01, B1-02, dst), ambil daftar ID
Butir dan urutannya dari `getPertanyaan`. Satu kali submit = satu baris di
sheet Kerangka Hasil, dikirim setelah semua pertanyaan terjawab, bukan per
pertanyaan.

### `submitRTL`
```json
{
  "action": "submitRTL",
  "identity": { "Provinsi": "Jawa Barat", "Nama OPD": "...", "Alamat OPD": "..." },
  "kegiatan": [
    { "RTL-02": "Uraian kegiatan 1", "RTL-03": "Tujuan 1", "RTL-04": "Sasaran",
      "RTL-05": "Waktu", "RTL-06": "PIC", "RTL-07": "Mitra", "RTL-08": "Output 1" },
    { "RTL-02": "Uraian kegiatan 2", ... }
  ]
}
```
`RTL-01` (No Kegiatan) tidak dikirim, backend isi otomatis sesuai urutan
array. Satu OPD boleh kirim beberapa kegiatan sekaligus, jadi beberapa baris.

Balasan:
```json
{
  "ok": true,
  "data": {
    "rows": [ { "idIsian": "uuid-1", "kodeReferensi": "RTL-DINAS-...-20260917", "timestamp": "..." }, ... ],
    "file": { "fileName": "RTL_DINAS-...-20260917.xlsx", "base64": "..." }
  }
}
```
`file.base64` adalah isi file Excel rekap kegiatan yang baru disubmit, untuk
didownload peserta FGD saat itu juga. Tidak tersimpan di server, cuma
sekali kirim. Contoh trigger download di browser:
```javascript
function downloadBase64Xlsx(fileName, base64) {
  var byteChars = atob(base64);
  var byteNumbers = new Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  var blob = new Blob([new Uint8Array(byteNumbers)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

## Error format

Semua kegagalan (GET atau POST) balik dengan status 200 tapi `ok: false`:
```json
{ "ok": false, "error": "pesan error" }
```
Frontend selalu cek `ok` dulu, jangan andalkan HTTP status code.

## Alur dropdown yang disarankan

**B1 / B2**: Provinsi -> Kab/Kota -> Sekolah (NPSN ikut otomatis, read-only)
-> field manual (Nama Responden, Jabatan Responden, Nama Petugas
Pewawancara, Instansi Petugas, dropdown dari `getPetugas` + opsi Lainnya) ->
render pertanyaan dari `getPertanyaan` sesuai instrumen -> kumpulkan semua
jawaban -> submit sekali di akhir.

**RTL**: Provinsi -> field manual Nama OPD, Alamat OPD -> daftar kegiatan
(bisa tambah baris berkali-kali di form) -> submit sekali -> download Excel
otomatis dari balasan.
