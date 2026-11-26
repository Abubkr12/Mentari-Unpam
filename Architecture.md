# System Architecture Document — Mentari Mod Modern Edition v2.1

## 1. High-Level Overview
Mentari Mod Modern Edition dibangun di atas platform **Google Chrome Extensions Manifest V3**. Arsitektur memisahkan runtime ke dalam 4 domain eksekusi:
1. **Background Service Worker**: Menangani panggilan inferensi eksternal (Google Gemini API), koordinasi network, dan penyimpanan token.
2. **Main World Content Script (`main-sniffer.js`)**: Berjalan di execution context halaman web utama untuk menyadap JWT bearer token dari request internal portal UNPAM (`window.fetch` / `XMLHttpRequest`).
3. **Isolated World Content Scripts**: Komponen UI, orchestrator evaluasi, pengisi otomatis kuis, dan presensi yang berjalan dalam sandbox ekstensi yang aman.
4. **Extension Popup**: Antarmuka ringkas cepat untuk status koneksi, token, dan tautan langsung ke dasbor lengkap.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Portal LMS UNPAM Web Page                       │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   main-sniffer.js     │             │     token.js (Dasbor)      │  │
│  │  (Intercepts Bearer)  │             │  • Forum Agregator         │  │
│  └──────────┬────────────┘             │  • Kuis & Evaluasi Matriks │  │
│             │ PostMessage              │  • Auto-Pilot Orchestrator │  │
│  ┌──────────▼────────────┐             └─────────────┬──────────────┘  │
│  │       content.js      │                           │                 │
│  │  (Relay ke Storage)   │                           │                 │
│  └──────────┬────────────┘                           │                 │
└─────────────┼────────────────────────────────────────┼─────────────────┘
              │ chrome.storage                         │ chrome.runtime.sendMessage
┌─────────────▼────────────────────────────────────────▼─────────────────┐
│                    Background Service Worker                           │
│  • API Key Pool & Rate-Limit Rotator                                   │
│  • Upstream Model Alias Resolver                                       │
│  • Secure HTTPS Proxy ke Google Gemini Generative Language API         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
                   Google Gemini API (v1beta / Free Tier)
```

## 2. Directory Structure
```
Mentari-Unpam-v2.0_2/
├── dist/                                # Output kompilasi (Folder Unpacked Extension)
│   ├── assets/                          # Ikon dan gambar latar
│   ├── background/                      # Bundled background worker
│   ├── content/                         # Bundled content scripts
│   ├── popup/                           # Bundled popup script & html
│   └── manifest.json                    # Manifest terdistribusi dengan path relatif
├── src/                                 # Source code mentah
│   ├── assets/                          # Aset grafis
│   ├── background/
│   │   └── service-worker.js            # Service worker & proxy Gemini
│   ├── content/
│   │   ├── main-sniffer.js              # Sniffer token di MAIN world
│   │   ├── content.js                   # Listener & bridge storage
│   │   ├── token.js                     # Modal utama, dasbor forum, kuis & evaluasi
│   │   ├── quiz.js                      # Otomasi kuis & parser opsi
│   │   ├── kuisioner.js                 # Otomasi pengisian kuesioner dosen
│   │   ├── presensi.js                  # Modul tracking kehadiran
│   │   ├── discus.js                    # Injeksi helper forum diskusi
│   │   ├── apiKeyManager.js             # Modal pengelolaan API key
│   │   ├── QuickSurvey.js               # Survey cepat
│   │   ├── pw.js                        # Helper password/login
│   │   └── home.js                      # Modul landing page
│   ├── popup/
│   │   ├── popup.html                   # HTML popup ekstensi
│   │   └── script.js                    # Logika popup
│   └── utils/
│       ├── autopilot-sync.js            # Engine sinkronisasi real-time antrean kuesioner
│       ├── course-parser.js             # Parser metadata matkul, materi, progres, dan peserta unik
│       ├── docx-generator.js            # Generator file Word DOCX draf tugas/forum
│       ├── md-generator.js              # Generator file Markdown terstruktur
│       ├── dom.js                       # Utilitas manipulasi DOM aman
│       ├── humanizer.js                 # Algoritma jitter delay anti-deteksi bot
│       ├── unpam-auth.js                # Interceptor JWT (string, object, dan array Mentari)
│       └── storage.js                   # Abstraksi chrome.storage.local
├── build.js                             # Script bundler esbuild
├── package.json                         # Dependensi (esbuild, docx)
├── manifest.json                        # Source manifest ekstensi
├── PRD.md                               # Dokumen kebutuhan produk
├── Architecture.md                      # Dokumen arsitektur sistem
├── Design.md                            # Dokumen desain UI/UX
├── Schema.md                            # Skema struktur data dan storage
├── Goals.md                             # Target dan roadmap rilis
├── Rules.md                             # Aturan teknis dan konvensi kode
├── task.md                              # Pelacakan tugas aktif dan arsip
└── README.md                            # Dokumentasi publik & panduan instalasi
```

## 3. Key Architectural Decisions

### 3.1. Build System via esbuild (`build.js`)
- Menggunakan `esbuild` untuk mengompilasi modular JavaScript (ES Modules) menjadi bundel tersendiri dengan format IIFE untuk content scripts dan ESM untuk background service worker.
- Menghasilkan struktur `dist/` mandiri yang berisi seluruh aset dan `dist/manifest.json` yang siap di-load langsung di Chromium.

### 3.2. Token Interception Architecture
- Token JWT disimpan di memori runtime klien portal UNPAM. Ekstensi menginjeksi `main-sniffer.js` pada fase `document_start` di execution context `MAIN`.
- Fungsi `fetch` dan `XMLHttpRequest` di-wrap untuk mendeteksi header `Authorization: Bearer <token>`.
- Token dikirimkan ke isolated content script via `window.postMessage`, lalu disimpan di `chrome.storage.local`.

### 3.3. Multi-Key Pooling & Fallback Engine
- Service worker memelihara daftar API Key pengguna.
- Sebelum memanggil endpoint Google Generative Language, fungsi `resolveUpstreamModel` memetakan nama model frontend ke versi stabil (`gemini-2.5-flash`).
- Jika sebuah key terkena limit kuota HTTP 429, request dialihkan secara otomatis ke key berikutnya di pool tanpa memutus proses yang sedang berjalan.

### 3.4. Auto-Pilot Dynamic Queue & Prerequisites Ladder
- Sistem antrean membaca data mentah dari API course UNPAM (`/api/user-course/{courseCode}`).
- Status kuis dan kuesioner dievaluasi secara berjenjang berdasarkan matriks prasyarat forum dan pre-test.
- Antrean kuesioner disinkronkan secara real-time melalui polling mikro setelah setiap batch post-test tuntas dieksekusi.

### 3.5. ADR v2.1.4: Pertahanan Opsi A, Tolak Gimmick Pet, & Jalur Auto-Pilot DOM
- **Context**: Evaluasi terhadap upstream `Mentari Mod v2.0 Sunset` (GitLab) menunjukkan beberapa fitur praktis (daftar materi per pertemuan, daftar mahasiswa sekelas, skor quiz) beserta gimmick `pet.html` dan submit API kuis headless.
- **Decision**: Mempertahankan **Opsi A** (satu hub UI terpadu di Closed Shadow DOM) dengan memperluas Tab `Mata Kuliah` (accordion pertemuan + unduh materi + inline notice kosong), menambah Tab `Mahasiswa` (dedup by NIM + daftar matkul per mahasiswa + filter matkul), menambah lazy fetch skor quiz (`GET /api/quiz/peserta/{id}`), dan memperketat `UnpamAuth` untuk format array `[{role, token}]` + reset cache saat ganti akun.
- **Alternatives Considered & Rejected**: Dual-mode popover (ditolak agar tidak menggandakan logika UI), gimmick `pet.html`/`pet.js` (ditolak karena loop `requestAnimationFrame` boros CPU dan bug tema malam), serta submit API kuis/forum instan headless (ditolak demi menjaga keaslian alur Auto-Pilot DOM + Humanizer serta fitur Rekap Tugas `.docx`/`.md`).
- **Consequences**: Seluruh fitur baru bekerja tanpa request jaringan tambahan pada data dasar (memanfaatkan response `/api/user-course/{kode}` yang sudah diambil).
