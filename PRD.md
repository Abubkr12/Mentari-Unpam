# Product Requirements Document (PRD) — Mentari Mod Modern Edition v2.1

## 1. Executive Summary
Mentari Mod Modern Edition adalah browser extension berbasis Manifest V3 yang dirancang untuk mengoptimalkan efisiensi, akurasi, dan otomatisasi pembelajaran daring mahasiswa pada portal LMS Universitas Pamulang (MENTARI - mentari.unpam.ac.id). Versi 2.1 membawa perombakan menyeluruh pada arsitektur antarmuka, engine sinkronisasi kuis dan evaluasi berkala (Auto-Pilot), serta integrasi AI penalaran akademik berbasis Google Gemini API.

## 2. Problem Statement
1. **Fragmentasi Navigasi LMS**: Mahasiswa harus membuka puluhan tab dan memeriksa setiap pertemuan secara manual untuk mengetahui forum diskusi, pre-test, post-test, dan kuesioner evaluasi dosen yang belum selesai.
2. **Ketergantungan Prasyarat Berantai (Prerequisites Chain)**: Pada LMS Mentari, kuesioner terkunci sebelum post-test diselesaikan; post-test terkunci sebelum forum diskusi/pre-test dipenuhi. Mahasiswa kerap mengalami kebingungan membedakan mana kuis yang siap dikerjakan langsung versus kuis yang tertahan oleh status forum diskusi.
3. **Anomali Evaluasi Dosen**: Kuisioner sering kali terlewat atau tidak terjadwal otomatis dalam antrean karena inkonsistensi penamaan template LMS (`EVALUASI_PEMBELAJARAN`, `EDOM`, `KUESIONER`) atau adanya peringatan warning alert bawaan database LMS.
4. **Ketidakpastian Kualitas Pengerjaan Kuis**: Pengerjaan kuis otomatis konvensional rentan salah pilih jawaban jika format soal berbelit, atau menimbulkan delay berulang akibat pemanggilan model AI yang tidak kompatibel.

## 3. Product Vision & Target Audience
- **Target Pengguna**: Mahasiswa aktif Universitas Pamulang yang menggunakan portal MENTARI.
- **Nilai Utama**: Transparansi progres perkuliahan dalam satu dasbor terpadu, otomatisasi cerdas yang menghormati aturan prasyarat akademik, dan akurasi tinggi tanpa risiko deteksi bot.

## 4. Scope & Features (MVP to v2.1)

### 4.1. Core Module Matrix
- **Token Sniffer Engine**: Intersepsi otomatis token otorisasi Bearer dari sesi aktif browser (`main-sniffer.js`), disimpan aman di storage lokal untuk request API internal UNPAM.
- **Dasbor Modern Multi-Tab**:
  - *Tab Forum Aktif*: Agregasi seluruh forum diskusi terbuka, pemantauan status respons mahasiswa, generator draf respons akademik, serta eksportir dokumen (DOCX & Markdown).
  - *Tab Kuis & Evaluasi*: Dasbor pemantauan komprehensif seluruh Pre-Test, Post-Test, dan Kuesioner dengan filter status berjenjang.
  - *Tab Mata Kuliah*: Direktori semester berjalan lengkap dengan status kehadiran dan rekapitulasi nilai.
  - *Tab Pengaturan*: Manajemen pool multi-API-key Gemini, seleksi model inferensi, konfigurasi delay humanizer, dan toggle preferensi.
- **Sistem Klasifikasi Status Kuis & Prasyarat (Ladder Determination)**:
  - `DONE`: Item telah diselesaikan di LMS.
  - `READY`: Siap dikerjakan langsung (seluruh prasyarat terpenuhi).
  - `WAITING_FORUM`: Forum diskusi pada pertemuan terkait belum dijawab oleh mahasiswa (disediakan tautan langsung untuk menjawab).
  - `FORUM_NOT_OPEN`: Dosen belum membuat atau membuka thread forum diskusi pada pertemuan tersebut.
  - `WAITING_PRETEST`: Memerlukan penyelesaian Pre-Test terlebih dahulu.
  - `WAITING_POSTTEST`: Kuesioner menunggu penyelesaian Post-Test pada pertemuan terkait.
  - `LMS_LOCKED`: Terkunci karena aturan tanggal atau jadwal akademik LMS.
- **Engine Auto-Pilot Kuis & Evaluasi**:
  - Penjadwalan cerdas dengan eksekusi sekuensial (Pre-Test -> Post-Test -> Kuesioner).
  - Preferensi Kuesioner Dosen (`Auto Ya` / `Auto Tidak`).
  - Real-Time Sweep Kuesioner: Pengecekan otomatis pembukaan kunci kuesioner secara berkala pasca post-test terselesaikan tanpa menghentikan sesi Auto-Pilot.
  - Safeguard Prasyarat: Otomatis mendeteksi dan melewati item yang belum memenuhi prasyarat forum/pretest agar tidak terjadi loop kegagalan di LMS.
- **AI Academic Solver (Gemini Integration)**:
  - Dukungan model Gemini 2.5 Flash dengan pemetaan alias transparan (mencegah error 404).
  - Multi-Key Round Robin dengan auto-failover jika terjadi rate limit.
  - Prompt akademik tingkat lanjut untuk eliminasi distraktor dan bias opsi.
  - Humanizer Delay: Variasi jeda waktu acak menyerupai pola interaksi manusia saat mengerjakan soal kuis.

## 5. Success Metrics
1. **Akurasi Kuis**: Tingkat keberhasilan nilai kuis rata-rata mencapai 100% pada evaluasi objektif.
2. **Kelengkapan Antrean Auto-Pilot**: 100% kuis dan kuesioner yang memenuhi syarat terproses secara lengkap tanpa ada item yang tertinggal atau salah terdeteksi selesai.
3. **Efisiensi Waktu**: Pemangkasan waktu penelusuran forum dan evaluasi dari 15–20 menit manual menjadi hitungan detik di dasbor terpadu.
4. **Stabilitas Ekstensi**: Nol uncaught reference error dan nol request leak di konsol ekstensi.
