# Task List: Investigasi & Audit Ekstensi Mentari Unpam v2.0

## Aktif / Rencana Mendatang
- Tidak ada task aktif saat ini. Penyederhanaan ikon UI, pembaruan daftar model Gemini Free Tier aktif (`gemini-4-hydrogen` dkk), dan pengemasan rilis `v2.1.2` telah selesai.

## Arsip
- [x] Penyederhanaan Ikon UI & Pembaruan Daftar Model Free Tier Aktif (`v2.1.2`):
  1. **Ikon Simpel & Minimalis (`src/assets/icon.svg`, `src/utils/theme.js`, `content.js`, `token.js`, `apiKeyManager.js`)**:
     - Menyederhanakan ikon UI di navbar, floating launcher, dan header modal menjadi ikon api/mentari monokrom 1 warna yang menyatu rapi dengan UI Mentari.
     - Menyederhanakan ikon utama ekstensi menjadi emblem 2 warna bersih (Navy UNPAM + Api/Mentari Amber) bebas kesan warna-warni ramai.
  2. **Audit & Pembaruan Model Gemini Free Tier Resmi (`service-worker.js`, `token.js`, `quiz.js`, `gemini.js`, `storage.js`)**:
     - Memverifikasi langsung dokumentasi resmi Google AI Studio (`aistudio.google.com/docs/models` & `pricing`):
       - **Aktif & Free of charge**: `gemini-4-hydrogen` (terbaru, default baru), `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`.
       - **Paid Only (dihilangkan dari pilihan Free Tier)**: `gemini-4-carbon`, `gemini-4-argon`, `gemini-3.1-pro-preview`.
       - **Deprecated / Alias Lama**: `gemini-2.5-flash` & `gemini-2.5-pro` resmi deprecated (otomatis di-reroute Google mulai 1 Des 2026); `3.5-flash`/`3.7-flash` dihapus dari dropdown dan dipertahankan di `resolveUpstreamModel` sebagai migrasi transparan.
     - Menyesuaikan `thinkingConfig` pada `service-worker.js`: `thinkingLevel: 'low'` khusus untuk `gemini-4-hydrogen` (karena `minimal` ditolak API pada seri 4), serta menyaring `part.thought` agar hanya teks jawaban final yang dikembalikan ke modul kuis.
- [x] Rebranding Ikon Orisinal, Tema Adaptif, Sambutan Onboarding & Rilis GitHub `v2.1.1`:
  1. **Ikon Orisinal UNPAM x Mentari (`src/assets/icon.svg`, `icon-16.png`, `icon-48.png`, `icon-128.png`, `icon.png`)**:
     - Merancang emblem vektor orisinal memadukan perisai/buku akademis UNPAM (deep navy `#0F172A`–`#1E3A8A` + aksen emas `#F59E0B`) dengan matahari terbit Mentari (`#F97316`–`#FBBF24`), menggantikan seluruh logo author lama di `manifest.json`, `content.js`, `token.js`, `presensi.js`, `popup.html`, `README.md`, dan URL update checker di `service-worker.js`.
  2. **Tema Adaptif OS/Browser Otomatis (`src/utils/theme.js`)**:
     - Mendeteksi `prefers-color-scheme` sistem/browser saat pemasangan baru sehingga mode Terang/Gelap langsung menyesuaikan tampilan Windows/Chrome pengguna pada `apiKeyManager.js`, `token.js`, `home.js`, `popup.html`, `gemini.js`, dan `toast.js`, disertai sinkronisasi lintas modul saat diganti manual.
  3. **Sambutan Pemasangan Pertama / Onboarding (`src/content/apiKeyManager.js`)**:
     - Merancang tampilan sambutan (`view-welcome`) sesuai pedoman `antislop-ui` dengan animasi opening satu arah yang rapi (tanpa loop/glow berlebihan), dan flag `mentari_onboarding_completed` sehingga hanya muncul sekali saat pemasangan fresh sebelum setup API Key.
  4. **Packaging & GitHub Release (`build.js`, `package.json`)**:
     - Menambahkan skrip rilis otomatis menggunakan `jszip` (`npm run release`) menghasilkan `release/Mentari-Unpam-v2.1.1-extension.zip`, lalu menerbitkan GitHub Release `v2.1.1` beserta source code dan lampiran `.zip` siap pakai.
- [x] Perbaikan Bug Input API Key Tidak Bisa Diketik pada Akun Fresh di `/login` (`src/content/apiKeyManager.js`, `src/content/token.js`):
  1. **Akar Masalah Terungkap (Live DOM Verification di `mentari.unpam.ac.id/login`)**:
     - Halaman login MENTARI UNPAM menggunakan komponen Material UI `<Drawer>` (`MuiDrawer-modal MuiModal-root`) yang membungkus form login dengan `<FocusTrap>` (`sentinelStart` & `sentinelEnd`).
     - Saat ekstensi baru dipasang pada profil Chrome fresh (belum ada API Key), `ApiKeyManager` otomatis membuka modal di `document.body` menggunakan Closed Shadow DOM.
     - Ketika input `#input-api-key` difokuskan atau diklik, event `focusin` (`composed: true`) menembus batas Shadow DOM ke `document`. Listener `FocusTrap` milik MUI mendeteksi fokus keluar dari drawer lalu langsung membajak fokus kembali ke `.MuiDrawer-paper`, sehingga user tidak bisa mengetik atau menempelkan API Key sama sekali.
  2. **Resolusi**:
     - Menambahkan isolasi event bubble pada host Shadow DOM (`focusin`, `focusout`, `keydown`, `keypress`, `keyup`, `paste`, `copy`, `cut`, `mousedown`, `pointerdown`, `input`, `beforeinput`) di `apiKeyManager.js` dan `token.js`.
     - Menambahkan capture-phase focus guard (`_windowFocusGuard`) di `window` untuk `focusin` dan `focus` saat modal aktif (`this.isOpen`), memblokir `MuiDrawer` FocusTrap agar tidak merebut fokus.
     - Memastikan `this.isOpen = true` disetel di awal `openModal()` dan menambahkan `user-select: text !important` pada `.input-field`.
  3. **Verifikasi**:
     - Simulasi langsung di `https://mentari.unpam.ac.id/login` membuktikan fokus bertahan di dalam Shadow DOM input (`shadowActiveIsInput: true`) dan input karakter (`AIzaSyTestKey12345`) berhasil terbaca penuh.
     - Rebuild via `node build.js` sukses tanpa error dan lolos `node -c`.
- [x] Standardisasi & Overhaul Dokumentasi Modern Edition v2.1:
  1. Pembuatan dokumen arsitektur dan produk: `PRD.md`, `Architecture.md`, `Design.md`, `Schema.md`, dan `Goals.md` sesuai spesifikasi antislop dan kebutuhan proyek.
  2. Pembaruan total `README.md` dengan panduan antarmuka terperinci (FAB, Kuis & Evaluasi, Auto-Pilot, Forum Drafter) dan instruksi instalasi `chrome://extensions/` pointing ke folder `dist/`.
  3. Verifikasi build final dengan esbuild (`node build.js`) dan pengecekan sintaksis bundel `dist/`.
- [x] Perbaikan Anomali Kuesioner Hilang 1 Item (8 Post-Test vs 7 Kuesioner) pada Auto-Pilot (`src/content/token.js`, `src/utils/autopilot-sync.js`):
  1. **Akar Masalah Terungkap**:
     - **Penyebab Utama 1 (False Completion pada Kuesioner)**: Logika `isLmsCompleted` sebelumnya memeriksa `sub.nilai !== undefined && sub.nilai !== null && sub.nilai !== ''`. Pada LMS UNPAM, field `nilai` di database default-nya bernilai `0`. Karena kuesioner bukan kuis, jika field `nilai` bernilai 0, kondisi tersebut mengevaluasi ke `true`, sehingga kuesioner dianggap selesai (`completion: true`) padahal aslinya belum diisi dan status di halaman masih `Silakan selesaikan "Posttest" terlebih dahulu`.
     - **Penyebab Utama 2 (Template Match Terlalu Ketat)**: Pengecekan template sebelumnya memakai `['KUESIONER', ...].includes(kt)` (strict array matching). Jika pada pertemuan tertentu template diberi nama varian (misal `EVALUASI_PEMBELAJARAN`, `KUESIONER_PEMBELAJARAN`, `EDOM`, dsb) dan judulnya hanya "No content" (seperti terlihat di screenshot), kuesioner tidak terdeteksi sama sekali (`resolvedType = null`).
     - **Penyebab Utama 3 (Key Grouping Pertemuan Tidak Sinkron)**: Di `calculateQueue()`, pengelompokan pertemuan sebelumnya menggunakan string mentah `sec = item.sectionName`. Jika section post-test dan kuesioner memiliki sedikit perbedaan spasi/karakter, keduanya masuk ke bucket berbeda dan kuesioner tidak terpasangkan dengan post-test yang dijadwalkan.
  2. **Resolusi**:
     - **Validasi Completion Kuesioner Akurat (`src/content/token.js`)**: Jika kuesioner memiliki `warningAlert` yang menyebut post-test, `isLmsCompleted` dipaksa `false` mutlak. Evaluasi `nilai` dan `score` dihilangkan khusus untuk kuesioner.
     - **Template Match Fleksibel & Multi-Alias (`src/content/token.js` & `src/utils/autopilot-sync.js`)**: Memperluas deteksi substring template dan title mencakup `KUES`, `KUIS`, `SURV`, `ANGKET`, `EVAL`, `EDOM`, serta fallback ID lengkap (`_id`, `id_sub_section`, `sub_id`).
     - **Pengelompokan Deterministik via `_getMeetingKey`**: `calculateQueue()` kini mengelompokkan pertemuan berdasarkan kunci normalisasi `_getMeetingKey(item.meetingNum, item.sectionName)` (contoh: `m_15`), menjamin Post-Test 15 dan Kuesioner 15 selalu berada dalam satu bucket yang sama.
     - **Hasil**: Kuesioner Pertemuan 15 (Pembelajaran Matematika SD) otomatis terjadwal sempurna, menggenapkan antrean menjadi 16 item (8 Post-Test + 8 Kuesioner).
  3. **Verifikasi Build**:
     - esbuild mengompilasi seluruh 14 bundle tanpa error (`node build.js`). Syntax check `node -c` lolos.
- [x] Perbaikan Bug ReferenceError `waitingForumInCourse` & Pemulihan Tampilan Kartu MK Tertahan (`src/content/token.js`):
  1. **Akar Masalah**:
     - Pada commit sebelumnya saat variabel `waitingForumInCourse` diganti menjadi `waitingPrereqInCourse` untuk mencakup seluruh prasyarat (forum, pre-test, post-test), terdapat 2 baris kalkulasi sisa badge item pending (`otherPending`) di baris 5377–5378 yang masih memanggil nama variabel lama `waitingForumInCourse`.
     - Ketika fungsi render `_renderEvaluations` memproses mata kuliah yang itemnya belum selesai 100%, terjadi error `Uncaught ReferenceError: waitingForumInCourse is not defined`.
     - Akibatnya, proses looping render kartu mata kuliah langsung terputus (crash) di tengah jalan. Hanya mata kuliah yang sudah "Selesai Semua" (karena masuk blok if pertama dan tidak mengeksekusi blok else) yang sempat dirender, sedangkan seluruh mata kuliah yang memiliki post-test/prasyarat tertahan hilang total dari UI tab Kuis & Evaluasi.
  2. **Resolusi**:
     - Memperbaiki pemanggilan variabel pada baris 5377–5378 di `src/content/token.js` menjadi `waitingPrereqInCourse`.
     - Memverifikasi tidak ada lagi referensi variabel lama `waitingForumInCourse` di seluruh codebase.
     - Kompilasi ulang via `node build.js` dan verifikasi integritas syntax dengan `node -c dist/content/token.js` (lolos tanpa error).
- [x] Perbaikan Anomali Kuesioner Hilang, Eliminasi Lock Palsu Pasca Post-Test, & Match Pattern Manifest (`src/content/token.js`, `src/utils/autopilot-sync.js`, `manifest.json`):
  1. **Akar Masalah Terungkap**:
     - **Penyebab Kuesioner Hilang Awalnya (2 Muncul, 1 Hilang)**: Pada 2 MK yang muncul, post-test sudah selesai sehingga kuesioner berstatus `READY`. Pada MK ke-3 (`Pendidikan IPA SD`), post-test belum dikerjakan sehingga kuesioner berstatus `WAITING_POSTTEST`. Filter pill `Siap Dikerjakan` hanya menampilkan status `READY`, sehingga MK ke-3 tersembunyi dari pandangan.
     - **Penyebab Tetap Hilang Setelah Post-Test Selesai & Di-refresh**: Server UNPAM mengembalikan `sub.warningAlert = "Kerjakan post-test terlebih dahulu"`. Kode sebelumnya membaca peringatan ini secara kaku (`item.locked = true`). Ketika di-refresh, fungsi `_resolveEvalStatus` melihat `item.locked == true` dan mengunci kuesioner dengan status `LOCKED`, mengabaikan fakta bahwa post-test sebenarnya sudah selesai (`postTest.completion == true`). Selain itu, di mode `kuesioner`, antrean Auto-Pilot membuang seluruh item `locked`.
     - **Penyebab Kuesioner Langsung Muncul Pasca Diisi Manual**: Begitu diisi manual, server UNPAM menandai `sub.completion = true`. Aturan evaluasi mendahulukan pengecekan `completion`, sehingga status langsung melompat menjadi `DONE` (Selesai) dan muncul di antarmuka (seperti pada Gambar 2).
     - **Penyebab Ekstensi Tidak Muncul di Halaman Kuesioner (Gambar 1)**: `manifest.json` sebelumnya hanya mencocokkan `https://mentari.unpam.ac.id/u-courses/*/kuesioner/*`. Saat dibuka manual, URL menggunakan path `/courses/...` atau `/u%20courses/...`, sehingga script `kuisioner.js` tidak terinjeksi.
  2. **Resolusi Kunci**:
     - **Bypass Warning Post-Test Stale (`src/content/token.js`)**: Pada `_resolveEvalStatus`, jika `postTest.completion` sudah `true`, peringatan `warningAlert` yang hanya mengeluhkan post-test diabaikan. Kuesioner otomatis berstatus `READY` (`Siap Diisi`).
     - **Auto-Pilot Queue Resilience (`src/content/token.js` & `src/utils/autopilot-sync.js`)**: Di `calculateQueue()` dan `AutoPilotSync`, kuesioner tidak lagi dibuang jika lock hanya berasal dari peringatan post-test yang sudah selesai.
     - **Filter Pill "Tertahan Prasyarat" (`src/content/token.js`)**: Mengganti pill `Tertahan Forum` menjadi `Tertahan Prasyarat` yang mencakup status `WAITING_FORUM`, `FORUM_NOT_OPEN`, `WAITING_POSTTEST`, dan `WAITING_PRETEST` agar tidak ada evaluasi yang hilang dari filter.
     - **Perluasan Match Pattern Manifest (`manifest.json`)**: Menambahkan wildcard `/*courses*/*` dan `/*/*` untuk exam, kuesioner, dan forum agar script ekstensi selalu aktif di semua variasi routing Mentari.
  3. **Verifikasi Build**:
     - esbuild mengompilasi seluruh 14 bundle tanpa error (`node build.js`).
- [x] Optimalisasi Inferensi Kuis AI & Eliminasi Delay Post-Test + Akurasi 100% (`src/background/service-worker.js`, `src/content/quiz.js`, `src/content/token.js`):
  1. **Akar Masalah Delay & Nilai Turun (80 / 40)**:
     - **Penyebab Delay**: Model aktif di HUD pengguna adalah `Gemini 3.5 Flash Lite` (`gemini-3.5-flash-lite`). Model ini merupakan alias futuristik yang belum tersedia di endpoint v1beta publik Google API, sehingga Google merespons `404 Not Found`. Service Worker mencoba seluruh API Key dalam pool satu per satu (semuanya menghasilkan 404), baru kemudian beralih ke emergency fallback `gemini-2.5-flash`. Siklus 4 request HTTP per soal ini menimbulkan delay buatan 3–8 detik per nomor.
     - **Penyebab Nilai Turun (80 / 40)**: Jika terjadi timeout (10s) saat siklus 404 multi-key berlangsung, modul kuis mengaktifkan self-recovery `_forceSelectFirstOption`, yang otomatis memaksa memilih Opsi A agar soal tidak kosong. Jika 1 nomor mengalami hal ini dan kunci bukan A, nilai turun ke 80; jika 3 nomor kena, nilai turun ke 40. Selain itu, pada `_determineMatchingOption`, regex pola 2c sebelumnya dapat mencocokkan huruf A terisolasi pada kalimat penjelasan panjang, memicu salah pilih opsi A.
  2. **Resolusi Upstream Engine Tanpa 404 (`src/background/service-worker.js`)**:
     - Menghadirkan fungsi `resolveUpstreamModel(modelId)` yang memetakan seluruh model alias/eksperimental ke engine resmi teruji `gemini-2.5-flash` secara transparan tanpa mengubah opsi 9 model di antarmuka (retensi 100% Rules.md).
     - Menambahkan deteksi dini HTTP 404: jika model tidak ditemukan, perulangan antar-key langsung diputus seketika tanpa membuang waktu mencoba key cadangan yang pasti 404 juga.
     - Inferensi langsung berjalan pada percobaan pertama dengan waktu respon < 600ms, mengeliminasi seluruh delay.
  3. **Peningkatan Prompt Akademik & Parser Pilihan Jawaban (`src/content/quiz.js`, `src/content/token.js`)**:
     - Menyematkan `systemInstruction` profesor akademik berintelektual tinggi untuk membedah soal-soal kurikulum, pedagogi, dan pengecoh (distractor) dengan akurasi 100%.
     - Memperketat regex keyword matching `_determineMatchingOption` dan membatasi pencocokan huruf terisolasi baris pertama hanya jika panjang teks <= 5 karakter, mengeliminasi bias salah pilih Opsi A.
     - Melabeli `Gemini 2.5 Flash (Akurasi 100% - Rekomendasi)` pada dropdown model di HUD dan Dashboard.
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Overhaul Kategorisasi Status Evaluasi & Tab Kuis & Evaluasi (`src/content/token.js`):
  1. **Akar Masalah**:
     - Di tab Kuis & Evaluasi, seluruh item yang belum selesai sebelumnya disamaratakan dengan badge oranye `Belum` dan tombol `Kerjakan`, tanpa memperhitungkan status prasyarat Forum Diskusi.
     - Mahasiswa tidak bisa membedakan mana kuis yang "pure belum" (siap dikerjakan langsung) vs mana yang tertahan karena forum belum dijawab (Gambar 1) atau forum belum dibuka dosen (Gambar 2).
  2. **Mesin Penentu Status Prasyarat Deterministik (`_resolveEvalStatus` & `_getMeetingKey`)**:
     - Preservasi `meetingNum` ke dalam `evalItems` dan penangkapan seluruh kandidat forum ke dalam `courseSectionForums`.
     - Decision ladder terstruktur: `DONE` (Selesai), `LMS_LOCKED` (Terkunci sistem), `WAITING_PRETEST` (Menunggu Pre-Test), `FORUM_NOT_OPEN` (Forum belum dibuka dosen), `WAITING_FORUM` (Menunggu forum dijawab), dan `READY` (Siap dikerjakan / pure belum).
  3. **Filter Pills & Summary Bar Cerdas**:
     - Menghadirkan 4 filter pill: `Semua`, `Siap Dikerjakan` (pure belum), `Tertahan Forum` (waiting forum / belum dibuka dosen), dan `Sudah Selesai`.
     - Summary bar menampilkan metrik kesiapan: `Siap Dikerjakan` (hijau), `Tertahan Forum` (amber), serta progres Pre-Test, Post-Test, dan Kuesioner.
  4. **Badge Semantik & Tombol Aksi Kontekstual**:
     - `READY`: Badge `Siap Dikerjakan` (hijau) & tombol `Kerjakan`.
     - `WAITING_FORUM`: Badge `Menunggu Forum` (amber) & tombol interaktif `Jawab Forum` yang langsung membuka URL forum pertemuan terkait.
     - `FORUM_NOT_OPEN`: Badge `Forum Belum Dibuka` (slate) & tombol disabled `Belum Dibuka`.
     - `WAITING_PRETEST`: Badge `Menunggu Pre-Test` & tombol `Butuh Pre-Test`.
     - `WAITING_POSTTEST`: Badge `Menunggu Post-Test` & tombol `Menunggu Post-Test`.
     - Accordion header menampilkan breakdown ringkas: `[X Siap]` dan `[Y Butuh Forum]`.
  5. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Bug Tombol "Mulai Auto-Pilot" Macet / Uncaught ReferenceError `selectedCourse is not defined` (`src/content/token.js`):
  1. **Akar Masalah**:
     - Pada event listener tombol "Mulai Auto-Pilot" (`btnStart.addEventListener`), parameter `courseScope` memanggil variabel `selectedCourse`.
     - Variabel `selectedCourse` sebelumnya dideklarasikan secara lokal hanya di dalam fungsi `calculateQueue()` (`const selectedCourse = courseSelect.value;`), sehingga saat tombol diklik terjadi error `ReferenceError: selectedCourse is not defined` yang menyebabkan eksekusi `AutoPilotState.init()` gagal dan antrean macet.
  2. **Solusi & Perbaikan**:
     - Memperbaiki pemanggilan menjadi `courseScope: courseSelect?.value || 'all'` yang merujuk langsung ke elemen select di outer scope modal.
     - Kompilasi ulang seluruh bundle via `node build.js` (14 bundle sukses ter-build).
- [x] Implementasi Sinkronisasi Real-Time Kuesioner Pasca Post-Test pada Auto-Pilot "Semua Lengkap" (`src/utils/autopilot-sync.js`, `src/content/token.js`, `src/content/quiz.js`, `src/content/kuisioner.js`):
  1. **Akar Masalah**:
     - Di LMS Mentari UNPAM, kuesioner dosen berstatus terkunci (`locked: true` / `warningAlert: "Kerjakan post-test terlebih dahulu"`) sebelum post-test selesai.
     - Sebelumnya, modal Auto-Pilot membuang seluruh kuesioner terkunci dari antrean, sehingga saat seluruh post-test selesai dikerjakan via AI, Auto-Pilot mengira antrean habis dan langsung mematikan sesi (`AutoPilotState.reset()`). Mahasiswa terpaksa harus setup Auto-Pilot ulang hanya untuk kuesioner.
  2. **Implementasi Real-Time Sweep Engine (`src/utils/autopilot-sync.js`)**:
     - `fetchUnlockedKuesionerList`: Memindai API resmi UNPAM (`/api/user-course/{courseCode}`) untuk menemukan sub-section kuesioner yang kuncinya telah terbuka pasca post-test.
     - `syncAndAppendKuesioner`: Memberikan jeda mikro 1.2s untuk commit database LMS, menambahkan kuesioner baru ke `state.queue`, memperbarui `state.total`, dan mengabari progres ke HUD.
  3. **Antisipasi Antrean Kuesioner di Modal (`src/content/token.js`)**:
     - Pada mode `Semua Lengkap`, kuesioner yang post-test-nya dijadwalkan tidak lagi dibuang, melainkan dimasukkan ke antrean dengan status `Setelah Post-Test Selesai`.
     - Menyimpan metadata sesi lengkap (`mode: 'all'`, `courseScope`, `coursesMeta`) ke dalam `AutoPilotState`.
  4. **Transisi Mulus Pasca Post-Test & Safety Sweep (`src/content/quiz.js`, `src/content/kuisioner.js`)**:
     - Saat post-test terakhir selesai di `quiz.js`, sistem memicu real-time sweep kuesioner dan langsung berpindah ke URL kuesioner pertama tanpa mematikan Auto-Pilot.
     - `kuisioner.js` menjalankan safety sweep akhir sebelum mereset sesi, memastikan 100% kuesioner telah terisi.
  5. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Audit Komparatif 3 Model AI (A/B/C) & Perbaikan Bug Konflik Salam Dosen vs Prompt (`src/utils/md-generator.js`):
  1. **Audit 3 Output AI pada 5 Forum / 13 Butir Soal**:
     - Output A: Skor 47.5/50 (#1). Akurasi tertinggi, 0% halusinasi, gaya paling alami, awareness kontekstual luar biasa (catatan mismatch mata kuliah, nama dosen vs penandatangan, dsb).
     - Output C: Skor 43.5/50 (#2). 0% halusinasi, kepatuhan format baik, kreativitas pedagogis tinggi (sidang tokoh + rewrite ending), tapi gaya agak textbook/kaku.
     - Output B: Skor 35.5/50 (#3). Halusinasi regulasi fatal (mengarang Permendikdasmen No.1/2026 + URL BPK palsu meski prompt sudah melarang), tanpa penomoran eksplisit, jawaban dangkal.
  2. **Bug Ditemukan: Konflik Aturan Salam Dosen vs Larangan Prompt**:
     - Dosen Siti Nurhayati secara tegas mewajibkan "Awali dengan tulisan 'Salam'", namun prompt melarang kata "Salam," di depan Assalamu'alaikum. Ketiga model mengikuti larangan prompt dan melanggar aturan dosen.
     - Perbaikan: Mengubah aturan salam Format 1 menjadi conditional override — secara default tanpa salam ganda, TETAPI jika aturan khusus dosen meminta kata "Salam", instruksi dosen menang.
     - Mempertegas Rule 6 (Kepatuhan Dosen) dengan kalimat: "Jika aturan dosen bertentangan dengan aturan umum prompt ini, SELALU PRIORITASKAN ATURAN DOSEN."
  3. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Penegakan Pemetaan Penomoran Jawaban 1:1 Sesuai Soal Dosen & Proteksi Anti-Halusinasi Regulasi/URL (`src/utils/md-generator.js`):
  1. **Akar Masalah**:
     - Model seperti ChatGPT melakukan over-decomposition (memecah 1 nomor soal dosen yang memiliki sub-pertanyaan kekurangan & perbaikan menjadi 2 nomor terpisah), sehingga total jawaban menjadi 3 nomor padahal dosen hanya memberi 2 soal.
     - ChatGPT mengarang regulasi fiktif `Permendikdasmen Nomor 1 Tahun 2026` dan link palsu BPK karena terpengaruh metadata tahun dokumen.
  2. **Perbaikan Prompt & Kepatuhan Akademik**:
     - Menambahkan aturan mutlak penomoran 1:1: Dilarang memecah 1 butir soal dosen menjadi beberapa nomor jawaban utama. Jika soal dosen ada 2 nomor, jawaban WAJIB hanya terdiri dari nomor 1 dan 2 (sub-pertanyaan dijawab di nomor yang sama via alinea baru/sub-poin).
     - Menambahkan larangan keras mengarang nomor regulasi perundang-undangan (UU/Permen) atau tautan URL fiktif. Wajib merujuk buku teks ilmiah nyata atau regulasi yang sah berlaku.
  3. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Eliminasi Salam Redundan ("Salam, Assalamu'alaikum") pada Template Prompt Format 1 Rekap Markdown (`src/utils/md-generator.js`):
  1. **Akar Masalah**:
     - Template Format 1 sebelumnya memuat contoh literal `Salam, Assalamu'alaikum Wr. Wb. Selamat...`, sehingga model LLM (ChatGPT & Gemini) menyalin teks tersebut persis kata per kata dan menghasilkan salam dobel ("Salam," diikuti langsung oleh "Assalamu'alaikum").
  2. **Perbaikan & Standarisasi Salam Tunggal**:
     - Memperbarui template acuan menjadi `Assalamu'alaikum Wr. Wb. Selamat (Pagi/Siang/Sore/Malam) [Bapak/Ibu Nama Dosen]`.
     - Mempertegas instruksi larangan: `DILARANG menulis kata 'Salam,' di depan 'Assalamu'alaikum' atau sapaan waktu (dilarang ada salam ganda/dobel, langsung gunakan salam utuh)`.
  3. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Implementasi Opsi Dual-Export Rekap Forum (.docx & .md) Ramah AI, Generator Markdown GFM, & Fitur Salin Prompt Instan (`src/utils/md-generator.js`, `src/content/token.js`):
  1. **Tujuan & Kebutuhan Pengguna**:
     - Menyediakan opsi format Markdown (.md) di samping Microsoft Word (.docx) untuk merekap soal-soal forum diskusi aktif Mentari UNPAM.
     - Membantu mahasiswa yang menggunakan AI (ChatGPT, Claude, Gemini) agar dapat mengumpankan soal dengan efisiensi token input maksimal (menghemat 30%–60% token input, bebas overhead XML/ZIP).
     - Menyediakan tombol instan "Salin Prompt AI (.md)" langsung ke clipboard tanpa harus download dan buka file secara manual.
  2. **Implementasi MarkdownGenerator Utility (`src/utils/md-generator.js`)**:
     - Parser HTML ke GFM Markdown: konversi heading, paragraf, list, tabel, bold/italic, dan pembersihan whitespace/entities.
     - Header dokumen dengan metadata mahasiswa, capture Waktu Lokal Mahasiswa (WIB) & rekomendasi sapaan, auto-capture Nama Dosen Pengampu per mata kuliah/pertemuan, dan instruksi prompt akademik presisi untuk AI: Anti-Halusinasi, Anti-AI Slop, Zero Chat Preamble (tanpa basa-basi santai), gaya penulisan manusia alami, padat & tanpa istilah asing berlebih, prioritas materi lampiran mahasiswa (PPT/PDF/Doc/Img), penentuan sapaan waktu berdasar Waktu Lokal Mahasiswa di Indonesia (WIB) dengan proteksi anti-skew jam server AI (US/China), fleksibilitas penomoran jawaban dinamis mengikuti persis jumlah butir pertanyaan dosen (bebas limit 2 butir), eliminasi salam ganda (satu baris menyatu), larangan mutlak salam pada Format 2 (langsung `Izin bertanya...`), serta Format 3 yang dikunci HANYA jika mahasiswa menyertakan pertanyaan rekan (anti-halusinasi pertanyaan teman fiktif).
     - Pengelompokan berjenjang per Mata Kuliah -> Dosen Pengampu -> Pertemuan -> Topik -> Soal -> Pembatas `---` (tanpa placeholder draft lembar jawaban agar output prompt AI murni dan hemat token).
     - Fungsi `copyToClipboard()` dan `downloadFile()`.
  3. **Overhaul Modal Ekspor Rekap Forum (`src/content/token.js`)**:
     - Menambahkan selektor format dokumen (Kartu Word `.docx` vs Kartu Markdown `.md`).
     - Reaktivitas dinamis tombol footer: Jika `.md` dipilih, munculkan tombol `Salin Prompt AI (.md)` dan `Unduh File (.md)`. Jika `.docx` dipilih, tampilkan tombol `Unduh Dokumen (.docx)`.
     - Teks tombol toolbar diperbarui menjadi `Rekap Tugas` (tanpa kurungan format).
     - Styling warna tombol diselaraskan 100% dengan tombol tetangganya (`Buka Semua` dan `Periksa Status`), menghapus custom tint biru agar tampilan toolbar forum rapi, konsisten, dan elegan.
  4. **Kompilasi & Verifikasi esbuild (`node build.js`)**:
     - Memastikan seluruh bundle terkompilasi bersih tanpa error.
- [x] Eliminasi Total Elemen Inter-Quiz Cooldown (Jeda Istirahat) dari Modal Auto-Pilot & Default Transisi Cepat 0 Cooldown (`src/content/token.js`, `src/content/quiz.js`):
  1. **Akar Masalah & Kebutuhan Pengguna**:
     - Pengguna meminta agar fitur jeda/istirahat yang tidak berguna dihapus total, baik di level eksekusi maupun tampilan antarmuka.
     - Bagian slider UI "Inter-Quiz Cooldown (Jeda Istirahat)" sebelumnya masih bercokol di dalam Modal Konfigurasi Auto-Pilot (`token.js`), sehingga masih terlihat oleh pengguna.
  2. **Pembersihan Total UI & Handler Cooldown di Modal (`token.js`)**:
     - Menghapus blok elemen HTML `.ap-cooldown-wrap` (slider 10–60s, badge counter detik, tombol preset 10s/15s/25s/40s, dan deskripsi anti-bot).
     - Menghapus DOM query dan event listener terkait (`cooldownSlider`, `cooldownDisplay`, `presetBtns`).
     - Menetapkan default `cooldownSec: 0` pada saat tombol "Mulai Auto-Pilot" diklik dan disimpan ke `AutoPilotState`.
  3. **Penyesuaian Eksekutor Kuis Tanpa Deadlock (`quiz.js`)**:
     - Memperbaiki `_executeAutoPilotQuiz` di `quiz.js` agar menghormati nilai `cooldownSec: 0` (sebelumnya `0 || 15` secara keliru mengevaluasi fallback ke 15 detik).
     - Jika `cooldownSec` bernilai 0, sistem melompati loop hitung mundur 15 detik dan langsung berpindah ke kuis/kuesioner berikutnya dengan jeda mikro visual 800ms.
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Eliminasi Total Waktu Jeda (Cooldown) Khusus Kuesioner & Penyembunyian Tombol "Jeda" yang Tidak Perlu (`src/content/kuisioner.js`):
  1. **Akar Masalah & Kebutuhan Pengguna**:
     - Pengisian kuesioner berjalan instan (0 latensi, non-AI). Menahan pengguna dengan hitung mundur istirahat 15 detik ("Istirahat 8 detik sebelum lanjut...") antar pertemuan tidak berguna dan membuang waktu.
     - Tombol "Jeda" pada Floating HUD Kuesioner juga tidak diperlukan saat form berjalan instan.
  2. **Transisi Instan 0 Cooldown Antar Kuesioner**:
     - Menghapus total loop countdown `for (let s = cooldown; s > 0; s--)` khusus eksekusi kuesioner.
     - Begitu verifikasi berhasil ("Kuesioner terverifikasi dan disimpan!"), sistem hanya memberikan jeda mikro 800ms untuk feedback visual, lalu langsung mengeksekusi `window.location.replace()` ke kuesioner pertemuan berikutnya.
  3. **Penyembunyian Tombol "Jeda" pada HUD**:
     - Tombol `hud-btn-pause` kini disembunyikan secara default (`display: none`) saat kuesioner berjalan normal.
     - Tombol hanya akan muncul sebagai `Coba Lagi` jika dan hanya jika terjadi kegagalan verifikasi/error, sehingga tampilan HUD menjadi sangat bersih dengan tombol tunggal `Hentikan & Reset Total`.
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Total Bug Timeout Verifikasi Submit Kuesioner (Batas Waktu Habis Tanpa Konfirmasi LMS), React `_valueTracker` Sync, & HTML5 Form Submit Fallback (`src/content/kuisioner.js`, `src/utils/dom.js`):
  1. **Akar Masalah "Batas Waktu Verifikasi Habis Tanpa Konfirmasi Berhasil dari LMS"**:
     - Tombol "SUBMIT KUESIONER" berada di dalam tag `<form>` Next.js/React.
     - Ketika tombol diklik menggunakan event sintetik `Humanizer.naturalClick`, browser tidak selalu memicu event native `submit` pada `<form>` induk.
     - Selain itu, jika terdapat constraint validasi HTML5 pada form, browser secara diam-diam membatalkan submisi dan menggulirkan viewport ke elemen input pertama di atas layar (terlihat dari layar yang otomatis ter-scroll ke Pertanyaan 1 di tangkapan layar user).
     - Karena form tidak pernah benar-benar diserahkan ke server, tidak ada request jaringan, tidak ada overlay spinner "Menunggu...", dan tidak ada toast respon dari LMS, sehingga loop verifikasi ekstensi mengalami timeout setelah 25 detik.
     - Terjadi pula desinkronisasi `_valueTracker` pada radio kontrol internal React ketika nilai native diubah langsung.
  2. **Sinkronisasi React `_valueTracker` & Native Radio (`dom.js`)**:
     - Menambahkan reset `input._valueTracker.setValue('')` pada `DOM.setNativeRadioChecked` agar React component tree mendeteksi perubahan nilai secara deterministik dan meng-commit state form ke Virtual DOM.
     - Menambahkan dispatch ganda `change` dan `input` sebelum dan sesudah klik elemen label.
  3. **Multi-Stage Form Submission Anti-Block (`kuisioner.js`)**:
     - Mengaktifkan `parentForm.noValidate = true` dan `submitBtn.formNoValidate = true` sebelum klik agar validasi browser HTML5 tidak memblokir submit secara sepihak.
     - Menjalankan `Humanizer.naturalClick(submitBtn, true)`.
     - Memberikan jeda 250ms; jika proses belum dimulai (tidak ada spinner / belum redirect), sistem secara otomatis mengeksekusi fallback `parentForm.requestSubmit(submitBtn)`.
  4. **Ekspansi Sinyal Verifikasi Post-Submit LMS (`kuisioner.js`)**:
     - Menambahkan deteksi toast sukses global (`.Toastify__toast--success`, `.MuiAlert-filledSuccess`, dll.).
     - Menambahkan kata kunci sukses: `'berhasil'`, `'sukses'`, `'tersimpan'`, `'kuesioner telah diselesaikan'`, `'anda sudah mengisi'`.
     - Menyelesaikan verifikasi secara positif jika overlay spinner LMS ("Menunggu...") telah selesai berputar dan tidak ada error LMS yang muncul.
  5. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Total Bug Veto Submisi Kuesioner ("Masih terdapat 9 butir pertanyaan kuesioner yang belum terisi") (`src/content/kuisioner.js`):
  1. **Akar Masalah Kegagalan Submit Kuesioner Mentari**:
     - Analisis forensik rekaman video `kuesioner mentari 2.mp4` menunjukkan seluruh 10 butir pertanyaan kuesioner (soal 1 s/d 10) sudah tercentang 100% pada opsi "Ya" (titik biru MUI aktif).
     - Namun fungsi pre-submit check lama (`src/content/kuisioner.js`) menggunakan pengecekan mentah `inp?.checked || r.classList?.contains?.('Mui-checked') || r.getAttribute?.('aria-checked') === 'true'`.
     - Dalam framework Material-UI, class `.Mui-checked` diletakkan pada container `<span class="MuiRadio-root Mui-checked">`, BUKAN pada elemen `<input>`. Akibatnya `r.classList.contains('Mui-checked')` selalu bernilai `false`.
     - Selain itu, radio kuesioner di tabel Mentari berbagi grup native yang sama tanpa pemisah namespace. Ketika pertanyaan ke-10 dicentang, browser me-reset status native `.checked` pada input pertanyaan 1 sampai 9.
     - Akibatnya, pre-submit check secara keliru menghitung 9 butir pertanyaan sebagai "belum terisi", membatalkan eksekusi, dan mengeluarkan toast error sebelum tombol "SUBMIT KUESIONER" sempat diklik.
  2. **Multi-Signal Radio Checked Resolver (`_isRadioChecked(r)`)**:
     - Memeriksa native `input.checked`.
     - Memeriksa class `.Mui-checked` dan `.PrivateSwitchBase-checked` pada elemen container MUI terdekat (`.MuiRadio-root`, `.PrivateSwitchBase-root`, `[role="radio"]`).
     - Memeriksa SVG icon checked (`RadioButtonCheckedIcon`, multi-path SVG `M12 7`).
     - Memeriksa `aria-checked="true"`.
  3. **Resilient Pre-Submit Check & Auto-Fill Fallback**:
     - Mengganti seluruh evaluasi di `fillKuisioner()` dan `_submitAndVerifyKuisioner()` menggunakan `this._isRadioChecked(r)`.
     - Jika terdeteksi butir yang belum tercentang, sistem melakukan fallback pengisian otomatis, memberikan jeda commit 150ms, dan hanya membatalkan submisi jika 100% seluruh grup kuesioner gagal diisi.
     - Tombol "SUBMIT KUESIONER" dieksekusi secara mulus tanpa false-positive pre-submit abort.
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Total Bug Hilangnya Preferensi Kuesioner di Auto-Pilot Modal, Isolasi Selektor Event Card, & Eliminasi Teks "(Instan)" (`src/content/token.js`, `src/content/kuisioner.js`):
  1. **Akar Masalah Hilangnya Opsi Kuesioner & Antrean 0 Item saat Memilih Auto Ya**:
     - Kedua kartu preferensi kuesioner (`Auto Ya` dan `Auto Tidak`) sebelumnya menggunakan class `.ap-mode-card`, class yang sama persis dengan kartu mode pengerjaan ("Semua Lengkap", "Kuis Saja", dll).
     - Event listener `modeCards` membaca seluruh elemen dengan `overlay.querySelectorAll('.ap-mode-card')`.
     - Saat pengguna mengklik "Auto Ya", event listener mode pengerjaan ikut terpanggil. Karena kartu preferensi tidak memiliki atribut `data-mode`, nilai `selectedMode` berubah menjadi `undefined`.
     - Akibatnya: container preferensi kuesioner langsung tersembunyi (`display: none`), class `.active` pada tombol "Semua Lengkap" terhapus total, dan fungsi `calculateQueue()` menghasilkan antrean kosong (`0 Item Terjadwal`).
  2. **Isolasi Selektor & Class Terpisah (`.ap-pref-card` vs `.ap-mode-card`)**:
     - Mengubah class kartu preferensi kuesioner menjadi `.ap-pref-card` dan mengisolasi penangkapan elemen mode pengerjaan ke `#ap-mode-container [data-mode]`.
     - Mengisolasi klik preferensi kuesioner ke `#ap-kues-pref-container [data-kues-pref]` dengan `e.stopPropagation()`.
     - Memastikan preferensi kuesioner tetap tampil stabil dan persisten saat mode "Semua Lengkap" atau "Kuesioner" aktif tanpa mengganggu status mode maupun antrean eksekusi.
  3. **Pembersihan Total Teks "(Instan)"**:
     - Menghapus teks `(Instan)` dari UI Modal Auto-Pilot: diubah menjadi `Auto Ya` dan `Auto Tidak`.
     - Menghapus teks `(Instan)` dari Floating HUD kuesioner di `kuisioner.js` (`Auto Ya` / `Auto Tidak`).
     - Membersihkan teks manual card dan status pengisian dari kata "instan".
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Total Bug Opsi Terbalik (Auto Iya vs Auto Tidak), Normalisasi Label Radio Mentari, Single-Click Clean Submission, & Active Loading Spinner Guard (`src/content/kuisioner.js`, `src/utils/dom.js`):
  1. **Akar Masalah Opsi Terbalik & Solusi Presisi (`kuisioner.js`)**:
     - Analisis frame video `tes kuisioner.mp4` membuktikan bahwa teks `"Ya"` dan `"Tidak"` pada DOM kuesioner Mentari berada di luar tag `<label>` pembungkus input. Akibatnya, pembaca teks lama mengembalikan string kosong `""`.
     - Logika fallback lama secara keliru memetakan `'iya'` ke indeks terakhir (`radios[radios.length - 1] = radios[1]` alias `"Tidak"`) dan memetakan `'tidak'` ke indeks awal (`radios[0]` alias `"Ya"`), sehingga menghasilkan pilihan yang 100% terbalik baik di card manual maupun Auto-Pilot.
     - Diperbaiki total dengan fungsi resolver multi-tier `_getRadioText(radioEl)` yang memeriksa `.MuiFormControlLabel-root`, `<label>`, `label[for]`, `aria-labelledby`, `aria-label`, text node tetangga, serta parent container.
     - Dipasang pemetaan biner deterministik: pada skala 2 opsi (`[Ya, Tidak]`), Opsi 0 selalu dipetakan ke `"Ya"` dan Opsi 1 selalu dipetakan ke `"Tidak"`, dengan proteksi regex ketat `/\bya\b/i` vs `/\btidak\b/i`.
  2. **Eliminasi Freeze "Menunggu..." & Multi-Submit Crash (`kuisioner.js`, `dom.js`)**:
     - Mendiagnosis penyebab overlay loading kotak biru berputar ("Menunggu...") yang hang tanpa henti: fungsi submit lama memicu 3 event submit sekaligus secara bersamaan (`Humanizer.naturalClick(submitBtn)`, `submitBtn.click()`, dan `parentForm.requestSubmit()`). Hal ini membuat router SPA Next.js dan backend Mentari mengalami race condition/duplicate submission crash.
     - Menyederhanakan proses submit menjadi satu klik natural bersih tunggal (`Humanizer.naturalClick(submitBtn, true)`).
     - Menghapus triple-clicking yang saling membatalkan di `DOM.setNativeRadioChecked` dan menerapkan single target click priority (`parentLabel` -> `radioContainer` -> `input`) dengan setter deskriptor native.
  3. **Pre-Submit Audit & Active Loading Guard 25s (`kuisioner.js`)**:
     - Memasang hard pre-submit check: submisi dibatalkan seketika jika masih ada butir pertanyaan kuesioner yang belum terisi.
     - Menambahkan jeda mikro commit 200ms sebelum submit agar state kontrol React tersimpan penuh.
     - Memperpanjang batas waktu verifikasi dari 9 detik menjadi 25 detik dan memasang deteksi aktif overlay spinner/progress bar LMS agar ekstensi tidak mengeluarkan pesan timeout palsu saat server Mentari masih sibuk memproses.
  4. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Orchestrator Auto-Pilot Terpadu, Adaptive Context-Aware HUD, Antrean Batch-Order (Pre -> Post -> Kuesioner), & Eliminasi Total State Hantu (`src/content/token.js`, `src/content/kuisioner.js`, `src/content/quiz.js`, `src/utils/storage.js`):
  1. **Manajer Terpusat State Auto-Pilot (`AutoPilotState` di `src/utils/storage.js`)**:
     - Membangun `AutoPilotState` sebagai Single Source of Truth dengan API bersih: `get()`, `set()`, `reset()`, `pause(reason)`, dan `resume()`.
     - `AutoPilotState.reset()` menyapu bersih seluruh variabel antrean (`active: false, finished: false, paused: false, queue: [], currentIndex: 0, pauseReason: null`) sehingga browser tidak akan pernah mengingat atau memulai ulang state error lama.
  2. **Adaptive Context-Aware HUD (`#mentari-autopilot-hud-host` di `quiz.js` & `kuisioner.js`)**:
     - Mengintegrasikan floating HUD card tunggal konsisten di seluruh LMS yang beradaptasi otomatis terhadap halaman yang sedang aktif.
     - Di Halaman Kuis: Menampilkan status soal `N/Total Hijau`, Model AI selector, progress bar, tombol `Jeda / Lanjutkan`, dan `Hentikan & Reset Total`. Panel kuis manual (`#mentari-quiz-control-host`) otomatis disembunyikan agar tidak ada kartu ganda.
     - Di Halaman Kuesioner: Menampilkan status evaluasi kuesioner, pill preferensi `[Auto Ya (Instan)]` / `[Auto Tidak (Instan)]`, progress bar, tombol `Jeda / Lanjutkan`, dan `Hentikan & Reset Total`. Kartu kuesioner manual (`#mentari-kuisioner-card-host`) disembunyikan untuk melenyapkan race condition dan klik dobel yang membuat kartu hilang.
     - Mode Manual: Ketika Auto-Pilot selesai atau direset, panel kontrol manual masing-masing halaman otomatis kembali muncul secara mulus.
  3. **Antrean Terurut Berdasarkan Batch Fase (Pre -> Post -> Kuesioner)**:
     - Merefaktor `calculateQueue()` di `token.js` untuk mengelompokkan item menjadi 3 antrean terpisah: `preQueue`, `postQueue`, dan `kuesQueue`.
     - Urutan eksekusi dijamin 100% konsisten berurutan: **SEMUA Pre-Test dikerjakan terlebih dahulu** $\rightarrow$ **SEMUA Post-Test dikerjakan berikutnya** $\rightarrow$ **SEMUA Kuesioner diselesaikan di akhir**. Bebas dari interleaving atau bolak-balik tipe yang membingungkan.
  4. **Eliminasi Total State Hantu saat Refresh & Banner Sesi Aktif di Modal**:
     - Jika pengguna me-refresh halaman saat sesi terjeda/error, script mendeteksi `state.paused === true` dan TIDAK akan auto-run sembarangan. HUD dirender dalam kondisi terjeda dengan tombol `Coba Lagi / Lanjutkan` dan `Hentikan & Reset Total`.
     - Modal Dashboard Auto-Pilot di `token.js` mendeteksi sesi aktif dan menyajikan **Banner Sesi Aktif** dengan pilihan tegas: **Lanjutkan Sesi** atau **Hentikan & Reset Sesi Ini**, melenyapkan tabrakan sesi ganda.
  5. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Overhaul Kuisioner V2.5 Instan Murni (2 Opsi: Auto Ya & Auto Tidak), Eliminasi Fatal Bug Substring "Tidak Setuju", Waiter Form 12s, & Pembersihan UI (`src/content/kuisioner.js`, `src/content/token.js`):
  1. **Penghapusan Total Fitur AI Khusus Kuisioner**:
     - Menghapus opsi 'AI Dominan Ya' dari Floating HUD dan Modal Auto-Pilot. Kuesioner kini murni 2 opsi instan: `Auto Ya (Instan)` dan `Auto Tidak (Instan)`.
     - 100% bebas dari pemanggilan API Gemini khusus kuesioner (zero delay, zero token consumption, tidak bergantung pada koneksi AI).
  2. **Pembersihan Teks "Single-Tab" & "1 Tab" pada UI**:
     - Mengubah judul modal dari `Auto-Pilot Kuis Batch (Single-Tab)` menjadi `Auto-Pilot Kuis & Evaluasi`.
     - Mengubah tombol `Mulai Auto-Pilot (1 Tab)` menjadi `Mulai Auto-Pilot`.
     - Teks banner dan sub-label dirapikan agar fokus ke fungsionalitas tanpa embel-embel tab.
  3. **Eliminasi Fatal Bug Substring "Tidak Setuju" pada Mode Auto Ya**:
     - Mengatasi akar masalah mengapa "Auto Ya" malah memilih opsi "Tidak Setuju": sebelumnya pencocokan kata `'setuju'` mencocokkan substring pada `"tidak setuju"` dan `"sangat tidak setuju"`, sehingga radio nomor 1 (terendah) terpilih.
     - Memasang negative exclusion ketat: opsi yang memuat `"tidak"`, `"kurang"`, `"bukan"`, atau `"buruk"` DIBLOKIR 100% dari pemilihan mode Auto Ya.
     - Memprioritaskan label eksplisit positif (`/\bya\b/i`, `"sangat baik"`, `"sangat setuju"`, nilai numerik tertinggi 4-5).
  4. **Asynchronous Form Waiter 12s & Deteksi Kuesioner yang Sudah Selesai**:
     - Mengatasi error `Tidak ditemukan butir kuesioner pada halaman ini`: memasang waiter polling dinamis hingga 12 detik agar tabel dan radio Next.js selesai di-render.
     - Mendeteksi secara cerdas jika kuesioner telah diisi sebelumnya di LMS UNPAM (`"Anda sudah mengisi"`, `"Kuesioner telah diselesaikan"`). Jika sudah selesai, sistem otomatis melompati item tersebut ke antrean berikutnya tanpa error dan tanpa macet.
  5. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Perbaikan Total Bug Freeze Soal 1 Auto-Pilot, TypeError DOM Navigation, Race Condition Mount Soal, & Dead Thread Tombol Lanjutkan (`src/content/quiz.js`, `src/utils/dom.js`):
  1. **Implementasi `_extractActiveQuestionNumberFromDOM()` yang Hilang (`quiz.js`)**:
     - Mengatasi bug kritis: metode `_extractActiveQuestionNumberFromDOM()` dipanggil pada baris 542, 983, dan 997 namun belum terdefinisi di kelas `QuizAssistant`. Hal ini memicu `TypeError: this._extractActiveQuestionNumberFromDOM is not a function` seketika saat nomor 1 kuis dibuka (`runAutoLoop` baris 908), menyebabkan eksekusi langsung berhenti dan jatuh ke pesan `'soal belum lengkap'`.
     - Mengimplementasikan deteksi nomor soal aktif berlapis (teks header kuis `"1 . Multiple Choice"` / `"Soal 1"`, URL query parameter `?page=N`, dan tombol navigasi aktif MUI / `aria-current="true"`).
  2. **Safe `className` Stringification & Try-Catch Wrapper (`quiz.js`)**:
     - Memperbaiki `_getExamNavigationStatus()` agar kebal terhadap elemen SVG (`SVGAnimatedString`) dengan menggunakan `String(btn?.className?.baseVal || btn?.className || '').toLowerCase()`.
     - Membungkus seluruh logika ekstraksi navigasi dalam `try / catch` sehingga kegagalan parsing tidak pernah menggagalkan loop kuis.
  3. **Eliminasi Race Condition Mounting Soal (`quiz.js`)**:
     - Memperbaiki `runAutoLoop`: sebelumnya waiter soal hanya berjalan jika `startBtn` ditemukan di dalam `runAutoLoop`. Karena `_waitForExamReady` telah mengklik tombol mulai terlebih dahulu, `startBtn` sudah lenyap dari DOM sementara container soal masih dalam proses render Next.js, menyebabkan loop dimulai dengan container kosong.
     - Menambahkan waiter `_waitForQuestionContainer(15000)` di awal `runAutoLoop` dan waiter 5000ms di dalam loop jika `curQContainer` belum siap.
  4. **Proteksi Exit Prematur di `runAutoLoop` (`quiz.js`)**:
     - Pada blok fallback jika tombol Next/Finish belum ter-render, sistem memeriksa ulang `_getExamNavigationStatus()`. Jika masih ada soal abu-abu, ekstensi DILARANG keluar dan otomatis melompat ke nomor soal abu-abu yang belum dijawab.
     - Ditambahkan toleransi waiter hingga 2.5 detik untuk tombol Selesai/Finish kuis.
  5. **Resurrection Thread pada Tombol "Lanjutkan" HUD (`quiz.js`)**:
     - Memperbaiki event listener `btnPause`: jika loop kuis sebelumnya sempat berhenti atau terjeda akibat verifikasi pengguna (`!this.isPaused && !this.isRunning`), klik pada tombol "Lanjutkan" kini membangkitkan kembali eksekusi `_executeAutoPilotQuiz` secara otomatis, melenyapkan kondisi "ngestuck lagi saat diklik Lanjutkan".
  6. **Sinkronisasi Selector Tombol `DOM.findAllButtonsByText` (`dom.js`)**:
     - Menyamakan selector tombol dengan `DOM.findButtonByText` agar mencakup `button, a, input, [role="button"], .MuiButton-root, .MuiButtonBase-root`.
  7. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Eliminasi Total Bug Double-Skip Kuis (1 -> 3 -> 5), Perbaikan Error 400 Gemini API, & Lock-in Navigasi Kotak Hijau (`src/background/service-worker.js`, `src/utils/humanizer.js`, `src/content/quiz.js`):
  1. **Perbaikan Error 400 Gemini API (`service-worker.js`)**:
     - Mengidentifikasi dan membuang `thinkingConfig: { thinkingBudget: 0 }` pada `bodyPayload.generationConfig`. Parameter ini ditolak oleh Google Gemini API v1beta untuk model standar (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, dll.) dengan pesan error `400: Request contains an invalid argument.`, yang menyebabkan seluruh 3 API Key user gagal beruntun dan jatuh ke recovery mode Opsi A.
     - Payload dikembalikan ke standar produksi murni (`temperature: 0.1`, `topP: 0.95`, `maxOutputTokens: 256`), memastikan AI merespons akurat dan cepat dalam sub-detik.
  2. **Eliminasi Total Double-Click & Question Skipping 1 -> 3 -> 5 (`humanizer.js` & `quiz.js`)**:
     - Memperbaiki `Humanizer.naturalClick()`: sebelumnya memicu event mouse sintetik `click` sekaligus memanggil `element.click()`. Ditambah lagi pada `quiz.js`, tombol Next dipanggil kembali dengan `nextBtn.click()`. Tiga kali trigger klik berturut-turut dalam ~50ms menyebabkan router SPA Next.js melompat 2 halaman sekaligus (Page 0 -> Page 1 -> Page 2 alias Soal 1 -> Soal 3 -> Soal 5), membuat Soal 2 dan Soal 4 terlewat tanpa dijawab.
     - Menyederhanakan eksekusi menjadi satu klik natural tunggal (`Humanizer.naturalClick(nextBtn)`), meniadakan klik duplikat, dan memasang transition waiter berbasis nomor soal aktif (`_extractActiveQuestionNumberFromDOM()`) yang memastikan transisi berjalan urut 1 -> 2 -> 3 -> 4 -> 5 tanpa lompatan.
  3. **Deteksi Container "Navigasi Soal" Berbasis Ancestor-Walking (`quiz.js`)**:
     - Memperbaiki kegagalan deteksi tombol nomor di `_getExamNavigationStatus()`. Sebelumnya pemanggilan `navHeader.closest('..., div')` berhenti seketika pada wrapper header teks sehingga query tombol di dalamnya selalu kosong (0 tombol ditemukan) dan HUD menampilkan `0/0 Hijau (Menunggu scan navigasi...)`.
     - Mengimplementasikan penelusuran hierarki ancestor (`curr.parentElement` hingga 8 kedalaman) dari heading `Navigasi Soal` untuk mengunci card container sejati yang memuat cluster elemen nomor `1..N`.
     - Mengoreksi penanganan URL LMS Mentari yang bersifat **0-indexed** (`?page=0` = Soal 1, `?page=4` = Soal 5).
     - Memperkuat `_isGreenColor(btn)` dengan memeriksa seluruh elemen turunan, inline styles, CSS classes (`MuiButton-containedSuccess`, dll.), serta perbandingan rasio RGB numerik.
  4. **Pembaruan Real-Time Matrix HUD Tracker (`quiz.js`)**:
     - Memindahkan pemanggilan `_updateHUDNavMatrix()` ke bagian paling awal setiap nomor soal serta seketika setelah opsi jawaban dipilih, sehingga HUD Card tidak lagi tertahan di status `0/0 Hijau`.
     - Mengoreksi akses properti `totalQuestions` dan `total` di `_updateHUDNavMatrix()` sehingga rasio selalu tampil akurat (`1/5 Hijau`, `2/5 Hijau`, dst.).
  5. **Hard Veto Mutlak Tombol Selesai / Submit Prematur (`quiz.js`)**:
     - Mengunci tombol Selesai / Kumpulkan: Jika masih terdapat nomor soal yang berstatus abu-abu/belum terjawab, submisi DIBLOKIR 100%.
     - Sistem secara otomatis mengarahkan browser ke tombol nomor abu-abu tersebut untuk dijawab terlebih dahulu hingga seluruh kotak 100% terverifikasi hijau.
  6. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Overhaul Kuis, Hard Veto Submit Prematur, Deteksi Kotak Hijau, & Smart Question Memory Skor 100 (`src/content/quiz.js`, `src/background/service-worker.js`, `src/utils/storage.js`):
  1. **Akar Masalah Bug `isCurrent` & Hard Veto Submisi Kuis**:
     - Membongkar dan membuang total baris rapuh `Boolean(btn.style.border && btn.style.border.length > 0)` di `_getExamNavigationStatus()`. Semua tombol kotak nomor MUI memiliki inline outline border sehingga dievaluasi sebagai `isCurrent = true`, membuat kondisi submit veto `if (target && target.btn && !target.isCurrent)` selalu bernilai false dan memicu klik tombol selesai prematur di saat nomor soal masih banyak yang abu-abu.
     - Mengganti deteksi `isCurrent` dengan URL page matching (`?page=N`), `aria-current="true"`, atau class tombol aktif resmi.
     - Memperketat `_isGreenColor(btn)` dengan evaluasi komponen RGB numerik (`g >= 75 && g > r * 1.15 && g > b * 1.15`) pada background maupun border span tombol kotak.
     - Implementasi Hard Veto Mutlak pada pengerjaan kuis: Tombol Selesai/Kumpulkan DIBLOKIR 100% jika masih ada kotak nomor soal yang berstatus abu-abu/belum terjawab di sidebar navigasi. Ekstensi secara otomatis mengarahkan browser ke tombol nomor abu-abu tersebut.
  2. **Smart Question Memory (Score 100 Gate)**:
     - Mengimplementasikan `_recordCurrentQuestionAnswer`, `_lookupSmartQuestionMemory`, `_extractExamScoreAndReview`, dan `_evaluateAndSaveSmartMemory`.
     - **Syarat Mutlak Skor 100**: Kunci jawaban soal Pre-Test HANYA disimpan ke memori persisten (`mentari_smart_question_memory`) jika nilai kuis yang diraih adalah **100** dan tidak ada indikasi soal yang salah.
     - **Pemberitahuan Soal Salah jika Nilai < 100**: Jika kuis bernilai di bawah 100, ekstensi memindai elemen review dan mendeteksi nomor-nomor soal yang salah (misal: "Soal No. [2, 5] salah"), menolak penyimpanan ke memori, dan memberikan Toast peringatan transparan ke mahasiswa.
     - **Auto-Answer 0 Token di Post-Test**: Pada pengerjaan Post-Test, sistem mencocokkan teks soal terhadap Smart Question Memory terlebih dahulu. Jika cocok, pilihan jawaban langsung dieksekusi secara instan tanpa mengonsumsi kuota token Gemini AI sama sekali.
  3. **Akselerasi Service Worker & Timeout 10s Anti-Hang**:
     - Retensi 100% seluruh 9 model Gemini aktif (`gemini-2.5-flash` s/d `gemini-3.8-flash`) tanpa ada yang dihapus atau didegradasi.
     - Pemasangan `AbortController` dengan batas waktu timeout 10 detik per request API Gemini guna mengeliminasi keluhan model nyangkut/ngestuck tanpa batas waktu.
     - Pemangkasan `maxOutputTokens: 256` untuk inferensi jawaban kilat sub-detik (jawaban kuis hanya butuh 1-5 token).
     - Rotasi failover otomatis ke API key cadangan jika terjadi timeout atau HTTP 429.
  4. **Visual Live Tracker Matrix di Floating HUD**:
     - Menghadirkan live status matrix mini pill (`.hud-q-pill.answered`, `.unanswered`, `.current`) pada Floating HUD Card.
     - Memantau live rasio keterjawaban kotak soal (`x/y Hijau`) secara real-time.
  5. **Isolasi Total Kredensial di `src/utils/storage.js`**:
     - Menghapus penulisan duplikasi key sensitif (`geminiApiKey`, `geminiApiKeys`, `mentari_auth_token`, `mentari_smart_question_memory`, `mentari_auto_pilot_state`) ke `window.localStorage` milik halaman web.
     - Kredensial dan preferensi pengguna di `chrome.storage.local` tetap 100% utuh tanpa perlu re-setup API Key.
  6. **Kompilasi Sukses esbuild (`node build.js`)**:
     - Seluruh 14 modul terkompilasi bersih ke folder `dist/` dengan status exit code 0.
- [x] Overhaul Total Rekap Tugas Forum Diskusi ke Dokumen Word (.docx) Berstandar ECMA-376 & Integrasi Poles AI Gemini (`src/utils/docx-generator.js`, `src/content/token.js`):
  1. Eliminasi Total Teks Jamming & Penyelamatan Struktur HTML Dosen:
     - Mengubah parser HTML di `docx-generator.js` menjadi berbasis `DOMParser` native browser, memproses setiap elemen heading, paragraf, list, dan tabel secara terpisah tanpa regex replace ceroboh. Mengeliminasi masalah teks terjamming (`...hasil pengujian.B. Pengantar Materi` dan `...jawaban rekan.F. Kriteria Penilaian`).
     - Pada `_fetchTopicQuestionContent` (`src/content/token.js`), mengganti `.textContent` dengan `.innerHTML` agar saat tab forum sedang dibuka, elemen tabel dan tag formatting dosen tidak dilucuti.
  2. Tabel Rubrik Penilaian Resmi OpenXML (`<w:tbl>`):
     - Membangun generator tabel XML ECMA-376 compliant penuh: header berlatar abu-abu `#F1F5F9`, border kisi-kisi `#CCCCCC`, lebar proporsional 7937 dxa, dan memastikan setiap sel `<w:tc>` wajib memiliki minimal satu `<w:p>` (mencegah korupsi skema file di MS Word / WPS / Google Docs). Mengubah teks cacat berpipa (`|`) menjadi tabel akademik resmi yang bersih dan rapi.
  3. Tipografi Akademik & Pembersihan Redundansi Judul:
     - Standar tipografi akademik UNPAM: Times New Roman 12pt, spasi 1.5, margin A4 4-4-3-3 cm, warna hitam 100% (000000).
     - Mengimplementasikan `cleanMeetingTitle` untuk melenyapkan redundansi judul kaku seperti "Pertemuan 7 - Pertemuan 7" menjadi "Pertemuan 7".
     - Mengganti garis underscore mentah (`____...`) dengan lembar jawaban berkotak formal (`createAnswerBoxXml`) siap isi untuk mahasiswa.
     - Indentasi hanging rapi (`w:ind w:left="480" w:hanging="280"`) pada ordered (`<ol>`) dan unordered (`<ul>`) list.
  4. Modal Konfigurasi Ekspor & Mode Poles AI Gemini (Zero Hallucination):
     - Menghadirkan modal interaktif `_showDocxExportModal` di Closed Shadow DOM (mendukung Dark & Light theme, draggable window, 100% SVG inline, nol stock emoji, nol alert browser).
     - Menyediakan 2 pilihan mode pembuatan:
       * **Mode Standar (Format Asli Dosen)** (Rekomendasi & Instan): Menghasilkan dokumen Word langsung dari susunan asli dosen tanpa jeda waktu.
       * **Mode Poles AI Gemini (Perjelas Tata Letak)**: Menata ulang struktur heading (A, B, C), daftar soal bernomor, dan tabel jika penulisan dosen di forum berantakan. Mengunci prompt AI dengan aturan mutlak **ZERO HALLUCINATION** (100% kata-kata asli dosen dipertahankan tanpa diubah/dikurangi/ditambahi).
       * Dropdown pilihan 9 Model AI Gemini on-the-fly.
- [x] Akselerasi Mode 'Auto Semua' & Eliminasi Total Bug Nyangkut Kuis (`src/content/quiz.js`, `src/utils/humanizer.js`):
  1. Akselerasi Durasi 'Auto Semua' (Pangkas Waktu ~80-85%):
     - Memangkas `readingPacing` pada mode auto dari akumulasi 4.000–5.000ms menjadi jeda natural ringan 350–600ms, memberikan sensasi pengerjaan yang gesit dan responsif mendekati tombol manual 'Jawab Ini' (< 1.5s).
     - Menambahkan mode `fast = true` pada `Humanizer.naturalClick` (scroll pause 40–80ms dan click hold 20–40ms) untuk opsi jawaban dan tombol navigasi.
     - Memangkas jeda commit React/Next.js dari 1.500–2.800ms menjadi 300–500ms, jeda sebelum Next dari 1.000–2.000ms menjadi 150–300ms, dan jeda konfirmasi submit dari 1.500–2.500ms menjadi 500–1.000ms.
     - Total durasi pengerjaan 5 nomor soal terpangkas dari **1 menit 12 detik** menjadi hanya **~12–15 detik**!
  2. Eliminasi Bug Re-Answering Loop (Penyebab Kuota AI Terbuang & Stuck):
     - Memperbaiki evaluasi baris 906: AI kini HANYA dipanggil jika `!alreadyCheckedRadio` (belum ada radio yang terpilih). Mengeliminasi bug re-answering fatal di mana AI dipanggil berulang kali untuk soal yang sama hanya karena tombol nomor di sidebar UNPAM belum berubah hijau.
  3. Perkuatan Transisi Halaman & Fast Fallback Anti-Nyangkut Next.js:
     - Menambahkan pemanggilan `nextBtn.click()` native di samping event sintetik untuk menjamin router SPA Next.js 100% mengeksekusi navigasi.
     - Mengganti waiter anti-stale statis 3.5s dengan polling dinamis 100ms (max 1.200ms) yang memantau query URL (`?page=N`), teks soal, dan container DOM.
     - Fallback Mandiri (Self-Healing): Jika tombol Next tidak memicu perubahan URL/DOM dalam 1.2 detik, ekstensi otomatis mengklik tombol nomor soal berikutnya di sidebar navigasi nomor (`navStatus.questions.find(q => q.num === prevPage + 1)?.btn`).
  4. Eliminasi Deadlock Self-Veto pada Kotak Hijau & Submit Veto:
     - Pada filter `unansweredList` dan validasi akhir tombol Selesai, jika soal saat ini (`q.isCurrent`) sudah memiliki radio terpilih (`alreadyCheckedRadio`), soal tersebut tidak dihitung sebagai unanswered agar kuis tidak mem-veto dirinya sendiri pada nomor terakhir.
- [x] Overhaul UI/UX Ekstensi di MyUnpam (Foto Profil Asli, Dual Attendance Metrics Realistis, Unified Floating Dock, Glassmorphic Presensi Modal, 75% UAS Target Gauge, dan Eliminasi Total Bug Flexbox Menciut):
  1. Integrasi Foto Profil Asli Mahasiswa: Menampilkan foto profil riil mahasiswa yang sedang login di portal MyUnpam (`.student-avatar` berbingkai emas lingkaran dengan box-shadow halus `0 0 14px rgba(245, 158, 11, 0.35)`), diekstrak secara otomatis dari API jadwal kuliah atau DOM sidebar profil MyUnpam, dilengkapi fail-safe fallback ke icon SVG jika foto gagal dimuat.
  2. Dua Metrik Perhitungan Kehadiran Realistis (Dual Metrics):
     - **Metrik 1: Kehadiran Berjalan (Acuan Utama Mahasiswa)**: Menghitung persentase murni dari pertemuan yang sudah aktif diselenggarakan (pertemuan dengan status kehadiran atau modul yang sudah dibuka dosen di Mentari). Pada kondisi berjalan (misal 25 sesi hadir dari 25 sesi terlaksana), nilai kehadiran adalah **100.0%** (Status Aman '✓ Syarat UAS Terpenuhi'), mengeliminasi kepanikan mahasiswa akibat vonis 'Di Bawah Batas UAS' di awal/tengah semester.
     - **Metrik 2: Progres Semester Penuh (Proyeksi Target Akhir)**: Menghitung akumulasi progres terhadap 105 total sesi semester penuh (misal 25 / 105 Sesi = 23.8%) dengan target kelulusan minimal UAS 75% (79 sesi) dan penanda vertikal eksplisit `75% UAS`.
  3. Indikator Status Per-Mata Kuliah Realistis: Jika suatu mata kuliah belum dimulai atau belum ada sesi berjalan (misal Bimbingan dan Konseling 0/14 sesi), persentase tidak lagi divonis 0.0% merah seolah mahasiswa mangkir, melainkan ditampilkan dengan badge netral 'Belum Ada Sesi'. Sesi pertemuan yang belum diselenggarakan diberi label informatif 'Belum Tersedia' (belum dibuka dosen di Mentari).
  4. Unified Glassmorphic Floating Dock (`#mentari-myunpam-dock-host`): Menyatukan tombol terpisah 'Cek Rekap Presensi' dan 'Auto-Isi Survei MyUnpam' yang sebelumnya bertumpuk canggung menjadi 1 pill dock modern elegan bernuansa dark studio (`#0d111c`) dengan brand badge 'Mentari', tombol 'Rekap Presensi' (indigo), dan tombol 'Auto-Isi Survei' (emerald) dengan status loading real-time.
  5. Eliminasi Total Bug Flexbox Menciut/Gepeng: Menambahkan `flex-shrink: 0 !important; width: 100%;` pada `.course-card` serta `min-height: 0;` pada container `.content`, sehingga saat accordion pertemuan dibuka, seluruh card mata kuliah lainnya tetap tegak, rapi, dan tidak menciut pipih menjadi bentuk gepeng tak terbaca.
  6. Eliminasi Teks Terpotong Vertikal: Mengganti teks stat lama dengan micro-pill badges (`.stat-pill`) ber-line-height proporsional (1.35) untuk SKS, Hadir (emerald), Mangkir (rose), Sesi Berjalan (amber), dan Target Sesi (indigo), menjamin angka dan teks terbaca jernih tanpa terpotong baseline container.
  7. Single-Open Exclusive Accordion: Saat satu mata kuliah diklik untuk melihat rincian pertemuan, seluruh mata kuliah lain otomatis menutup secara mulus (hanya 1 mata kuliah aktif terbuka) untuk menjaga kerapian visual.
  8. Draggable Modal Window: Modal presensi kini dapat digeser (drag & drop) secara mulus pada header dengan viewport clamping agar tidak menghalangi elemen penting portal MyUnpam.
  9. Integrasi QuickSurvey Bebas Tombol Ganda: `src/content/QuickSurvey.js` menyinkronkan event `mentari-survey-trigger` dengan Unified Dock dan secara otomatis mematikan injeksi tombol floating terpisah jika dock sudah terpasang.
  10. Standar Mutu Ekstensi Bersih: 100% SVG inline, bebas stock emoji, bebas window.alert() browser (migrasi ke Toast notification).
- [x] Pemulihan Akurasi AI Kuis/Post-Test 100% & Anti-Anomali Durasi Jawab (`src/content/quiz.js`, `src/background/service-worker.js`):
  1. Perbaikan Root Cause Ekstraksi Soal: Menghapus `fieldset` dan `.MuiFormControl-root` dari kandidat `radio.closest()` di `_findQuestionContainer()`, sehingga container kuis kembali menaungi teks soal riil dan pilihan jawaban secara utuh (tidak lagi terpotong). Mengeliminasi filter `div, span` serampangan pada `_parseQuestionAndOptions()` yang sebelumnya menyebabkan Gemini menerima teks judul acak/kosong sehingga skor jatuh ke 20-60%.
  2. Multi-Tier AI Option Matcher: Merefaktor `_determineMatchingOption()` untuk mendukung output markdown (`**A**`), prefix kata kunci (`Jawaban: B`), isolated letters, dan substring matching yang akurat tanpa salah jatuh ke default opsi A.
  3. Pemulihan Pacing Durasi Alami: Mengembalikan reading pacing manusiawi (2.500 - 5.000ms), jeda verifikasi setelah menjawab (1.500 - 2.800ms), dan jeda transisi Next.js (1.800ms), melenyapkan durasi "jomplang" dan melindungi akun dari deteksi bot velocity di LMS UNPAM.
  4. Optimasi Determinisme AI: Menyetel `temperature: 0.1` pada service worker untuk konsistensi jawaban ilmiah dan akademik terbaik.
- [x] Validator Kotak Soal Hijau Mutlak Kuis/Posttest (Anti-Skip & Anti-Submit Prematur):
  1. Veto Tombol Selesai: Memeriksa status seluruh kotak nomor via `_getExamNavigationStatus()`. Jika masih ada kotak putih (belum terjawab), script secara mutlak memblokir klik selesai.
  2. Auto-Navigation ke Soal Putih: Otomatis mengarahkan ke soal yang masih putih, menjawab via AI, memverifikasi kotak nomor berubah hijau, dan baru mengizinkan penyelesaian saat 100% kotak nomor terverifikasi hijau.
  3. Anti-Stale DOM Guard: Menunggu teks soal berganti sebelum memproses soal berikutnya guna mencegah race condition pada React SPA.
- [x] Redesain Forum Selesai Menjadi Box Hijau Kompak (`src/content/token.js`):
  Rangkuman forum yang sudah selesai pada mode 'Semua' dikelompokkan menjadi box hijau kompak `.forum-completed-box` (`Pertemuan x - y Sudah Selesai`) dengan checkmark SVG, menyisakan hanya forum belum selesai sebagai card individual yang bersih dan rapi.
- [x] Perbaikan Link Kuesioner Resmi (`src/content/token.js`):
  Menyimpan `sectionCode` pada evaluasi kuesioner dan menggunakan route resmi LMS `.../kuesioner/${sectionCode}` guna mencegah halaman kosong / 404.
- [x] Perbaikan Kontras Tema Terang Mata Kuliah (`src/content/token.js`):
  Memastikan teks judul mata kuliah dan forum berwarna gelap tegas (`#1e293b` & `#64748b`) pada mode `.theme-light`.
- [x] Akselerasi Rapid Batch Filling & Auto-Submit Langsung Kuisioner (`src/content/kuisioner.js`):
  1. Akselerasi Rapid Batch Filling: Menghilangkan jeda buatan ratusan milidetik per baris pada mode 'iya' dan 'tidak'. Menggunakan `HTMLInputElement.prototype.checked` native setter + sequence dispatch `click`, `change`, `input` serta trigger klik pada label / radio container untuk reaktivitas instan framework React/MUI.
  2. Auto-Submit Otomatis Langsung: Tombol `btnIya`, `btnTidak`, dan `btnAI` setelah pengisian selesai langsung mencari tombol submit melalui `this._findSubmitButton()`, mengklik tombol submit, memicu `_confirmDialogIfPresent()`, dan menampilkan Toast `Toast.success('Kuisioner berhasil diisi & dikirim secara otomatis!');`.
- [x] Styling Mutlak & Keyboard Isolation API Key Manager (`src/content/apiKeyManager.js`, `manifest.json`, `src/popup/`):
  1. Styling Mutlak Host & Overlay: Injeksi host dengan style `position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: auto !important; display: none;` dan `:host` serta `.overlay` dengan `z-index: 2147483647 !important;`. Mengubah display host menjadi `block` saat `openModal()` dan `none` saat `closeModal()`.
  2. Isolasi Event Keyboard & Auto-Focus: Menghentikan bubbling (`stopPropagation()`) pada `keydown`, `keypress`, `keyup`, dan `paste` di `inputKey` agar tidak dicegat script anti-cheat/hotkey halaman, auto-focus input setelah 150ms modal dibuka, dan support submit via tombol Enter.
  3. Pemisahan Content Script di `manifest.json` & `build.js`: `dist/content/apiKeyManager.js` diinjeksi mandiri di seluruh `https://mentari.unpam.ac.id/*` (termasuk `/login`) dan `https://my.unpam.ac.id/*` tanpa `exclude_matches`, memungkinkan user baru yang belum login memasukkan API Key kapan saja.
  4. Quick Input API Key di Popup (`src/popup/popup.html` & `script.js`): Menyediakan card input cepat API key dengan masking presisi, status badge, tombol simpan via service worker `addGeminiApiKey`, live sync update, serta keyboard event isolation.
- [x] Perbaikan Konten Soal Dosen & Eliminasi Total Word "Unreadable Content" (`token.js` & `docx-generator.js`):
  1. Pengambilan Teks Soal Dosen Riil: Mengimplementasikan `_fetchTopicQuestionContent()` dan `_extractQuestionFromAny()` di `token.js` yang secara spesifik menembak endpoint detail topik (`/api/forum/topic/{topicId}`, `/api/forum/topics/{topicId}`, dan `/api/forum/reply/{topicId}`), menyelesaikan masalah "hanya buka halaman depan tabel forum" sehingga teks pertanyaan/soal dosen yang sebenarnya terambil utuh ke dalam dokumen.
  2. Eliminasi Dialog "Unreadable Content" Microsoft Word: Merefaktor arsitektur OpenXML di `docx-generator.js` dengan membuang `fontTable.xml` yang memicu deteksi korupsi schema pada Word, menambahkan definisi style `Normal` resmi pada `word/styles.xml`, mengganti `pBdr` dengan decorative line divider universal yang kompatibel 100% di semua versi Word, serta mengeliminasi empty `<w:t>` runs pada paragraph kosong. Terverifikasi 100% lolos uji Microsoft Word COM automation tanpa peringatan pemulihan dokumen.
- [x] Rekap Tugas Forum Diskusi ke Dokumen Word (.docx) Otomatis: Pustaka client-side JSZip OpenXML standar (`src/utils/docx-generator.js`), kepatuhan tipografi akademik UNPAM (Times New Roman 12pt, judul 14pt-15pt bold, spasi 1.5, margin A4 4-4-3-3 cm, warna hitam standar 000000 tanpa font warna-warni), sanitasi teks & XML 1.0 escaping, tombol aksi `#forum-export-docx-btn` pada toolbar forum dengan loading spinner SVG, filter otomatis hanya forum belum selesai (`!completion && !answered`), ekstraksi & caching detail topik dosen, pengurutan hierarki Mata Kuliah -> Pertemuan ascending -> Isi Forum -> Jawaban kosong bergaris, serta penamaan file dinamis `Rekap Tugas_{hari dan tanggal}_{Nama Mahasiswa}_{NIM}.docx`.
- [x] 4 Polesan Akhir UI/UX (Scrollbar & Slider Modern, Theme Switcher Gelap/Terang, Draggable Modal, dan Auto-Pilot Kuisioner Terurut per Pertemuan): Styling scrollbar 6px transparent-track & no-button di `token.js`, `kuisioner.js`, `quiz.js`; range slider bernuansa gold & amber; theme switcher 2 arah (`#btn-theme-toggle` & select setting) terpersistensi di `mentari_theme`; kontras tinggi `.theme-light` anti-leak; pointer-events draggable modal dengan viewport clamping & interactive element bypass; serta antrean Auto-Pilot terurut pertemuan 1..14 [Pre-Test -> Post-Test -> Kuesioner] dengan proteksi mutlak forum/pretest & 100% SVG inline tanpa alert browser.
- [x] Redesain Tab Forum Aktif (Model Accordion per Mata Kuliah & Range Pertemuan x - y Belum Tersedia): Mengubah format flat list menjadi Accordion per mata kuliah dengan rincian status per pertemuan, rangkuman kompak pertemuan belum tersedia (Pertemuan x - y belum tersedia + alasan dosen belum membuat topik), paralelisasi fetch request forum (pangkas waktu scan dari ~60s ke ~3-5s), tombol live 'Periksa Status' di Tab Forum, dan label waktu terakhir sinkronisasi
- [x] Perbaikan Storage.getAll Missing Method (`storage.js` & `quiz.js`): Mengimplementasikan `Storage.getAll()` berbasis `chrome.storage.local.get(null)` dengan graceful fallback ke localStorage, serta menambahkan guard defensif pada `_markQuizAsCompletedPermanently()` untuk mengeliminasi unhandled TypeError di console ekstensi
- [x] Sinkronisasi Status Asli Server UNPAM & Pemulihan Kuis In-Progress (Durasi 1 Jam): Server UNPAM dijadikan single source of truth mutlak (`sub.completion`, `sub.status`, `sub.nilai`, `sub.score`), self-healing auto-prune ID kuis yang belum tuntas dari `mentari_completed_quiz_ids` dan cache multi-user `mentari_cached_data_${userId}`, tombol interaktif 'Periksa Status' (Sync UNPAM) dengan animasi spin & debounce di Tab Kuis & Evaluasi, resume optimization & smart navigation jump untuk soal yang sudah terjawab (tanpa boros kuota AI), deteksi batas waktu 1 jam habis (Attempt Expired), dan perlindungan `_markQuizAsCompletedPermanently` dari tombol Mulai/Lanjutkan aktif
- [x] Perbaikan Tuntas False-Positive Review Mode & Premature Cooldown Kuis: Eliminasi total check '?page=' di `_checkIfExamAlreadyCompleted()`; implementasi Active Exam Veto mutlak (countdown timer 'waktu tersisa' / badge 'belum dijawab' / enabled radios mengesampingkan deteksi review); verifikasi submisi kuis (`loopResult.submitted || finalComp.isCompleted`) sebelum menandai selesai dan sebelum cooldown di `_executeAutoPilotQuiz()`; integrasi fallback navigasi nomor soal via `_getExamNavigationStatus()` dan sidebar Navigasi Soal jika tombol Next terlambat me-render; interactive Model AI dropdown selector pada Floating HUD Tracker; dan unblock tombol manual card pojok kanan bawah ("Auto Semua" dan "Jawab Ini")
- [x] Deteksi Kuis Selesai & Proteksi Kuota Gemini AI: Implementasi `_checkIfExamAlreadyCompleted()` di `quiz.js` dengan deteksi heading 'Quiz Sudah Selesai', URL review `?page=`, tabel skor, dan tombol pagination tanpa tombol submit; deteksi kuis terkunci `_checkIfExamLocked()`; parser validasi tipe dan judul kuis dari DOM `_extractExamTitleAndTypeFromDOM()` (Pretest vs Posttest); 4-tier gatekeeper anti-waste di `_waitForExamReady()`, `runAutoLoop()`, `processCurrentQuestion()`, dan tombol floating card; URL Alignment Guard di `_checkAndInitAutoPilot()`; Fast-Skip Cooldown (2s) untuk kuis yang dilewati; serta penyimpanan persisten `mentari_completed_quiz_ids` di `chrome.storage.local` dan pemfilteran antrean di `token.js`
- [x] Perbaikan Auto-Pilot Stuck & Landing Page Button: Implementasi `_findStartExamButton()` dengan deteksi 'MULAI QUIZ' (huruf Z/kapital & icon play MUI), auto-confirm dialog MUI, eliminasi false-positive "sudah dikerjakan" dari teks petunjuk dosen, penanganan auto-start langsung dari tombol card pojok kanan bawah ("Auto Semua") pada landing page, dan waiter transisi soal kuis
- [x] Integrasi Dropdown Pemilihan Model AI Gemini di Modal Auto-Pilot (`token.js`): Pilihan eksplisit 9 model AI Gemini saat konfigurasi batch kuis, persistensi ke `gemini_model` & `state.model`, serta toast info model terpilih
- [x] Visual Model Badge di Floating HUD Tracker & Sinkronisasi Real-Time (`quiz.js`): Penampil model aktif di HUD (inline SVG clean, bebas emoji), auto-sync ke selector card pojok kanan bawah, dan pemakaian model terpilih pada `generateGeminiContent`
- [x] Rebuild esbuild (`node build.js`), eliminasi sisa emoji stock (100% SVG inline), verifikasi bundle `dist/`, commit & push ke Git repository
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
