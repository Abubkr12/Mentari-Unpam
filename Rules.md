# Rules & Architecture: Mentari Mod v2.0

## Informasi Project
- **Nama Ekstensi**: Mentari Mod v2.0
- **Tipe**: Google Chrome / Chromium Browser Extension (Manifest V3)
- **Target Platform**: 
  - `https://mentari.unpam.ac.id/*` (LMS Mentari Universitas Pamulang)
  - `https://my.unpam.ac.id/*` (Portal Akademik MyUnpam)
- **Author Asli**: Lukman Muludin (lukman754)
- **Lisensi**: MIT License

## Struktur Direktori
```
Mentari-Unpam-v2.0_2/
├── manifest.json              # Konfigurasi Manifest V3
├── README.md                  # Dokumentasi repo & panduan instalasi
├── LICENSE                    # Lisensi MIT
├── Rules.md                   # Perencanaan, struktur arsitektur & aturan project
├── task.md                    # Daftar task aktif dan arsip
└── src/
    ├── assets/
    │   ├── icon.png           # Icon ekstensi
    │   └── background.png     # Custom login background
    ├── popup/
    │   ├── popup.html         # Mini UI popup ekstensi
    │   └── script.js          # Trigger eksekusi token runner di active tab
    └── content/
        ├── apiKeyManager.js   # Pengelola API Key Google Gemini (validasi & base64 storage)
        ├── content.js         # Content script utama, injeksi header toggle button & theme
        ├── gemini.js          # Chatbot asisten AI Gemini inline & prompt styling
        ├── quiz.js            # Otomatisasi kuis/ujian (baca soal, query Gemini, auto-answer)
        ├── discus.js          # Asisten forum diskusi (buat pertanyaan & cari jawaban AI)
        ├── presensi.js        # Pelacak & penampil data presensi kuliah MyUnpam
        ├── kuisioner.js       # Auto-filler kuisioner evaluasi dosen/kuliah
        ├── QuickSurvey.js     # Auto-filler survei akademik di MyUnpam
        ├── pw.js              # Auto-generator password default mahasiswa (<nim>unpam#)
        ├── token.js           # Core token interceptor, tracking dashboard, GitHub update checker
        ├── guidebook.js       # Panduan interaktif ekstensi
        └── home.js            # Kustomisasi UI halaman login Mentari
```

## Kebijakan & Aturan Analisis / Modifikasi
1. **Integritas Kode**: Kode sumber asli ter-obfuscate menggunakan javascript-obfuscator. Jika dilakukan modifikasi atau perbaikan, lakukan secara hati-hati atau deobfuscate modul terkait terlebih dahulu.
2. **Kepatuhan Privasi & Keamanan**:
   - Tidak menambahkan skrip telemetri pihak ketiga di luar Google Gemini API dan GitHub Update API.
   - API Key Gemini wajib disimpan di storage lokal client dan tidak disebarkan.
3. **Tracking & Dokumentasi**:
   - Selalu perbarui `task.md` jika ada perubahan atau penambahan fitur. Task yang selesai dicentang dan dipindahkan ke Arsip.

## Temuan Audit Arsitektur & Kelemahan Codebase (v2.0)
1. **Penyimpanan Kredensial Tidak Aman**: Menggunakan `window.localStorage` domain Mentari UNPAM dengan encoding base64 (`atob`/`btoa`). Rentan terhadap pencurian token dan API key via XSS atau script pelacak kampus.
2. **Ketiadaan Background Service Worker**: Seluruh panggilan API ke backend Mentari, Gemini, dan GitHub dilakukan dari content script dengan menginjeksi script mentah ke context DOM halaman (`MAIN` world), memicu risiko deteksi instan.
3. **DOM Selectors Rapuh & Mengandung Bug CSS**: Ketergantungan pada hash class Emotion/MUI (`.css-1hw9j7s`, `.css-1yxmbwk`), serta penggunaan pseudo-class non-standar `:contains()` yang melempar exception `DOMException` pada browser modern.
4. **Kebocoran Memori (Memory Leaks)**: Penumpukan hingga 3+ `MutationObserver` pada `document.body` dengan opsi `subtree: true` tanpa cleanup, ditambah `setInterval` paralel yang memicu layout thrashing dan reflow tanpa henti.
5. **Anomali Waktu & Anti-Cheat Akademik**: Submisi kuis dan kuesioner otomatis dalam hitungan milidetik tanpa human jitter, penggunaan event sintetik (`isTrusted: false`), dan eksposur global namespace `window.runToken`.
6. **UI/UX Primitif**: Menggunakan HTML unstyled dan memanggil native browser `alert()` yang membekukan tab.
7. **Inkompatibilitas Format API Key Baru (Auth Key `AQ.`) & Model Usang**: 
   - Google AI Studio per 2026 telah bertransisi ke **Authentication Keys (Auth Keys)** yang diawali prefix **`AQ.`** (terikat ke service account Google Cloud) untuk menggantikan Traffic/Standard Keys lama (`AIza...`).
   - Ekstensi ini masih memakai regex kaku `/^AIza[a-zA-Z0-9_-]{30,}$/` dan melempar error *"Format API key tidak valid (Harus diawali AIza...)"*, sehingga **menolak mentah-mentah API Key Gemini generasi terbaru (AQ.)**.
   - Selain itu, model AI masih terkunci kaku di `gemini-1.5-flash` jadul tanpa dukungan `gemini-2.0-flash` atau `gemini-2.5-flash`.

## Cetak Biru Arsitektur Modern Target (Refactoring Plan)
1. **Tooling & Bundler**: Vite / Rollup dengan ES6+ modular (tanpa obfuscation bengkak, size berkurang ~80%).
2. **Background Service Worker**: Sentralisasi API calls (Gemini API, Mentari data fetching, GitHub update check) di background via `chrome.runtime.onMessage`.
3. **Isolated Storage**: Migrasi penuh ke `chrome.storage.local` dan `chrome.storage.session`, tertutup dari JavaScript halaman web.
4. **Resilient Semantic Locators**: Evaluasi elemen berdasarkan ARIA attributes (`role`, `aria-label`), text walker, dan relative hierarchy, bukan hash class CSS.
5. **Isolated Closed Shadow DOM UI**: Injeksi widget, floating button, dan dashboard ke dalam `Closed Shadow DOM` (`element.attachShadow({ mode: 'closed' })`) agar anti-deteksi dan style tidak bertabrakan dengan portal LMS.
6. **Stealth & Humanization Engine**: Jeda acak berbasis panjang soal (4.000–12.000ms), scrolling alami, sequence event mouse natural (`pointerdown` -> `mousedown` -> `focus` -> `click`), dan kontrol target akurasi.
7. **Custom Floating Toast UI**: Penggantian semua native `alert()` dengan toast notification internal berbasis custom SVG icons (bebas stock emoji).
8. **Universal API Key Validator**: Regex validasi fleksibel `/^(AIza|AQ)[a-zA-Z0-9_\-\.]{20,}$/` dan pengujian langsung via fetch ke Google Gemini API untuk mendukung Auth Key `AQ.` dan Traffic Key `AIza...`.

## Katalog Kompatibilitas Pre-Refactoring (Integration Checklist)
*Katalog wajib yang harus dipertahankan 100% agar fungsi di situs mentari.unpam.ac.id dan my.unpam.ac.id tidak rusak.*

### 1. Endpoint Backend Mentari LMS & MyUnpam
- `https://mentari.unpam.ac.id/api/user-course?page=1&limit=50` (GET) -> Daftar mata kuliah aktif mahasiswa.
- `https://mentari.unpam.ac.id/api/user-course/{courseId}` (GET) -> Detail materi, sesi perkuliahan, kuis, dan forum.
- `https://mentari.unpam.ac.id/api/forum/topic/{topicId}` (GET) -> Isi thread forum diskusi.
- `https://mentari.unpam.ac.id/api/forum/reply/{topicId}` (POST/GET) -> Kirim jawaban / ambil list reply forum.
- `https://mentari.unpam.ac.id/api/quiz/soal/{quizId}` (GET) -> Daftar soal ujian/kuis.
- `https://mentari.unpam.ac.id/api/file/{fileId}` -> Unduh materi perkuliahan.
- `https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-kuliah` (GET) -> Data jadwal kuliah semester aktif.
- `https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-pertemuan/{id}` (GET) -> Detail status presensi per pertemuan.
- `https://api.github.com/repos/lukman754/Mentari-Unpam/releases/latest` (GET) -> Pengecekan rilis pembaruan ekstensi.

### 2. Endpoint Google Gemini AI
- `https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}` (GET) -> Validasi koneksi API Key.
- `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}` (POST) -> Inferensi AI untuk Kuis, Forum, dan Chatbot inline.
- Model yang didukung (9 Model Generasi Baru dari `AI Limitation.xlsx`):
  1. `gemini-2.5-flash` (Rekomendasi Utama)
  2. `gemini-2.5-flash-lite` (Sangat Cepat & Efisien)
  3. `gemini-3-flash` (Next-Gen Intelligence)
  4. `gemini-3.1-flash-lite` (High Quota RPD 500)
  5. `gemini-3.5-flash-lite` (High Quota RPD 500)
  6. `gemini-3.5-flash` (Performa Tinggi)
  7. `gemini-3.6-flash` (Kemampuan Analisa Luas)
  8. `gemini-3.7-flash` (Penalaran Lanjut)
  9. `gemini-3.8-flash` (Flagship Speed & Depth)
- Tersedia pemilihan model on-the-fly di Quiz Assistant, Gemini Chat, dan Settings Dashboard.

### 2.1 Arsitektur Penyadap Token Main World (Anti HTTP 401)
- `src/content/main-sniffer.js` berjalan di context `world: MAIN` (run_at: `document_start`).
- Mencegat `window.fetch` dan `XMLHttpRequest.prototype.setRequestHeader` untuk menyadap header `Authorization: Bearer eyJ...`.
- Menyiarkan token ke isolated content script via DOM `CustomEvent('mentari-token-captured')` dan `window.postMessage`, serta menyimpannya ke `localStorage` dan `chrome.storage.local`.
- Dilengkapi validasi JWT expiration (`isJwtValid` dengan konversi epoch detik ke ms + safety buffer 30s) serta penanganan `mentari-token-invalidated` untuk mematikan potensi infinite event ping-pong loop.

### 2.2 Arsitektur Dual Launcher (Header Toggle & Floating Launcher)
1. **Header Toggle Button**:
   - Diinjeksi tepat sebelum `darkModeBtn` (`darkModeBtn.parentElement.insertBefore`) pada `.MuiStack-root` untuk menghindari `DOMException` pada hierarki wrapper MUI.
   - Dipantau terus-menerus oleh `MutationObserver` (debounced via `requestAnimationFrame`) + interval polling 1.5s agar tidak pernah hilang saat route change SPA Mentari.
2. **Floating Dashboard Launcher**:
   - Ditempatkan di pojok kiri bawah pada posisi `bottom: 82px; left: 24px;` (tepat di atas tombol floating Gemini AI).
   - Menggunakan Closed Shadow DOM, 100% inline SVG flame icon, styling glassmorphism orange gradien, dan custom CSS tooltip.
   - Terkoordinasi dengan jendela Gemini Chat via event `mentari-gemini-chat-toggle` sehingga otomatis smooth fade-out saat jendela chat dibuka.

### 2.3 Arsitektur Cache-First & Concurrency Throttling (`token.js`)
- **Cache-First UI**: Data mata kuliah dan forum langsung dirender seketika dari `chrome.storage.local` saat modal dibuka, mengeliminasi loading freeze dan error flash.
- **Isolasi Cache Multi-User**: Key cache disimpan berdasarkan identitas mahasiswa (`mentari_cached_data_${userId}`) agar data perkuliahan tidak bocor saat ganti akun.
- **In-Flight Request Mutex**: Mencegah dobel request ke server dengan mendaur ulang promise fetch yang sedang berjalan.
- **Batch Concurrency**: Request detail section/forum dibatasi per-batch 3 request paralel guna mencegah rate limiting (HTTP 429) dan N+1 request explosion.
- **Graceful 401 Recovery**: Jika token kedaluwarsa, token lama langsung dibersihkan, trigger sync token baru ditembakkan, tampilan data cache tetap dipertahankan, dan banner notifikasi ramah ditampilkan ke user.

### 3. Critical Bug CSS Selectors yang WAJIB Direfaktor
*Selector berikut menyebabkan `DOMException / SyntaxError` pada querySelector standar:*
- `button.MuiButton-contained:has(span:contains("Next"))` -> Ganti dengan text search walker pada child span button.
- `button.MuiButton-contained:has(span:contains("Selanjutnya"))` -> Ganti dengan text search walker.
- `button.MuiButtonBase-root:has(span:contains("Selesai Quiz"))` -> Ganti dengan text search walker.
- `button:has(span:contains("Submit Kuesioner"))` -> Ganti dengan text search walker.
- `button.css-1hw9j7s` -> Ganti dengan semantic locator `button[type="submit"]` atau target form footer.
- `.css-1yxmbwk` -> Ganti dengan header semantic container (`header`, `.MuiAppBar-root`).
- `.MuiStack-root.css-1kic1uf .MuiFormControlLabel-root:nth-child(...) .MuiRadio-root` -> Ganti dengan target `.MuiRadio-root` atau `input[type="radio"]` dalam question container.

### 4. Storage Keys Mapping (localStorage -> chrome.storage.local)
- `mentari_auth_token` -> Bearer JWT token user.
- `mentari_user_info` -> JSON profil mahasiswa (nama, nim, dsb).
- `mentari_cached_data_{userId}` -> Cache data mata kuliah & forum per user.
- `mentari_cached_courses` -> Fallback cache daftar mata kuliah.
- `mentari_cached_forums` -> Fallback cache daftar forum aktif.
- `geminiApiKey` -> API Key Gemini (dukung format `AQ.` dan `AIza...`).
- `gemini_model` -> Preferensi model Gemini.
- `gemini_chat_history_v2` -> Riwayat chat asisten AI.
- `gemini_quota` -> Counter limit request.
- `mentari_auto_finish_quiz` -> Konfigurasi submit otomatis kuis.

### 5. Custom Events & Window Interop
- `mentari-toggle-popup` -> Event pembuka/penutup pop up dashboard.
- `mentari-header-toggle` -> Injeksi tombol di navbar.
- `mentari-gemini-chat-toggle` -> Sinkronisasi buka/tutup jendela chat Gemini dengan floating launcher.
- `mentari-token-captured` -> Siaran token tertangkap live dari Main World.
- `mentari-token-invalidated` -> Pembersihan token kedaluwarsa di memori Main World.
- `mentari-request-token-sync` -> Permintaan sinkronisasi ulang token aktif.
- `gemini-api-key-updated` -> Event saat user mengupdate API key.
- `mentari-update-api-key` -> Trigger modal input API key.

### 6. Spesifikasi URL Routing & Skema API Perkuliahan / Presensi
1. **Routing LMS Mentari (`mentari.unpam.ac.id`)**:
   - **Route Kelas/Mata Kuliah**: `https://mentari.unpam.ac.id/u-courses/{kode_course}`
     - Parameter routing wajib menggunakan **`c.kode_course`** (contoh: `20261-04GSDE003-22GSD0213`), **BUKAN** record UUID enrollment (`c.id` seperti `75fefa17-c495-...`).
     - Jika record UUID dimasukkan ke URL, router SPA Mentari akan memanggil `api/user-course/{uuid}` dan menghasilkan error fatal `400 Course not found`.
   - **Route Forum Diskusi**: `https://mentari.unpam.ac.id/u-courses/{kode_course}/forum/{sub_section_id}`
   - **Route Topik Forum**: `https://mentari.unpam.ac.id/u-courses/{kode_course}/forum/{sub_section_id}/topics/{topic_id}`
   - **Route Kuis/Ujian**: `https://mentari.unpam.ac.id/u-courses/{kode_course}/exam/{id}` atau `/quiz/{id}`
   - **Route Kuisioner**: `https://mentari.unpam.ac.id/u-courses/{kode_course}/kuesioner/{kode_section}`

2. **Skema API Presensi Mahasiswa (`my.unpam.ac.id`)**:
   - **Jadwal Semester Aktif**: `GET https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-kuliah`
     - Menghasilkan array mata kuliah dengan atribut `{ id_kelas, id_mata_kuliah, nama_mata_kuliah, sks, nim, nama_mahasiswa, nama_semester_registrasi }`.
   - **Rincian Presensi per Pertemuan**: `GET https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-pertemuan/{id_kelas}/{id_mata_kuliah}`
     - Menghasilkan array riwayat absensi setiap pertemuan (Pertemuan 1 s/d 14) dengan atribut `presensi_status` (`hadir`, `alpa`, `izin`, `sakit`).
   - **Kebutuhan Header**: Wajib menyertakan `Authorization: Bearer <jwt>`, `X-XSRF-TOKEN: <token>`, dan `credentials: 'include'`. Untuk toleransi backend, sediakan variasi kapitalisasi (`authorization` & `x-xsrf-token`).

### 7. Arsitektur Multi-API Key Failover Pool
- **Storage**: Disimpan dalam array `geminiApiKeys` dan string pointer `geminiApiKey` (active key).
- **Format Didukung**: Universal regex `/^(AIza|AQ)[a-zA-Z0-9_\-\.]{20,}$/` (Auth Key baru `AQ.` & Traffic Key lama `AIza...`).
- **Failover Otomatis**: Background service worker (`service-worker.js`) mencegat kode error HTTP 429, 403, atau pesan limit kuota. Sistem secara mulus mencoba key berikutnya dalam pool tanpa membatalkan proses kuis yang sedang berjalan. Key yang berhasil otomatis dipromosikan sebagai primary key.
- **UI Management**: Tersedia di `ApiKeyManager` dengan Closed Shadow DOM, masking presisi, status badge (Utama/Cadangan), tombol jadikan utama, dan hapus key.

### 8. Arsitektur Auto-Pilot Kuis Batch (Single-Tab Runner)
- **Filosofi Single-Tab**: Menghindari pembuatan tab baru (`target="_blank"`) untuk menghemat konsumsi RAM browser dan mencegah deteksi session concurrency dari backend Mentari. Seluruh antrean kuis dieksekusi secara berurutan dalam tab aktif yang sama (`window.location.href`).
- **Validasi Prasyarat Mutlak**: Post-Test pada pertemuan tertentu HANYA dapat dieksekusi jika Forum Diskusi pada pertemuan tersebut telah diselesaikan mahasiswa (`forum.completion === true || forum.answered === true`). Jika forum belum selesai atau tidak ada, Post-Test otomatis dilewati (skipped) dan diinformasikan pada pratinjau antrean.
- **Inter-Quiz Cooldown**: Jeda aman (default 15 detik, konfigurasi 10–60 detik) dengan visual countdown pada Floating HUD sebelum berpindah ke kuis berikutnya guna menghindari pendeteksi bot velocity kampus.
- **Glassmorphic Floating HUD**: Menampilkan identitas kuis aktif, progress bar kumulatif, live status, tombol Jeda/Lanjut, dan Batalkan.
- **Fail-Safe SPA Router**: Divalidasi oleh pengawal navigasi `content.js` jika SPA LMS Mentari meredirect ke luar halaman `/exam/*` pasca-submisi kuis.
