<div align="center">
  <img src="./src/assets/icon.png" width="128" alt="Mentari Mod Modern Edition Logo">
  
  # MENTARI MOD — Modern Edition v2.1.1
  ### *Asisten Pembelajaran Daring Cerdas & Terpadu LMS Universitas Pamulang*
  
  [![Version](https://img.shields.io/badge/version-2.1.1-blue?style=for-the-badge)](https://github.com/Abubkr12/Mentari-Unpam/releases/latest)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-amber?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
  [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

  **[Unduh Rilis Ekstensi (.zip) & Source Code Terbaru](https://github.com/Abubkr12/Mentari-Unpam/releases/latest)**
</div>

---

## Tentang Mentari Mod Modern Edition

**Mentari Mod Modern Edition** adalah browser extension berbasis Manifest V3 yang dirancang untuk mengoptimalkan pengalaman mahasiswa Universitas Pamulang pada portal LMS [mentari.unpam.ac.id](https://mentari.unpam.ac.id). Ekstensi ini menggabungkan dasbor manajemen perkuliahan satu pintu, sistem pelacak prasyarat evaluasi akademik bertingkat, tema adaptif otomatis (Light/Dark mengikuti browser atau OS), serta otomatisasi pengerjaan kuis dan kuesioner berbasis kecerdasan buatan Google Gemini.

---

## Panduan Antarmuka & Fitur Utama (Interface Guide)

### 1. Sambutan Awal & Tema Adaptif Otomatis
- **Tema Adaptif**: Saat pertama kali dipasang, tampilan ekstensi otomatis menyesuaikan mode warna sistem/browser Anda (Terang atau Gelap), dan dapat diganti kapan saja di header dasbor.
- **Sambutan Pemasangan Awal (Once-Only)**: Panduan singkat interaktif saat pemasangan pertama sebelum konfigurasi API Key Gemini (otomatis tidak muncul lagi setelah selesai dikonfigurasi).

### 2. Tombol Pemicu Melayang (Floating Action Button / FAB)
- Terletak di pojok halaman portal Mentari serta di bilah navigasi atas.
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

## Panduan Instalasi (Step-by-Step)

### Opsi A: Dari Paket Rilis Resmi (`.zip`) — Direkomendasikan
1. Buka halaman [Releases](https://github.com/Abubkr12/Mentari-Unpam/releases/latest) dan unduh file **`Mentari-Unpam-v2.1.1-extension.zip`**.
2. Ekstrak file `.zip` tersebut ke sebuah folder permanen di komputer Anda (misal `C:\Extensions\Mentari-Unpam`).
3. Buka browser Chromium (Chrome/Edge/Brave) lalu ketik `chrome://extensions/` di address bar.
4. Nyalakan toggle **"Developer mode"** (Mode pengembang) di pojok kanan atas.
5. Klik tombol **"Load unpacked"** di pojok kiri atas, lalu pilih folder hasil ekstraksi tadi (folder yang berisi `manifest.json`).

### Opsi B: Build dari Source Code (Pengembang)
1. Clone repository dan install dependensi:
   ```bash
   git clone https://github.com/Abubkr12/Mentari-Unpam.git
   cd Mentari-Unpam
   npm install
   ```
2. Jalankan build (atau buat sekaligus paket `.zip` rilis):
   ```bash
   npm run build
   # atau untuk menghasilkan bundle + zip di folder release/
   npm run release
   ```
3. Pada `chrome://extensions/` (Developer mode aktif), klik **"Load unpacked"** lalu pilih folder **`dist/`** di dalam direktori proyek Anda.

---

## Tech Stack & Arsitektur
- **Platform**: Chrome Extensions Manifest V3
- **Bundler & Packager**: esbuild + JSZip
- **AI Core**: Google Gemini Generative Language API
- **Document Exporter**: `docx` library & custom markdown parser
- **State Engine**: Chrome Storage Local API & Adaptive Theme Listener

---

## Lisensi & Kontributor
- **Original Creator (Upstream)**: [Lukman Muludin](https://github.com/lukman754) ([lukman754/Mentari-Unpam](https://github.com/lukman754/Mentari-Unpam))
- **Modern Edition Overhaul & Maintainer**: [Abu Bakar Al Adny](https://github.com/Abubkr12) ([Abubkr12/Mentari-Unpam](https://github.com/Abubkr12/Mentari-Unpam))

Dilisensikan di bawah [MIT License](LICENSE).
