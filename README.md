<div align="center">
  <img src="./src/assets/icon.png" width="128" alt="Mentari Mod Modern Edition Logo">
  
  # MENTARI MOD - Modern Edition v2.1.3
  ### *Asisten Pembelajaran Daring Cerdas & Terpadu LMS Universitas Pamulang*
  
  [![Version](https://img.shields.io/badge/version-2.1.3-blue?style=for-the-badge)](https://github.com/Abubkr12/Mentari-Unpam/releases/latest)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-amber?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
  [![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

  **[Unduh Rilis Ekstensi (.zip) di GitHub Releases](https://github.com/Abubkr12/Mentari-Unpam/releases/latest)** | **[Mirror Resmi GitLab Releases](https://gitlab.com/Abubkr12/mentari-unpam/-/releases)**
</div>

---

## Tentang Mentari Mod Modern Edition

**Mentari Mod Modern Edition** adalah browser extension berbasis Manifest V3 yang dirancang untuk mengoptimalkan pengalaman mahasiswa Universitas Pamulang pada portal LMS [mentari.unpam.ac.id](https://mentari.unpam.ac.id). Ekstensi ini menggabungkan dasbor manajemen perkuliahan satu pintu, sistem pelacak prasyarat evaluasi akademik bertingkat, tema adaptif terpadu (Light/Dark mengikuti browser atau OS) di dasbor maupun kartu/HUD Kuis dan Kuesioner, serta otomatisasi pengerjaan kuis dan kuesioner berbasis kecerdasan buatan Google Gemini.

---

## Panduan Antarmuka & Fitur Utama (Interface Guide)

### 1. Sambutan Awal & Tema Adaptif Terpadu
- **Tema Adaptif**: Saat pertama kali dipasang, tampilan ekstensi otomatis menyesuaikan mode warna sistem/browser Anda (Terang atau Gelap), dan dapat diganti kapan saja di header dasbor. Tema Light/Dark ini juga tersinkronisasi penuh ke kartu kontrol manual dan HUD Auto-Pilot pada halaman Kuis maupun Kuesioner/QuickSurvey, lengkap dengan tombol minimize dan tutup.
- **Sambutan Pemasangan Awal (Once-Only)**: Panduan singkat interaktif saat pemasangan pertama sebelum konfigurasi API Key Gemini (otomatis tidak muncul lagi setelah selesai dikonfigurasi).

### 2. Tombol Pemicu Melayang (Floating Action Button / FAB)
- Terletak di pojok halaman portal Mentari serta di bilah navigasi atas.
- Berfungsi sebagai tombol pintas instan untuk membuka Dasbor Utama Mentari Mod tanpa perlu beralih halaman (langsung aktif setelah login SPA tanpa perlu refresh).

### 3. Tab Kuis & Evaluasi (Evaluation Matrix Hub)
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

### 4. Modal Auto-Pilot Kuis & Evaluasi
Fitur otomatisasi sekuensial cerdas untuk menyelesaikan evaluasi tanpa hambatan manual:
- **Preferensi Kuesioner Dosen & Kontrol Thinking Level**:
  - Tombol pilihan `Auto Ya` (opsi Sangat Baik/Positif) atau `Auto Tidak` (opsi evaluatif), serta pemilih `Thinking Level` dinamis sesuai kapasitas tiap model Gemini.
- **Pratinjau Antrean Eksekusi (Queue Preview)**:
  - Menampilkan urutan pengerjaan kuis secara sekuensial (Pre-Test -> Post-Test -> Kuesioner) dengan label dependensi `Syarat Terpenuhi` atau `Setelah Post-Test Selesai`.
- **Auto-Koreksi Error 3-Sumber**:
  - Memverifikasi keterpilihan radio, alert/snackbar DOM situs, dan kegagalan respons AI sebelum submit; soal gagal dicatat otomatis dan disapu ulang dari nomor terendah sehingga jawaban fallback tidak terkirim tanpa verifikasi.
- **Kontrol HUD & Kartu Kuis/Kuesioner**:
  - Panel kontrol manual dan HUD Auto-Pilot pada halaman Kuis maupun Kuesioner mendukung tema Light/Dark terpadu, posisi aman dari Toast, tombol minimize ke bar ringkas, serta tombol tutup/jeda yang konsisten.
- **Real-Time Kuesioner Sweep**:
  - Begitu batch post-test selesai, Auto-Pilot secara otomatis memindai dan membuka antrean kuesioner dosen tanpa menghentikan sesi.

### 5. Tab Forum Aktif & Rekap Tugas Selektif
- Memantau seluruh forum diskusi terbuka dari setiap mata kuliah.
- **AI Response Drafter**: Menghasilkan draf jawaban akademik berkualitas tinggi berdasarkan materi modul perkuliahan.
- **Ekspor Rekap Forum Selektif & Prioritas (`.docx` / `.md` / Clipboard)**: Memilih forum yang diinginkan, mengatur urutan prioritas mata kuliah maupun pertemuan, lalu mengekspor ke format Microsoft Word (`.docx`) dan Markdown terstruktur.

### 6. Tab Pengaturan & AI Engine
- **Multi-Key Pool Manager**: Memasukkan beberapa Google Gemini API Key sekaligus dengan mekanisme rotasi otomatis saat kuota limit tercapai.
- **Thinking Level Dinamis per Model**: Menyesuaikan opsi reasoning (`minimal`, `low`, `medium`, `high`, `xhigh`) secara otomatis mengikuti spesifikasi model yang aktif.
- **Kunci Kuota Model Ketat & Toggle Fallback**: Menjaga agar model cadangan tidak dipanggil diam-diam saat model pilihan utama timeout, dengan opsi toggle fallback otomatis bila diperlukan.
- **Humanizer Delay**: Mengatur jeda waktu acak pengerjaan kuis untuk mensimulasikan pola perilaku manusia alami.

---

## Panduan Instalasi (Step-by-Step)

### Opsi A: Dari Paket Rilis Resmi (`.zip`) - Direkomendasikan
1. Buka halaman [GitHub Releases](https://github.com/Abubkr12/Mentari-Unpam/releases/latest) atau [GitLab Releases](https://gitlab.com/Abubkr12/mentari-unpam/-/releases) dan unduh file **`Mentari-Unpam-v2.1.3-extension.zip`**.
2. Ekstrak file `.zip` tersebut ke sebuah folder permanen di komputer Anda (misal `C:\Extensions\Mentari-Unpam`).
3. Buka browser Chromium (Chrome/Edge/Brave) lalu ketik `chrome://extensions/` di address bar.
4. Nyalakan toggle **"Developer mode"** (Mode pengembang) di pojok kanan atas.
5. Klik tombol **"Load unpacked"** di pojok kiri atas, lalu pilih folder hasil ekstraksi tadi (folder yang berisi `manifest.json`).

### Opsi B: Build dari Source Code (Pengembang)
1. Clone repository (GitHub atau mirror resmi GitLab) dan install dependensi:
   ```bash
   git clone https://github.com/Abubkr12/Mentari-Unpam.git
   # atau mirror GitLab:
   # git clone https://gitlab.com/Abubkr12/mentari-unpam.git
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
- **Original Creator (Upstream)**: [Lukman Muludin](https://gitlab.com/lukman754) ([lukman754/mentari-unpam](https://gitlab.com/lukman754/mentari-unpam))
- **Modern Edition Overhaul & Maintainer**: [Abu Bakar Al Adny](https://github.com/Abubkr12) ([GitHub: Abubkr12/Mentari-Unpam](https://github.com/Abubkr12/Mentari-Unpam) | [GitLab Mirror: Abubkr12/mentari-unpam](https://gitlab.com/Abubkr12/mentari-unpam))

Dilisensikan di bawah [MIT License](LICENSE).
