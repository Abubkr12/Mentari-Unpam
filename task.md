# Task List: Investigasi & Audit Ekstensi Mentari Unpam v2.0

## Aktif / Rencana Mendatang
- [ ] Smart Question Memory: Cache kunci jawaban Pre-Test untuk auto-answer kilat pada Post-Test (durasi adaptif 12–18 detik, hemat kuota 0 token AI)

## Arsip
- [x] Auto-Pilot Kuis (Single-Tab Batch Runner): Otomatisasi pengerjaan maraton Pre-Test dan Post-Test dalam 1 tab browser tanpa spawn tab baru (hemat RAM), modal konfigurasi interaktif, validasi mutlak prasyarat Forum Diskusi sebelum Post-Test (Post-Test otomatis dilewati jika Forum belum selesai/tidak ada), Glassmorphic Floating HUD Tracker di Closed Shadow DOM, auto-start, auto-submit, dan visual countdown inter-quiz cooldown (15 detik anti-bot velocity)
- [x] Multi-API Key Failover Pool: Penyimpanan multi API Key Gemini di storage, validasi format (dukung AQ. & AIza...), UI pengelola multi-key dengan masking presisi, status badge (Utama/Cadangan), tombol jadikan utama & hapus, serta failover rotasi otomatis ke API Key cadangan saat API Key aktif terkena limit kuota / HTTP 429
- [x] Persistensi & Anti-Blank Model Selector: Perbaikan sinkronisasi storage model AI Gemini, proteksi dari overwrite auto-migrasi legacy storage, pre-render active model selected pada Quiz Assistant, auto-fallback ke model valid jika nilai storage korup/usang, dan listener onChanged real-time multi-komponen
- [x] Single-Open Exclusive Accordion Kuis/Evaluasi: Seluruh accordion mata kuliah tertutup secara default saat pertama kali dibuka (all-collapsed); saat satu mata kuliah diklik buka, mata kuliah lain otomatis tertutup sehingga hanya 1 mata kuliah yang aktif terbuka untuk menjaga fokus
- [x] UI/UX Accordion & Pencarian Kuis/Evaluasi: Penataan daftar evaluasi per mata kuliah dengan Accordion collapsible, Search Bar real-time, filter dropdown tipe evaluasi (Pre-Test, Post-Test, Kuesioner), tombol Buka/Tutup Semua, dan proteksi tab tunggal (target=_self) tanpa alert/stock emoji
- [x] Navigasi Tab Tunggal: Menghilangkan target=_blank pada tombol Buka Kelas, Buka Forum, dan Kerjakan Kuis agar langsung terbuka di tab aktif tanpa menumpuk tab baru
- [x] Final verifikasi bundle `dist/`, build 14 module via esbuild, dan sinkronisasi push ke GitHub fork (`main` & `feat/modern-v2-refactor`)
- [x] Auto-Answer Cerdas Kuisioner: 3 mode otomatisasi terintegrasi (Auto Iya/Sangat Baik, Auto Tidak, dan Auto AI dengan Gemini analisis konteks & respon saran)
- [x] Auto Jawab Cerdas Pre-Test & Post-Test: Deteksi instan kunci jawaban yang sudah terbuka/bocor pada DOM sebelum fallback ke Gemini AI berakurasi tinggi
- [x] Penyempurnaan Filter Forum Aktif: Deteksi topik non-kosong via `api/forum/topic/{id}`, filter forum kosong, pengurutan belum dikerjakan, quick filter pills, verifikasi reply mahasiswa >= 2 kotak jawaban
- [x] Implementasi Tab Baru "Kuis & Evaluasi": Pretest, Posttest, Kuisioner Tracker per mata kuliah dengan pembacaan pertemuan dinamis tanpa limit, summary statistik, filter pills, dan tombol Kerjakan navigasi langsung
- [x] Dokumentasikan tautan kontribusi & panduan upstream ke user
- [x] Eksekusi Push ke Fork `Abubkr12/Mentari-Unpam` & Persiapan Kontribusi Pull Request ke `lukman754/Mentari-Unpam`
- [x] Dual Launcher Dashboard (Navbar & Floating): Injeksi header toggle tepat sebelum icon Dark Mode (`parentElement.insertBefore`) bebas DOMException, dilengkapi persistent MutationObserver dan floating launcher button di `bottom: 82px; left: 24px;` (tepat di atas tombol Gemini) dengan tooltip kustom dan SVG flame icon
- [x] Eliminasi Intermiten Error 401 & Token Expiry: Safe Base64URL JWT decoding, validasi `payload.exp * 1000 <= Date.now() + 30000`, pembersihan token kedaluwarsa otomatis dari memory dan storage, serta pencegahan infinite ping-pong loop antara isolated world dan main world (`mentari-token-invalidated`)
- [x] Arsitektur Cache-First & In-Flight Mutex (`token.js`): Data mata kuliah dan forum langsung dirender seketika saat modal dibuka (zero loading delay, zero error flash), isolasi cache per NIM/User ID, dan pembatasan konkurensi fetch detail section/forum (batch concurrency 3) guna mencegah N+1 request explosion
- [x] Koordinasi Visual Gemini Chat: Floating launcher otomatis smooth fade-out saat jendela chat Gemini dibuka dan muncul kembali saat jendela ditutup
- [x] Perbaikan navigasi URL Mata Kuliah & Forum: Mengganti UUID internal enrollment `c.id` dengan `c.kode_course` (contoh `20261-04GSDE003-22GSD0213`) untuk mengeliminasi error `400 Course not found`
- [x] Penyempurnaan Tab Forum Aktif: Query section per mata kuliah (`api/user-course/{kode_course}`) dan deteksi modul forum diskusi serta status penyelesaian
- [x] Upgrade Presensi Tracker MyUnpam: Pengambilan data detail per-pertemuan (`api/presensi/mahasiswa/jadwal-pertemuan/{id_kelas}/{id_mk}`), kalkulasi persentase kehadiran riil, kartu ringkasan mahasiswa (NIM, Nama, Semester, Kehadiran), dan accordion rincian pertemuan
- [x] Kompatibilitas ganda header auth (`Authorization` + `authorization`, `X-XSRF-TOKEN` + `x-xsrf-token`) dan resolusi cerdas path sniffer (`content/` vs `dist/content/`)
- [x] Validasi & verifikasi integrasi `src/content/main-sniffer.js` di konteks `world: MAIN` (run_at: document_start) guna mengatasi HTTP 401 Unauthorized secara permanen
- [x] Validasi pemisahan API Key Manager murni (validasi `AQ.` & `AIza...`) serta ketersediaan model selector on-the-fly di `quiz.js`, `gemini.js`, dan `token.js`
- [x] Audit UI icon: 100% berbasis SVG tanpa stock emoji
- [x] Audit notifikasi: Nol `window.alert()`, migrasi total ke `Toast` utility berbasis Closed Shadow DOM
- [x] Verifikasi konfigurasi build esbuild (`build.js`), pembundelan `dist/`, dan sinkronisasi `dist/manifest.json` serta `manifest.json`
- [x] Setup struktur modular modern (ES6+ clean code, bundler esbuild, kompilasi ke folder `dist/`, ukuran terpangkas ~85%)
- [x] Implementasi Background Service Worker & migrasi storage lokal (`chrome.storage.local` 100% offline di laptop user, nol telemetri luar)
- [x] Implementasi Universal Gemini API Key Validator (dukungan Auth Key `AQ.` & `AIza...`) + Selector 9 Model Generasi Baru dari `AI Limitation.xlsx` (Gemini 2.5 Flash, 2.5 Flash Lite, 3 Flash, 3.1 Flash Lite, 3.5 Flash Lite, 3.5 Flash, 3.6 Flash, 3.7 Flash, 3.8 Flash)
- [x] Refactor DOM querying & perbaikan critical bug CSS (:contains() replacement dengan Text Search Walker yang 100% aman untuk ekosistem UNPAM)
- [x] Implementasi Humanization & Anti-Detection Engine (natural reading pacing, jitter delay acak, simulasi mouse event sequence)
- [x] Redesain UI/UX Popup & Custom Floating Toast Notification (Closed Shadow DOM, zero browser alert, bebas stock emoji)
- [x] Audit Kompatibilitas Pre-Refactoring menyeluruh (katalog seluruh endpoint API, DOM selector rapuh, storage keys, dan lifecycle scripts)
- [x] Audit mendalam kelemahan struktural, keamanan, dan performa codebase
- [x] Evaluasi opsi refactoring arsitektur (Clean ES6+, Service Worker, chrome.storage, Anti-Detection)
- [x] Rancang roadmap perbaikan menyeluruh untuk user
- [x] Periksa struktur file dan verifikasi format manifest browser extension (Manifest V3)
- [x] Analisis seluruh content scripts, popup, dan background resource
- [x] Identifikasi fungsi utama dan fitur otomatisasi (AI Quiz, Presensi, Forum Bot, Auto-Survey, Auto-Password)
- [x] Audit keamanan: reverse engineering kode terobfuscasi, periksa indikasi malware, exfiltration, atau token stealing
- [x] Susun laporan komprehensif, temuan risiko, dan rekomendasi teknis untuk user
