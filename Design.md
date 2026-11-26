# Design & UI/UX Specification — Mentari Mod Modern Edition v2.1

## 1. Design Philosophy
Mentari Mod Modern Edition mengusung gaya antarmuka **Modern Clean SaaS** yang dirancang menyatu dengan ekosistem MENTARI UNPAM tanpa terasa asing. Desain menghindari ornamen berlebihan, tidak menggunakan alert default browser, dan mengutamakan tipografi yang mudah dibaca, kontras warna yang nyaman, serta layout modular berbasis kartu (card-based bento layout).

## 2. Design System & Tokens

### 2.1. Color Palette
- **Primary Accent**: Amber / Warm Gold (`#f59e0b`, `#d97706`) — Melambangkan identitas "Mentari" (matahari/hangat).
- **Success / Completed**: Emerald Green (`#10b981`, `#059669`, background `#ecfdf5`) — Status selesai dan siap dikerjakan.
- **Warning / Pending Prerequisites**: Warm Amber (`#f59e0b`, `#b45309`, background `#fffbeb`) — Status tertahan forum atau prasyarat.
- **Neutral Backgrounds**:
  - Light Mode Card: `#ffffff`
  - Modal Backdrop: `rgba(15, 23, 42, 0.45)` dengan backdrop-blur 6px.
  - Border Subtil: `#e2e8f0` (slate-200).
- **Text Hierarchy**:
  - Primary Title: `#0f172a` (slate-900)
  - Secondary Text: `#475569` (slate-600)
  - Muted Label: `#94a3b8` (slate-400)

### 2.2. Typography
- Font Family: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- Scale:
  - Header Modal: `1.25rem (20px)`, font-weight 700.
  - Card Title: `0.95rem (15px)`, font-weight 600.
  - Body & Badges: `0.8125rem (13px)`, font-weight 500.
  - Sub-labels & Timestamps: `0.75rem (12px)`, font-weight 400.

## 3. Core Interface Components

### 3.1. Floating Action Trigger (FAB)
- Terletak di sudut halaman portal Mentari.
- Berbentuk lingkaran elegan dengan aksen gradien halus dan ikon api/cahaya khas Mentari.
- Memberikan akses cepat membuka modal utama dari halaman kuliah mana saja.

### 3.2. Modal Utama (Modern Edition Hub)
- **Header**:
  - Branding: Logo Mentari Mod bertuliskan badge "Modern Edition".
  - Quick Controls: Dark/light mode toggle dan tombol close modal.
- **Tab Navigasi Utama**:
  1. **Forum Aktif**: Tampilan kartu forum diskusi yang sedang berlangsung dengan indikator batas waktu, filter pencarian, dan ekspor Rekap Tugas (.docx dan .md).
  2. **Kuis & Evaluasi**: Matriks evaluasi terlengkap yang memilah kuis siap dikerjakan versus kuis yang tertahan prasyarat, serta badge nilai dan durasi pengerjaan untuk kuis yang telah selesai.
  3. **Mata Kuliah**: Kartu ringkasan dengan metadata SKS/Hari/Kelas, progress bar pertemuan monotonik, accordion per pertemuan, unduhan langsung materi (PPT, buku, video, tugas), serta inline notice saat pertemuan masih kosong.
  4. **Mahasiswa**: Direktori teman sekelas unik tanpa duplikasi NIM lintas mata kuliah, lengkap dengan filter mata kuliah, pencarian nama/NIM, panel detail daftar mata kuliah per mahasiswa, dan salin daftar.
  5. **Pengaturan**: Panel pengelolaan API Key Gemini, pemilihan model AI, Thinking Level, dan parameter humanizer.

### 3.3. Dashboard Kuis & Evaluasi
- **Filter Pills Bar**:
  - `Semua [Total]`: Menampilkan seluruh evaluasi pada semester berjalan.
  - `Siap Dikerjakan [Count]`: Menampilkan hanya item yang seluruh prasyaratnya telah terpenuhi dan siap diklik `Kerjakan`.
  - `Tertahan Prasyarat [Count]`: Menampilkan item yang belum bisa dikerjakan karena terganjal forum diskusi atau pre-test.
  - `Sudah Selesai [Count]`: Menampilkan item yang telah tuntas.
- **Counter Metrik (Stats Summary Bar)**:
  - Kotak angka informatif yang memaparkan:
    - `Siap Dikerjakan` (Warna Hijau)
    - `Tertahan Forum` (Warna Amber)
    - `Pre-Test` (Format Progres Selesai/Total)
    - `Post-Test` (Format Progres Selesai/Total)
    - `Kuesioner` (Format Progres Selesai/Total)
- **Accordion Mata Kuliah**:
  - Tiap mata kuliah dapat dibuka/ditutup (expand/collapse) dengan tombol `Buka Semua`.
  - Header kartu mata kuliah menampilkan badge total item atau badge `Selesai Semua` jika 100% item telah tuntas.
- **Kartu Item Evaluasi**:
  - Tipe kuis (Pre-Test, Post-Test, Kuesioner) dengan warna semantik masing-masing.
  - Judul pertemuan dan deskripsi status.
  - Tombol aksi kontekstual:
    - Tombol `Kerjakan` (Aktif / Hijau) jika status `READY`.
    - Tombol `Jawab Forum` (Amber) jika terganjal forum yang belum dijawab.
    - Tombol `Belum Dibuka` (Disabled / Abu-abu) jika dosen belum membuka forum.
    - Tombol `Menunggu Post-Test` (Disabled / Slate) pada kuesioner yang menunggu post-test.
    - Tombol `Selesai` (Hijau Terang) jika telah selesai.

### 3.4. Modal Auto-Pilot Kuis & Evaluasi
- **Header Preferensi Kuesioner**:
  - Pilihan radio card besar: `Auto Ya` (opsi jawaban positif) dan `Auto Tidak` (opsi jawaban kritis/kurang).
- **Pratinjau Antrean Eksekusi (Queue Preview Box)**:
  - Menampilkan daftar sekuensial seluruh item yang akan dieksekusi secara otomatis.
  - Badge dependensi: `Syarat Terpenuhi` untuk item yang siap, dan `Setelah Post-Test Selesai` untuk kuesioner yang akan menyusul pasca post-test.
- **Kotak Peringatan Prasyarat (Warning Box)**:
  - Wadah bernuansa merah muda halus yang mencantumkan secara transparan daftar post-test yang sengaja dilewati berikut alasannya (misal: forum belum dibuka dosen).
- **Tombol Eksekusi**:
  - Tombol aksi primer `Mulai Auto-Pilot` dan tombol pembatalan `Batal`.
