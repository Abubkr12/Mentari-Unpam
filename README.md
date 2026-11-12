<div align="center">
  <img src="https://github.com/user-attachments/assets/bc206a62-4b37-4064-a1af-872e7a157463" width="160" alt="MENTARI Logo">
  
  # MENTARI MOD — Modern Edition v2.1
  ### *Asisten Pembelajaran Daring Cerdas & Terpadu LMS Universitas Pamulang*
  
  [![Version](https://img.shields.io/badge/version-2.1.0-orange?style=for-the-badge)](https://github.com/Abubkr12/Mentari-Unpam)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
  [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
</div>

---

## 📖 Tentang Mentari Mod Modern Edition

**Mentari Mod Modern Edition** adalah browser extension berbasis Manifest V3 yang merevolusi cara mahasiswa Universitas Pamulang berinteraksi dengan portal LMS [mentari.unpam.ac.id](https://mentari.unpam.ac.id). Ekstensi ini menggabungkan dasbor manajemen perkuliahan satu pintu, sistem pelacak prasyarat evaluasi akademik bertingkat, serta otomatisasi pengerjaan kuis dan kuesioner berbasis kecerdasan buatan Google Gemini.

---

## 🖥️ Panduan Antarmuka & Fitur Utama (Interface Guide)

### 1. Tombol Pemicu Melayang (Floating Action Button / FAB)
- Terletak di pojok halaman portal Mentari.
- Berfungsi sebagai tombol pintas instan untuk membuka Dasbor Utama Mentari Mod tanpa perlu beralih halaman.

### 2. Tab Kuis & Evaluasi (Evaluation Matrix Hub)
Tab ini dirancang khusus untuk mengurai kebingungan mahasiswa terkait kuis dan kuesioner yang belum selesai:
- **Filter Pills Cerdas**:
  - `Semua`: Menampilkan seluruh evaluasi semester berjalan.
  - `Siap Dikerjakan`: Memfilter hanya kuis yang seluruh prasyaratnya telah terpenuhi dan siap dikerjakan langsung.
  - `Tertahan Prasyarat`: Mengisolasi item yang belum dapat dikerjakan karena terhalang prasyarat (forum belum dijawab, forum belum dibuka dosen, atau menunggu pre-test/post-test).
  - `Sudah Selesai`: Menampilkan arsip evaluasi yang telah tuntas 100%.
- **Kartu Metrik Ringkasan (Stats Counter)**:
  - Kotak angka interaktif yang memaparkan jumlah kuis *Siap Dikerjakan*, *Tertahan Forum*, serta rasio progres *Pre-Test*, *Post-Test*, dan *Kuesioner*.
- **Accordion Mata Kuliah & Badge Semantik**:
  - `Siap Dikerjakan` (Badge Hijau): Tombol pengerjaan aktif.
  - `Menunggu Forum` (Badge Amber): Forum diskusi pertemuan terkait sudah dibuka tetapi belum dijawab mahasiswa. Menyediakan tombol `Jawab Forum` yang langsung membuka tautan forum.
  - `Forum Belum Dibuka` (Badge Slate): Dosen pengampu belum membuat topik diskusi pada pertemuan tersebut.
  - `Menunggu Post-Test` (Badge Indigo): Kuesioner terkunci dan akan aktif otomatis setelah post-test diselesaikan.
  - `Selesai` (Badge Hijau Muda): Item telah tuntas.

### 3. Modal Auto-Pilot Kuis & Evaluasi
Fitur otomatisasi sekuensial cerdas untuk menyelesaikan evaluasi tanpa hambatan manual:
- **Preferensi Kuesioner Dosen**:
  - Tombol pilihan `Auto Ya` (opsi Sangat Baik/Positif) atau `Auto Tidak` (opsi evaluatif).
- **Pratinjau Antrean Eksekusi (Queue Preview)**:
  - Menampilkan urutan pengerjaan kuis secara sekuensial (Pre-Test -> Post-Test -> Kuesioner) dengan label dependensi `Syarat Terpenuhi` atau `Setelah Post-Test Selesai`.
- **Kotak Peringatan Prasyarat**:
  - Menampilkan daftar kuis yang sengaja dilewati berikut alasannya (contoh: forum belum dibuka dosen), sehingga antrean tidak terjebak dalam error loop.
- **Real-Time Kuesioner Sweep**:
  - Begitu batch post-test selesai, Auto-Pilot secara otomatis memindai dan membuka antrean kuesioner dosen tanpa menghentikan sesi.

### 4. Tab Forum Aktif & Generator Dokumen
- Memantau seluruh forum diskusi terbuka dari setiap mata kuliah.
- **AI Response Drafter**: Menghasilkan draf jawaban akademik berkualitas tinggi berdasarkan materi modul perkuliahan.
- **Export DOCX & Markdown**: Mendukung ekspor respons forum atau tugas mandiri ke format Microsoft Word (`.docx`) dan Markdown terstruktur.

### 5. Tab Pengaturan & AI Engine
- **Multi-Key Pool Manager**: Memasukkan beberapa Google Gemini API Key sekaligus dengan mekanisme rotasi otomatis saat kuota limit tercapai.
- **Model Selector**: Terkoneksi ke engine Google Gemini yang stabil dan akurat.
- **Humanizer Delay**: Mengatur jeda waktu acak pengerjaan kuis untuk mensimulasikan pola perilaku manusia alami.

---

## 🚀 Panduan Instalasi (Step-by-Step)

### Prasyarat
- Browser berbasis Chromium: Google Chrome, Microsoft Edge, Brave, atau Opera.
- Node.js (v18 ke atas) jika ingin melakukan kompilasi dari source code.

### Langkah Pemasangan Ekstensi di Chrome

1. **Buka Halaman Ekstensi**:
   - Ketik `chrome://extensions/` di address bar browser Anda lalu tekan Enter.
2. **Aktifkan Mode Pengembang (Developer Mode)**:
   - Nyalakan toggle **"Developer mode"** di pojok kanan atas halaman.
3. **Muat Ekstensi (Load Unpacked)**:
   - Klik tombol **"Load unpacked"** (Muat yang belum dibongkar) di pojok kiri atas.
4. **Pilih Folder `dist/`**:
   - Navigasikan ke direktori proyek lokal Anda dan pilih folder:
     ```
     <lokasi-proyek>/dist
     ```
     *(Contoh pada PC Anda: `c:\Users\Abu Bakar Al Adny\Downloads\Compressed\Mentari-Unpam-v2.0_2\dist`)*
5. **Selesai**:
   - Ekstensi Mentari Mod Modern Edition langsung aktif dan siap digunakan di portal LMS UNPAM.

### Kompilasi Ulang (Jika Mengubah Kode Sumber)
Jika Anda melakukan perubahan pada kode sumber di dalam folder `src/`, jalankan perintah build:
```bash
npm run build
# atau
node build.js
```
Setelah build selesai, cukup klik ikon **Refresh (Reload)** pada kartu ekstensi di `chrome://extensions/`.

---

## 🛠️ Tech Stack & Arsitektur
- **Platform**: Chrome Extensions Manifest V3
- **Bundler**: esbuild (Zero-config ultra-fast JS bundler)
- **AI Core**: Google Gemini Generative Language API
- **Document Exporter**: `docx` library & custom markdown parser
- **State Engine**: Chrome Storage Local API & Event-driven DOM Observers

---

## 📄 Lisensi & Kontributor
- **Original Creator (Upstream)**: [Lukman Muludin](https://github.com/lukman754) ([lukman754/Mentari-Unpam](https://github.com/lukman754/Mentari-Unpam))
- **Modern Edition Overhaul & Maintainer**: [Abu Bakar Al Adny](https://github.com/Abubkr12) ([Abubkr12/Mentari-Unpam](https://github.com/Abubkr12/Mentari-Unpam))

Dilisensikan di bawah [MIT License](LICENSE).
