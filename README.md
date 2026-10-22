# TourLang v2

Versi kedua TourLang dengan tampilan obrolan. Data dan cara membaca sheet sama persis dengan TourLang (v1); yang berubah hanya tampilannya.

- **Satu hari = satu halaman.** Geser kiri-kanan untuk pindah hari, scroll ke bawah untuk melihat agenda hari itu.
- **Satu agenda = satu bubble chat**, urut jam:
  - kiri, dengan avatar ikon: tempat yang didatangi (wisata, makan, hotel, belanja, acara)
  - kanan, berwarna: naik kendaraan (kereta biru tua, bus oranye, pesawat biru langit)
  - kanan, hijau muda dan kecil: jalan kaki
- Garis merah **Sekarang** menandai posisi waktu hari ini, dan app langsung membuka ke situ.
- Jeda lebih dari 45 menit tampil sebagai pesan "Waktu bebas".
- Agenda yang sudah lewat memudar dengan centang dua, seperti pesan terbaca.
- Tombol di bawah bubble (Navigasi, Lihat tiket, Baca sejarah, Booking) seperti balasan cepat di aplikasi chat.
- Strip tanggal di bawah untuk lompat ke hari mana saja; ketuk tanggal di atas untuk kalender.

Kode akses dan data simpanan memakai kunci yang sama dengan v1, jadi kalau v1 dan v2 dibuka di domain yang sama, kode cukup diketik sekali.

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, PWA (bisa dipasang di layar utama dan tetap jalan offline).

## 1. Pasang endpoint di Google Sheet

1. Buka spreadsheet TourLang, pilih **Extensions > Apps Script**.
2. Hapus isi `Code.gs`, tempel isi file `apps-script/Code.gs` dari project ini, lalu simpan.
3. (Disarankan) **Project Settings > Script properties > Add script property**: `API_KEY` dengan nilai acak, misalnya `tourlang-7x9k2`.
4. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Izinkan akses saat diminta.
5. Salin URL yang berakhiran `/exec`.

Setiap kali `Code.gs` diubah, pilih **Deploy > Manage deployments > Edit > Version: New version** supaya URL-nya tetap sama.

`API_KEY` hanya penghalang ringan, karena kuncinya ikut terbawa di file JavaScript web app. Jangan taruh data rahasia (nomor kartu, paspor) di tab yang dikirim.

## 2. Jalankan di komputer

```bash
cp .env.example .env      # isi VITE_SHEET_API dan VITE_SHEET_KEY
npm install
npm run dev
```

Untuk mencoba tampilan di tanggal tertentu, tambahkan `?now=` di URL, misalnya `http://localhost:5173/?now=2026-11-07T10:58`.

## 3. Online-kan

Paling mudah lewat Vercel atau Netlify: hubungkan repo, build command `npm run build`, output `dist`, lalu isi `VITE_SHEET_API` dan `VITE_SHEET_KEY` di pengaturan Environment Variables. Buka link-nya di HP, lalu **Tambahkan ke Layar Utama**.

## Cara app membaca sheet

Tidak ada data trip yang ditulis di kode. Semua diambil dari tab berikut:

- **rundown**: satu baris = satu kartu. Kolom yang dipakai: tanggal, mulai, selesai, kategori, kegiatan, tempat, keterangan, gmaps, kota, link tiket, booking, status.
- **perjalanan**: dicocokkan dengan rundown lewat **link tiket** (file Drive yang sama). Dari sini diambil kota asal-tujuan dan jam di boarding pass.
- **penginapan**: dicocokkan lewat **tanggal malam menginap + kota**. Kegiatan sebelum jam 12 siang dianggap bagian dari malam sebelumnya (sarapan, cek out), kecuali kotanya berbeda (baru tiba, titip koper). Nama hotel ditulis `Nama Hotel (Tipe kamar)`. Kalau kolom nama kosong, kartu tampil sebagai hotel belum dipesan.
- **acara**: dicocokkan lewat **tanggal + jam** (jam mulai kegiatan rundown ada di antara mulai dan selesai acara). Kolom foto, sumber foto, dan sejarah dipakai kartu pos.
- **catatan**: Deutschlandticket diambil dari baris yang kolom *cara bayar*-nya menyebut Deutschlandticket. Transport kota (metro, tram, kereta lokal) diambil dari baris yang kolom *kota*-nya memuat nama kota itu.
- **segmen** (opsional, tab baru): rute per kereta untuk tiket yang ada transitnya. Kolom: `perjalanan id`, `urutan`, `kereta`, `dari`, `peron`, `berangkat`, `ke`, `peron tiba`, `tiba`, `gerbong/kursi`. Waktu transit dan pindah peron dihitung otomatis.

Status yang muncul di kartu hanya yang perlu ditindaklanjuti (misalnya belum dipesan, reservasi, pesan online). Status `fix` dan `Deutschlandticket` tidak ditampilkan.

### Kolom opsional di rundown

Kalau tebakan otomatis kurang pas, tambahkan kolom ini di rundown. Nilainya akan dipakai menggantikan tebakan:

- `dari`, `ke`: kota/tempat asal dan tujuan di kartu tiket
- `moda`: label kendaraan, misalnya `RE 1 + RB 11`
- `aksi`: stempel di kartu hotel, misalnya `Cek in`, `Titip koper`

## Struktur folder

```
apps-script/Code.gs        endpoint Google Sheet
src/lib/sheet.ts           ambil data + simpan cadangan offline
src/lib/build.ts           baris sheet → hari dan kartu
src/lib/position.ts        "sedang berlangsung", "24 menit lagi", posisi sekarang
src/lib/time.ts            tanggal dan jam (zona Europe/Berlin)
src/hooks/useTrip.ts       muat data, refresh tiap 10 menit dan saat app dibuka lagi
src/components/TripView.tsx  layar utama
src/components/Deck.tsx      tumpukan kartu + geser
src/components/Minimap.tsx   deretan ikon kegiatan hari ini
src/components/DayPicker.tsx kalender trip
src/components/TicketSheet.tsx panel tiket
src/components/cards/*       enam bentuk kartu
```
