# Goals & Milestones — Mentari Mod Modern Edition

## 1. Vision
Menjadikan Mentari Mod Modern Edition sebagai asisten belajar daring terlengkap, paling andal, dan teraman bagi seluruh mahasiswa Universitas Pamulang, dengan integrasi AI cerdas dan sistem otomatisasi yang menghormati etika serta aturan perkuliahan.

## 2. Milestone History & Roadmap

### Milestone 1: Fondasi & Modern UI Overhaul (v2.0) — SELESAI
- [x] Migrasi arsitektur ke Google Chrome Extensions Manifest V3.
- [x] Perombakan antarmuka menjadi Modern Edition dengan kartu modular, dark mode, dan tab navigasi terpadu.
- [x] Integrasi token sniffer otomatis (`main-sniffer.js`).
- [x] Integrasi Google Gemini API multi-key manager.

### Milestone 2: Evaluasi & Prasyarat Cerdas (v2.1) — SELESAI
- [x] Overhaul Tab Kuis & Evaluasi: Filter pill semantik (`Semua`, `Siap Dikerjakan`, `Tertahan Prasyarat`, `Sudah Selesai`).
- [x] Penentu status prasyarat bertingkat (Deteksi akurat forum belum dijawab vs forum belum dibuka dosen).
- [x] Engine Auto-Pilot Kuis & Evaluasi sekuensial dengan preferensi `Auto Ya` / `Auto Tidak`.
- [x] Real-time sweep kuesioner pasca penyelesaian batch post-test tanpa reset sesi.
- [x] Eliminasi delay inferensi AI melalui pemetaan model transparan (`resolveUpstreamModel`) ke engine `gemini-2.5-flash`.
- [x] Ekspor jawaban forum dan tugas ke format Markdown dan Microsoft Word (DOCX).
- [x] Perbaikan anomali kuesioner hilang pada antrean (8 Post-Test vs 8 Kuesioner berimbang).
- [x] Perbaikan crash `ReferenceError: waitingForumInCourse is not defined`.
- [x] Perbaikan bug input API Key terblokir Material UI `FocusTrap` pada halaman `/login` akun fresh (`apiKeyManager.js` & `token.js`).
- [x] Rebranding ikon orisinal (kombinasi aksen UNPAM + Mentari yang simpel & elegan, menggantikan seluruh ikon author lama).
- [x] Tema adaptif otomatis OS/browser (`prefers-color-scheme`) di seluruh modul serta layar sambutan pemasangan awal (`once-only`).
- [x] Pengemasan build `.zip` otomatis (`dist/`) dan penerbitan GitHub Release resmi `v2.1.1` (Source Code + Extension `.zip`).

### Milestone 3: Fitur Lanjutan (v2.2 & Roadmap) — RENCANA
- [ ] Deteksi cerdas batas waktu pengumpulan tugas kuliah mandiri (Assignment Deadline Reminder).
- [ ] Fitur preview dokumen materi kuliah (PDF/PPT) langsung di dalam modal tanpa download berulang.
- [ ] Peningkatan personalisasi gaya bahasa mahasiswa pada generator draf forum diskusi.
