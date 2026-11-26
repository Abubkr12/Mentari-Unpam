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
4. **Alur Update, Pengetesan Lokal, & Rilis GitHub (Mandatory)**:
   - Setiap selesai membuat perubahan/perbaikan fitur, lakukan build lokal (`node build.js` / `npm run release`) dan verifikasi sintaks saja terlebih dahulu.
   - **JANGAN** langsung `git push`, membuat tag, atau mengunggah/menimpa GitHub Release sebelum user melakukan pengetesan secara menyeluruh (overall testing) di browser dan memberi konfirmasi OK.
   - Saat rilis disetujui, wajib naikkan versi (bump semver baru) dan buat rilis GitHub baru; **dilarang menimpa** tag atau asset rilis lama.

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
- **Zero Cooldown & Fast Transition**: Peniadaan jeda buatan (0 Cooldown) pada modal Auto-Pilot dan antrean eksekusi. Transisi antar kuis dan kuesioner kini berjalan instan (~800ms visual buffer) guna memaksimalkan efisiensi pengerjaan.
- **Glassmorphic Floating HUD**: Menampilkan identitas kuis aktif, progress bar kumulatif, live status, tombol Jeda/Lanjut, dan Batalkan.
- **Fail-Safe SPA Router**: Divalidasi oleh pengawal navigasi `content.js` jika SPA LMS Mentari meredirect ke luar halaman `/exam/*` pasca-submisi kuis.

### 9. Mekanisme Resilient Button Locator & AI Model Persistence pada Auto-Pilot Kuis
- **Resilient Button Locator (`_findStartExamButton`)**: Menangani variasi tombol resmi MUI di LMS Mentari UNPAM ("MULAI QUIZ" dengan huruf Z, "KERJAKAN QUIZ", "MULAI KUIS", dll.), dilengkapi negative filter untuk tombol navigasi (Kembali, Daftar, Batal), serta shielding dari host ekstensi agar tidak terjadi salah klik elemen UI ekstensi.
- **Dialog Confirmation Auto-Handler (`_findDialogConfirmButton`)**: Mendeteksi dan mengklik tombol konfirmasi modal Material UI ("Ya", "Mulai", "Lanjutkan") saat pop-up konfirmasi pengerjaan kuis muncul.
- **Question Transistion Waiter (`_waitForQuestionContainer`)**: Melakukan polling hingga container soal kuis (`input[type="radio"]` atau `.MuiRadio-root`) ter-mount di DOM sebelum loop penjawab dieksekusi.
- **Auto-Start dari Landing Page**: Jika tombol "Auto Semua" pada floating card pojok kanan bawah diklik saat masih berada di landing page kuis, sistem otomatis memicu pengerjaan awal tanpa mengalami freeze/stuck.
- **Strict "Already Done" Verification**: Memastikan status kuis selesai HANYA dievaluasi jika tidak ada tombol mulai dan tidak ada container soal, serta ditemukan tabel riwayat skor spesifik guna mencegah false-positive dari teks petunjuk pengerjaan dosen.
- **Explicit Gemini Model Selection**: Pilihan 9 model AI Gemini tersedia langsung di modal konfigurasi Auto-Pilot (`token.js`), tersimpan persisten ke `gemini_model` & `mentari_auto_pilot_state.model`, tersinkronisasi real-time ke card kontrol mini, dan ditampilkan secara elegan dengan badge SVG inline pada Floating HUD Tracker.

### 10. Proteksi Anti-Waste Quota AI, Active Exam Veto & Validasi Status Kuis Selesai
- **Active Exam Veto (`_checkIfExamAlreadyCompleted`)**: Deteksi mutlak kuis yang sedang aktif berjalan. Jika ditemukan timer countdown (`waktu tersisa` / `sisa waktu`), badge status `belum dijawab`, atau radio input yang berstatus aktif (`input[type="radio"]:not(:disabled)`), status kuis dijamin 100% AKTIF (`isCompleted: false`), mengesampingkan deteksi review lainnya.
- **Eliminasi Fatal Bug `?page=`**: Menghapus total aturan rapuh yang mengasumsikan URL ber-`?page=` tanpa tombol submit sebagai mode review, karena LMS Mentari menggunakan query string tersebut untuk penomoran soal pengerjaan aktif biasa.
- **Top-Priority Gatekeeper Execution**: Evaluasi kuis selesai diposisikan pada baris PERTAMA di `_waitForExamReady()`, dieksekusi SEBELUM mencari container soal untuk mencegah kuota AI terbuang sia-sia pada halaman kuis yang telah lampau.
- **Resilient Question Progression & Sidebar Fallback (`runAutoLoop`)**:
  - Polling waiter hingga 2.5 detik untuk deteksi tombol `NEXT →` guna mengakomodasi jeda re-render Next.js.
  - Fallback ke sidebar `Navigasi Soal` via `_getExamNavigationStatus()` jika tombol Next terlambat atau tidak muncul: secara cerdas mengklik nomor soal yang belum terjawab (belum berwarna hijau).
  - Penanganan tombol selesai (`finishBtn`) di soal terakhir dengan pemicuan modal konfirmasi dialog Material UI (`.MuiDialog-root`).
- **Strict Submission Verification (`_executeAutoPilotQuiz`)**: Kuis HANYA ditandai selesai secara permanen dan memicu jeda cooldown jika kuis benar-benar telah diserahkan (`loopResult.submitted === true` atau `finalComp.isCompleted === true`). Jika terputus di tengah jalan, Auto-Pilot dijeda dengan status 'Perlu Cek' agar nomor soal tidak ditinggalkan tanpa jawaban.
- **Interactive Model Selector di HUD**: Memungkinkan pergantian model AI on-the-fly secara langsung dari Floating HUD Tracker saat sesi Auto-Pilot berjalan atau dijeda, tersinkronisasi dua arah dengan preferensi ekstensi.
- **URL Alignment Guard**: Mencegah salah eksekusi saat Next.js me-redirect ke `?page=1` dari kuis lama pasca-submit. Jika ID exam pada URL tidak cocok dengan `currentItem.id`, sistem langsung mengeksekusi `window.location.replace(currentItem.url)` ke kuis aktif yang benar.
- **DOM Type & Title Verification (`_extractExamTitleAndTypeFromDOM`)**: Mengekstrak judul kuis, nama pertemuan, dan tipe evaluasi (`PRE_TEST` vs `POST_TEST`) langsung dari breadcrumb dan heading halaman untuk sinkronisasi akurat dan pelaporan transparan pada HUD.
- **Persistent Completed Storage & Self-Healing Auto-Prune (`mentari_completed_quiz_ids`)**:
  - **Server UNPAM adalah Single Source of Truth**: Atribut resmi server UNPAM (`sub.completion`, `sub.status`, `sub.nilai`, `sub.score`) adalah penentu mutlak kelulusan kuis. Data lokal tidak boleh membuat asumsi permanen yang mendistorsi data server.
  - **Self-Healing Auto-Prune**: Jika server UNPAM menyatakan suatu kuis belum selesai (`isLmsCompleted === false`), ID kuis tersebut otomatis dibersihkan dari `mentari_completed_quiz_ids` dan cache multi-user `mentari_cached_data_${userId}`. Kuis yang sempat terhenti tidak akan pernah terkunci secara permanen sebagai "Selesai" palsu.
  - **Tombol 'Periksa Status' (Sync UNPAM)**: Tersedia tombol interaktif pada Tab Kuis & Evaluasi dengan animasi perputaran SVG dan proteksi debounce agar mahasiswa dapat melakukan sinkronisasi langsung dengan status server UNPAM kapan saja.
- **Dukungan Kuis In-Progress & Siklus Attempt 1 Jam**:
  - **Resume Attempt Optimization**: Saat melanjutkan kuis yang masih aktif (dalam batas waktu 60 menit), ekstensi mendeteksi soal-soal yang sudah memiliki jawaban terpilih (`input[type="radio"]:checked`) dan secara cerdas melompat langsung ke soal pertama yang belum terjawab via sidebar navigasi. Ekstensi TIDAK memanggil Gemini AI untuk soal yang sudah terjawab, sehingga kuota token AI 100% terlindungi dari pemborosan.
  - **Deteksi Attempt Expired (Waktu 1 Jam Habis)**: Jika waktu pengerjaan 1 jam di UNPAM telah habis (`waktu pengerjaan telah habis` / timer `00:00`), sistem mendeteksinya sebagai status terkunci (`locked`), melewati kuis tanpa memicu loop tanpa akhir, dan memberikan notifikasi transparan ke pengguna.
  - **Proteksi Tombol Mulai/Lanjutkan**: `_markQuizAsCompletedPermanently` dilarang keras menandai kuis selesai jika tombol "Mulai Quiz" atau "Lanjutkan Quiz" masih aktif pada halaman.
- **Fast-Skip Cooldown**: Kuis yang dilewati (karena sudah selesai atau terkunci) menggunakan jeda cepat (2 detik) alih-alih normal cooldown (15 detik), menghemat waktu pengguna secara signifikan.

### 11. Arsitektur Tab Forum Aktif (Model Accordion, Kompak Range Pertemuan Belum Tersedia & Paralelisasi Fetch)
- **Model Accordion per Mata Kuliah**: Menggantikan list flat usang menjadi format Accordion per mata kuliah yang konsisten dengan Tab Kuis & Evaluasi. Seluruh mata kuliah tertutup secara default (all-collapsed) saat pertama kali dibuka.
- **Single-Open Exclusive Accordion**: Mengklik satu accordion mata kuliah akan membuka mata kuliah tersebut dan otomatis menutup seluruh accordion mata kuliah lainnya untuk menjaga kerapian dan fokus.
- **Rangkuman Kompak Pertemuan Belum Tersedia (`_computeUnavailableRanges`)**:
  - Jika suatu pertemuan belum memiliki topik diskusi yang dibuat oleh dosen pengampu atau modulnya belum dibuka, item tidak ditampilkan satu per satu sebagai card kosong.
  - Sistem mengelompokkan urutan pertemuan secara kontigu menjadi kotak ringkasan kompak: `Pertemuan x - y belum tersedia (Alasan: Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka)` (atau `Pertemuan x` jika single pertemuan).
- **Paralelisasi Fetch Request (`Promise.allSettled`)**:
  - Pengecekan topik forum (`api/forum/topic/{id}`) dan reply mahasiswa (`api/forum/reply/{id}`) dijalankan secara konkuren/paralel dengan `Promise.allSettled()`, memangkas durasi pemindaian dari 50–70 detik menjadi hanya 2–4 detik (percepatan ~15x–20x).
- **Tombol 'Periksa Status' (Sync UNPAM) & Waktu Sinkronisasi**:
  - Tombol aksi langsung pada header kontrol Forum dilengkapi animasi SVG perputaran (`.spin-animation`) saat memuat, debounce state, dan toast pemberitahuan.
  - Label `#forum-sync-time` menampilkan waktu sinkronisasi relatif terkini ('Baru saja', 'x menit lalu', atau jam format 'Pukul HH:mm').
- **Pencarian Real-Time & Filter Status**:
  - Filter pills cepat: `Semua`, `Belum Dijawab`, dan `Sudah Dijawab`.
  - Search input dinamis: secara otomatis membuka (auto-expand) accordion mata kuliah yang cocok dengan kata kunci pencarian.
  - Tombol Buka/Tutup Semua untuk navigasi cepat seluruh accordion.
- **Standar Ekstensi Bersih**: 100% icon inline SVG (bebas stock emoji), bebas `window.alert()` browser (menggunakan Toast), dan navigasi single-tab (`target="_self"`).

### 12. Arsitektur Portal MyUnpam (Unified Floating Dock, Presensi Tracker & 75% UAS Target Gauge)
- **Unified Glassmorphic Floating Dock (`#mentari-myunpam-dock-host`)**:
  - Mengeliminasi tombol floating terpisah yang bertumpuk canggung dan menabrak card informasi portal akademik MyUnpam.
  - Memadukan identitas brand Mentari Mod (badge gold flame) dengan tombol aksi presisi: 'Rekap Presensi' (indigo) dan 'Auto-Isi Survei' (emerald).
  - Styling Closed Shadow DOM dark-glassmorphism (`#0d111c`, blur 16px, border gold `rgba(212, 175, 55, 0.28)`) dengan hover lift dan feedback loading berputar (SVG spin) saat auto-survey dipicu.
- **Koordinasi Inter-Script Event (`mentari-survey-trigger`)**:
  - Tombol 'Auto-Isi Survei' pada floating dock memancarkan CustomEvent `mentari-survey-trigger`.
  - `QuickSurvey.js` mendengarkan event ini dan mengeksekusi automasi survei rating secara otomatis.
  - Jika dock terpadu aktif, `QuickSurvey.js` menonaktifkan injeksi tombol mandiri (`#mentari-survey-btn-host`) guna mencegah duplikasi elemen di viewport pengguna.
- **Eliminasi Fatal Flexbox Menciut/Gepeng pada Presensi Modal**:
  - Menetapkan deklarasi `flex-shrink: 0 !important; width: 100%;` pada `.course-card` serta `min-height: 0;` pada container `.content`.
  - Mencegah bug flexbox layout di mana ekspansi satu accordion pertemuan memampatkan seluruh kartu mata kuliah lainnya menjadi bentuk gepeng pipih tak terbaca.
- **Eliminasi Teks Stat Terpotong Vertikal**:
  - Menggantikan teks stat kaku dengan micro-pill badges (`.stat-pill`) dengan line-height standar (1.35) dan padding proporsional untuk SKS, Hadir (emerald), Mangkir (rose), Izin/Sakit (sky), dan Total Sesi (indigo).
- **Profile Hero Bar, Foto Asli Mahasiswa & Dual Attendance Metrics (Kehadiran Berjalan vs Progres Semester)**:
  - **Foto Profil Riil Mahasiswa**: Mengambil foto asli mahasiswa yang sedang aktif login di portal MyUnpam (dari data API atau pemindaian DOM sidebar `.sidebar img` / `.user-panel img`) dengan frame lingkaran beraksen emas (`#f59e0b`), dilengkapi automatic graceful fallback ke icon SVG jika foto gagal dimuat.
  - **Nama Mahasiswa Utuh**: Ditampilkan secara penuh tanpa terpotong ellipsis (`word-break: break-word`) didampingi meta badge NIM, Semester Registrasi, dan Total Beban SKS.
  - **Dual Attendance Metrics**:
    - **Metrik 1 (Kehadiran Berjalan / Sesi Aktif)**: Acuan utama kehadiran mahasiswa saat ini. Hanya membagi sesi hadir terhadap sesi yang telah diselenggarakan (hadir, alpa, izin/sakit) atau yang telah dibuka dosen di Mentari. Menghasilkan skor 100% aman bagi mahasiswa yang rajin menghadiri semua sesi berjalan, melenyapkan kepanikan mahasiswa akibat vonis 23% 'Di Bawah Batas UAS'.
    - **Metrik 2 (Progres Semester Penuh)**: Menghitung akumulasi kehadiran terhadap 105 total sesi satu semester dengan target minimal kelulusan UAS 75% (79 sesi) dan progress bar berpenanda emas vertikal `75% UAS`.
  - **Status Per-Mata Kuliah Realistis**: Mata kuliah yang belum ada sesi berjalan (misal 0/14 sesi) diberi status netral 'Belum Ada Sesi' (bukan 0.0% merah). Pertemuan yang belum diselenggarakan diberi label informatif 'Belum Tersedia' (belum dibuka dosen di Mentari).
- **Single-Open Exclusive Accordion**:
  - Accordion rincian pertemuan mata kuliah menerapkan mekanisme single-open: membuka satu mata kuliah akan secara otomatis menutup mata kuliah lain yang sedang terbuka demi menjaga fokus dan kerapian tampilan.
- **Draggable Modal Window**:
  - Modal presensi dilengkapi pointer-drag pada header dengan viewport boundary clamping sehingga posisi modal dapat digeser dengan leluasa saat meninjau data di portal MyUnpam.

### 13. Arsitektur Akselerasi 'Auto Semua' & Fast-Recovery Anti-Stuck (`quiz.js` & `humanizer.js`)
- **Akselerasi Pacing Responsif (Percepatan ~80-85%)**:
  - `readingPacing` pada mode otomatis dipangkas dari rentang 2.500–5.000ms menjadi jeda natural ringan **350–600ms**, memberikan performa pengerjaan gesit yang mendekati tombol manual 'Jawab Ini' (< 1.5s) tanpa membebani browser atau memicu race conditions.
  - Penambahan parameter `fast = true` pada `Humanizer.naturalClick` (scrolling cepat `behavior: auto`, scroll pause 40–80ms, hold click 20–40ms) serta pemanggilan eksplisit native `.click()` untuk kepastian eksekusi synthetic event pada framework React 18 / Material-UI.
  - Pemangkasan jeda commit state React/Next.js (300–500ms) dan jeda pre-Next (150–300ms), memangkas durasi 5 nomor kuis dari **1 menit 12 detik** menjadi hanya **~12–15 detik**.
- **Eliminasi Re-Answering Loop & Proteksi Kuota Token**:
  - Panggilan Gemini AI dikunci secara mutlak hanya jika `!alreadyCheckedRadio` (belum ada pilihan radio aktif pada container soal saat ini). Mengeliminasi bug re-answering berulang pada soal yang sama akibat delay perubahan warna tombol sidebar nomor di server UNPAM.
- **Transisi Reaktif & Fast Fallback Anti-Nyangkut Next.js**:
  - Mengganti waiter anti-stale statis 3.5s dengan polling dinamis 100ms (max 1.200ms) yang memantau query URL (`?page=N`), teks soal, dan container DOM baru.
  - **Mekanisme Self-Healing**: Jika tombol Next tidak merespon dalam 1.2 detik, ekstensi secara otomatis mengalihkan navigasi dengan mengklik tombol nomor soal berikutnya (`prevPage + 1`) pada sidebar navigasi nomor (`_getExamNavigationStatus()`).
- **Eliminasi Deadlock Self-Veto Kotak Hijau**:
  - Pada validasi submit dan Kotak Hijau Veto, jika nomor soal saat ini (`q.isCurrent`) sudah memiliki radio terpilih (`alreadyCheckedRadio`), nomor tersebut tidak lagi dianggap sebagai `unanswered`, mencegah kuis mem-veto dirinya sendiri dan menjamin tombol Selesai/Kumpulkan dapat diklik dengan lancar.

### 14. Arsitektur Dual-Export Rekap Tugas Forum Diskusi (.docx & .md) & Mode Poles AI Gemini
- **Dual Format Architecture (Word .docx & Markdown .md)**:
  - **Microsoft Word (.docx)**: Standar akademik ISO/IEC 29500 & ECMA-376 Transisi (Times New Roman 12pt, spasi 1.5, margin 4-4-3-3 cm, tabel rubrik bergaris, dan lembar jawaban siap isi) untuk cetak fisik atau arsip formal.
  - **Markdown (.md)**: Format teks semantik murni GFM (GitHub Flavored Markdown) yang memangkas token input AI hingga 60%, bebas dari noise XML/ZIP, dilengkapi sistem prompt akademik ketat (**Anti-Halusinasi**, **Anti-AI Slop**, **Zero Chat Preamble**, **Gaya Tulisan Manusia Alami**, **Prioritas Lampiran Materi PPT/PDF/Doc/Img**, **Waktu Lokal Mahasiswa WIB & Proteksi Anti-Skew Server AI Asing**, **Auto-Capture Nama Dosen Pengampu**, **Penomoran Jawaban Fleksibel Bebas Batas 2 Soal**, **Anti-Double Salam**, **Format 2 Murni Tanpa Salam**, serta **Penguncian Format 3 Hanya Jika Melampirkan Pertanyaan Teman**).
  - **Fitur Salin Prompt AI Instan**: Tombol satu klik "Salin Prompt AI (.md)" langsung menyalin seluruh teks Markdown dan soal forum ke clipboard sistem tanpa perlu download file terlebih dahulu.
  - **Styling Toolbar Konsisten & Netral**: Tombol 'Rekap Tugas' menggunakan label bersih tanpa kurungan dan mengadopsi styling senada dengan tombol tetangga (`Buka Semua` dan `Periksa Status`), bebas dari warna biru kontras, konsisten di tema gelap maupun terang.
- **Native HTML-to-OpenXML Conversion (`DOMParser`)**:
  - Memproses setiap node HTML dari CKEditor dosen secara semantik tanpa regex replace ceroboh.
  - Memisahkan blok paragraf, heading, list, dan tabel menjadi elemen OpenXML terisolasi, mengeliminasi teks terjamming (`...hasil pengujian.B. Pengantar Materi` dan `...jawaban rekan.F. Kriteria Penilaian`).
  - Menyelamatkan markup HTML asli dosen dengan mengambil `.innerHTML` pada `_fetchTopicQuestionContent` saat tab forum aktif dibuka.
- **Standar Tipografi Akademik UNPAM**:
  - Font Times New Roman 12pt (Judul 13pt-16pt bold).
  - Spasi 1.5 baris (`lineSpacing: 360`, `lineRule="auto"`).
  - Margin A4 resmi (Atas 4cm, Kiri 4cm, Bawah 3cm, Kanan 3cm).
  - Warna font 100% hitam standar (`000000` / otomatis), nol font warna-warni sesuai aturan penulisan akademik resmi.
  - Pembersihan redundansi judul via `cleanMeetingTitle` (contoh "Pertemuan 7 - Pertemuan 7" dibersihkan menjadi "Pertemuan 7").
  - Lembar jawaban berkotak formal (`createAnswerBoxXml`) siap isi untuk mahasiswa pada dokumen Word (.docx) menggantikan garis underscore mentah (`____...`). Khusus format Markdown (.md), blok lembar jawaban sengaja ditiadakan agar output prompt AI murni, padat, dan tidak membuang kuota token input secara cuma-cuma.
  - Indentasi hanging rapi (`w:ind w:left="480" w:hanging="280"`) pada ordered (`<ol>`) dan unordered (`<ul>`) list.
- **Tabel Rubrik Penilaian Resmi OpenXML (`<w:tbl>`) & Markdown Table GFM**:
  - Mengonversi elemen `<table>` dan `<figure class="table">` dosen menjadi tabel XML ECMA-376 transisi penuh untuk .docx dan tabel pipe `| Col | Col |` untuk .md.
  - Header berlatar abu-abu `#F1F5F9`, border kisi-kisi `#CCCCCC`, lebar total 7937 dxa (bidang tulis bersih A4).
  - Memastikan setiap `<w:tc>` wajib memiliki minimal satu `<w:p>`, mencegah error file korup di Microsoft Word, WPS Office, dan Google Docs.
- **Modal Konfigurasi Ekspor & Mode Poles AI Gemini (Zero Hallucination)**:
  - Modal interaktif `_showDocxExportModal` di Closed Shadow DOM (Dark & Light theme, draggable window, 100% inline SVG, nol stock emoji, nol window.alert()).
  - Pilihan 2 format file: `Microsoft Word (.docx)` dan `Markdown (.md)`.
  - Pilihan 2 mode ekspor:
    1. **Mode Standar (Format Asli Dosen)** (Rekomendasi & Instan): Konversi langsung dari struktur asli dosen tanpa jeda waktu.
    2. **Mode Poles AI Gemini (Perjelas Tata Letak)**: AI Gemini menata ulang penulisan dosen yang berantakan menjadi heading (A, B, C), daftar instruksi bernomor, dan tabel rubrik. Dikunci dengan aturan **ZERO HALLUCINATION** (100% kata-kata asli dosen dipertahankan tanpa diubah/dikurangi/ditambahi).
    3. Dropdown pilihan 9 model AI Gemini on-the-fly tersinkronisasi dengan preferensi storage.

### 15. Arsitektur Overhaul Kuis, Hard Veto Submit Prematur & Smart Question Memory Skor 100 (`quiz.js`, `service-worker.js`, `storage.js`)
- **Akar Masalah Bug `isCurrent` & Hard Veto Submisi Kuis**:
  - Eliminasi total evaluasi `Boolean(btn.style.border && btn.style.border.length > 0)` di `_getExamNavigationStatus()`. Seluruh tombol kotak MUI memiliki CSS outline border sehingga selalu bernilai `isCurrent: true`. Akibatnya pengecekan submit veto `if (target && target.btn && !target.isCurrent)` dilewati dan memicu klik tombol selesai prematur di saat nomor soal masih banyak yang abu-abu.
  - Mengganti deteksi `isCurrent` dengan URL page matching (`?page=N`), `aria-current="true"`, atau class tombol aktif resmi.
  - Memperketat `_isGreenColor(btn)` dengan evaluasi komponen RGB numerik (`g >= 75 && g > r * 1.15 && g > b * 1.15`) pada background maupun border span tombol kotak.
  - **Hard Veto Mutlak**: Tombol Selesai/Kumpulkan DIBLOKIR 100% jika masih ada kotak nomor soal yang berstatus abu-abu/belum terjawab di sidebar navigasi. Ekstensi secara otomatis mengarahkan browser ke tombol nomor abu-abu tersebut.
- **Smart Question Memory (Score 100 Gate)**:
  - Menyimpan kunci jawaban soal Pre-Test HANYA jika nilai kuis yang diraih adalah **100** dan tidak ada indikasi soal yang salah.
  - Jika kuis bernilai di bawah 100, ekstensi memindai elemen review dan mendeteksi nomor-nomor soal yang salah (misal: "Soal No. [2, 5] salah"), menolak penyimpanan ke memori, dan memberikan Toast peringatan transparan ke mahasiswa.
  - Pada pengerjaan Post-Test, sistem mencocokkan teks soal terhadap Smart Question Memory terlebih dahulu. Jika cocok, pilihan jawaban langsung dieksekusi secara instan tanpa mengonsumsi kuota token Gemini AI sama sekali.
- **Akselerasi Service Worker & Timeout 10s Anti-Hang**:
  - Retensi 100% seluruh 9 model Gemini aktif (`gemini-2.5-flash` s/d `gemini-3.8-flash`) tanpa ada yang dihapus atau didegradasi.
  - Pemasangan `AbortController` dengan batas waktu timeout 10 detik per request API Gemini guna mengeliminasi model nyangkut tanpa batas waktu.
  - Pemangkasan `maxOutputTokens: 256` untuk inferensi jawaban kilat sub-detik.
  - Rotasi failover otomatis ke API key cadangan jika terjadi timeout atau HTTP 429.
- **Visual Live Tracker Matrix di Floating HUD**:
  - Menghadirkan live status matrix mini pill (`.hud-q-pill.answered`, `.unanswered`, `.current`) pada Floating HUD Card.
  - Memantau live rasio keterjawaban kotak soal (`x/y Hijau`) secara real-time.
- **Isolasi Total Kredensial di `src/utils/storage.js`**:
  - Menghapus penulisan duplikasi key sensitif (`geminiApiKey`, `geminiApiKeys`, `mentari_auth_token`, `mentari_smart_question_memory`, `mentari_auto_pilot_state`) ke `window.localStorage` milik halaman web.
  - Kredensial dan preferensi pengguna di `chrome.storage.local` tetap 100% utuh tanpa perlu re-setup API Key.

### 16. Arsitektur Sinkronisasi Real-Time Kuesioner Pasca Post-Test (Auto-Pilot 'Semua Lengkap')
- **Akar Masalah Premature Termination Auto-Pilot**:
  - Di LMS Mentari UNPAM, sub-section kuesioner evaluasi dosen berstatus terkunci (`warningAlert: "Kerjakan post-test terlebih dahulu"`) sebelum post-test diselesaikan.
  - Sebelumnya, `calculateQueue()` di modal membuang seluruh evaluasi berstatus `locked`, sehingga antrean awal hanya memuat post-test. Begitu nomor terakhir post-test diserahkan, Auto-Pilot mendeteksi `currentIndex >= queue.length` dan langsung me-reset sesi (`AutoPilotState.reset()`). Mahasiswa terpaksa harus setup Auto-Pilot ulang hanya untuk mengerjakan kuesioner.
- **Dynamic Queue Anticipation di Modal (`src/content/token.js`)**:
  - Pada mode `Semua Lengkap` (`selectedMode === 'all'`), kuesioner tidak dibuang secara prematur jika post-test pertemuannya telah selesai ATAU sedang terjadwal di antrean (`postScheduledInQueue`).
  - Item kuesioner dijadwalkan dengan label status transparan: `Setelah Post-Test Selesai` (atau `Siap Diisi` jika post-test sudah selesai sebelumnya).
  - Menyimpan metadata sesi lengkap (`mode: 'all'`, `courseScope`, `coursesMeta`) ke dalam `AutoPilotState`.
- **Auto-Pilot Real-Time Synchronizer Engine (`src/utils/autopilot-sync.js`)**:
  - `fetchUnlockedKuesionerList`: Memindai API resmi UNPAM (`/api/user-course/{courseCode}`) secara paralel untuk seluruh mata kuliah dalam sesi, memfilter sub-section kuesioner yang `warningAlert`-nya telah bersih dan belum berstatus selesai (`!completion`).
  - `syncAndAppendKuesioner`: Memberikan jeda mikro 1.2s untuk memastikan database LMS menyelesaikan commit post-test, menambahkan kuesioner baru ke `state.queue`, memperbarui `state.total`, dan menyinkronkan state ke `AutoPilotState`.
- **Seamless Chaining Pasca Post-Test (`src/content/quiz.js`)**:
  - Di method `_advanceToNextQuiz`, saat antrean kuis habis dan `state.mode === 'all'`, sistem memicu `AutoPilotSync.syncAndAppendKuesioner`.
  - Jika kuesioner baru terdeteksi, Auto-Pilot langsung mengalihkan browser ke URL kuesioner (`window.location.replace`) tanpa mematikan sesi.
- **Safety Sweep di Kuesioner (`src/content/kuisioner.js`)**:
  - Saat antrean kuesioner habis, sistem menjalankan safety sweep akhir ke API UNPAM untuk menjamin 0 kuesioner tersisa sebelum Auto-Pilot me-reset sesi dan menampilkan notifikasi sukses 100%.
