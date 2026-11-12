# Data Schema & State Specification — Mentari Mod Modern Edition v2.1

## 1. Storage Schema (`chrome.storage.local`)

Ekstensi menyimpan seluruh preferensi dan cache sementara di `chrome.storage.local`.

| Key | Tipe Data | Deskripsi |
|---|---|---|
| `token` | `string` | JWT Bearer token otentikasi aktif dari portal Mentari UNPAM. |
| `geminiApiKeys` | `string[]` | Array daftar API Key Gemini milik pengguna untuk rotasi multi-key. |
| `geminiActiveKeyIndex` | `number` | Indeks key yang sedang aktif dalam array `geminiApiKeys`. |
| `geminiModel` | `string` | Nama model AI terpilih (default: `gemini-2.5-flash`). |
| `humanizerDelayMin` | `number` | Batas bawah jeda waktu acak pengerjaan kuis (dalam milidetik, misal `1500`). |
| `humanizerDelayMax` | `number` | Batas atas jeda waktu acak pengerjaan kuis (dalam milidetik, misal `3500`). |
| `autoPilotState` | `AutoPilotState` | Objek status sesi Auto-Pilot yang sedang berjalan. |
| `activeTheme` | `'light' \| 'dark'` | Tema visual antarmuka pengguna. |

## 2. Model Objek Evaluasi (`EvalItem`)

Struktur data internal yang merepresentasikan setiap Pre-Test, Post-Test, atau Kuesioner:

```typescript
interface EvalItem {
  id: string;                      // ID unik item kuis / evaluasi
  courseId: string;                // ID mata kuliah di portal LMS
  courseName: string;              // Nama mata kuliah
  sectionName: string;             // Nama sesi / pertemuan (misal: "Pertemuan 15")
  meetingNum: number;              // Nomor pertemuan numerik (1 - 21)
  type: 'PRE' | 'POST' | 'KUES';   // Kategori evaluasi
  title: string;                   // Judul kuis di LMS
  rawStatus: string;               // Status mentah dari LMS ("Selesai", "Belum Dikerjakan", dsb)
  resolvedStatus: EvalStatus;      // Status semantik hasil normalisasi ekstensi
  completion: boolean;             // Boolean apakah item telah selesai 100%
  locked: boolean;                 // Boolean apakah item terkunci oleh sistem LMS
  warningAlert?: string;           // Pesan peringatan prasyarat dari database LMS
  url: string;                     // Tautan pengerjaan kuis/evaluasi
  forumUrl?: string;               // Tautan langsung ke forum prasyarat terkait jika ada
  nilai?: number | null;           // Nilai hasil pengerjaan (khusus kuis)
}

type EvalStatus = 
  | 'DONE'              // Sudah tuntas
  | 'READY'             // Siap dikerjakan langsung
  | 'WAITING_FORUM'     // Menunggu forum dijawab mahasiswa
  | 'FORUM_NOT_OPEN'    // Forum belum dibuka dosen
  | 'WAITING_PRETEST'   // Menunggu Pre-Test pertemuan terkait
  | 'WAITING_POSTTEST'  // Menunggu Post-Test pertemuan terkait
  | 'LMS_LOCKED';       // Terkunci oleh jadwal akademik LMS
```

## 3. Skema Auto-Pilot State (`AutoPilotState`)

```typescript
interface AutoPilotState {
  isActive: boolean;               // Apakah sesi Auto-Pilot sedang aktif
  mode: 'all' | 'quiz' | 'kues';   // Lingkup eksekusi
  courseScope: string;             // 'all' atau ID mata kuliah spesifik
  surveyPref: 'ya' | 'tidak';      // Preferensi pengisian kuesioner dosen
  currentIndex: number;            // Indeks item yang sedang dieksekusi dalam queue
  total: number;                   // Jumlah total item dalam antrean
  queue: QueueItem[];              // Daftar sekuensial item yang akan dijalankan
  skippedPrereqs: SkippedItem[];   // Daftar item yang dilewati karena prasyarat belum lengkap
  startedAt: number;               // Timestamp waktu mulai eksekusi
}

interface QueueItem {
  id: string;
  courseCode: string;
  courseName: string;
  meetingNum: number;
  sectionName: string;
  type: 'PRE' | 'POST' | 'KUES';
  url: string;
  statusLabel: string;             // 'Syarat Terpenuhi' | 'Setelah Post-Test Selesai'
}

interface SkippedItem {
  courseName: string;
  meetingNum: number;
  type: string;
  reason: string;                  // Deskripsi alasan dilewati (contoh: "Forum Diskusi belum dibuka/dibuat dosen")
}
```
