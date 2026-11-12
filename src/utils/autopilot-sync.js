/**
 * Mentari Mod Modern Edition - Auto-Pilot Real-Time Synchronizer
 * Mengelola sinkronisasi real-time antrean kuis & kuesioner dengan Single Source of Truth server UNPAM.
 * Mendeteksi pembukaan otomatis kuesioner dosen pasca-submisi post-test tanpa reset prematur.
 */

import { UnpamAuth } from './unpam-auth.js';
import { AutoPilotState } from './storage.js';

export const AutoPilotSync = {
  /**
   * Memindai API Mentari UNPAM untuk menemukan kuesioner yang baru terbuka (unlocked)
   * @param {Object} options
   * @param {Array} options.coursesMeta - List of { code, title }
   * @param {Array} options.currentQueue - Current queue items to prevent duplication
   * @returns {Promise<Array>} List of newly unlocked kuesioner queue items
   */
  async fetchUnlockedKuesionerList({ coursesMeta = [], currentQueue = [] } = {}) {
    try {
      const token = await UnpamAuth.getAuthToken();
      if (!token) {
        console.warn('[AutoPilotSync] Token autentikasi tidak ditemukan.');
        return [];
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      // 1. Dapatkan daftar mata kuliah target
      let targetCourses = Array.isArray(coursesMeta) && coursesMeta.length > 0 ? [...coursesMeta] : [];
      if (targetCourses.length === 0) {
        try {
          const res = await fetch('https://mentari.unpam.ac.id/api/user-course?page=1&limit=50', { headers });
          if (res.ok) {
            const data = await res.json();
            const list = data.data || (Array.isArray(data) ? data : []);
            targetCourses = list.map(c => ({
              code: c.kode_course || c.kode || c.course_code || c.id,
              title: c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah'
            })).filter(c => c.code);
          }
        } catch (e) {
          console.warn('[AutoPilotSync] Gagal memuat daftar user-course fallback:', e);
        }
      }

      if (targetCourses.length === 0) return [];

      const newlyUnlocked = [];
      const existingIds = new Set(
        (currentQueue || []).map(q => String(q.id || q.subId || ''))
      );

      // 2. Fetch detail section per mata kuliah secara paralel
      await Promise.allSettled(targetCourses.map(async (c) => {
        try {
          const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(c.code)}`, { headers });
          if (!cRes.ok) return;
          const cData = await cRes.json();
          const sections = Array.isArray(cData) ? cData : (cData.data || []);

          for (const section of sections) {
            let meetingNum = null;
            const match = (section.nama_section || '').match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
            if (match) {
              meetingNum = parseInt(match[1], 10);
            } else if (typeof section.urutan === 'number' && section.urutan > 0) {
              meetingNum = section.urutan;
            }
            const sectionName = section.nama_section || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${section.urutan || ''}`);
            const sectionCode = section.kode_section || section.nama_section || section.id;

            const subSections = section.sub_section || [];
            for (const sub of subSections) {
              const kt = String(sub.kode_template || sub.template || sub.type || sub.tipe || sub.kode_sub_section || '').trim().toUpperCase();
              const subTitle = String(sub.nama_sub_section || sub.judul || sub.title || sub.name || sub.deskripsi || '').toLowerCase();
              const isKues = kt.includes('KUES') || kt.includes('KUIS') || kt.includes('SURV') || kt.includes('ANGKET') || kt.includes('EVAL') || kt.includes('EDOM') ||
                             subTitle.includes('kuesioner') || subTitle.includes('kuisioner') || subTitle.includes('evaluasi') || subTitle.includes('angket') || subTitle.includes('survei') || subTitle.includes('survey') || subTitle.includes('edom');

              const validSubId = sub.id || sub._id || sub.id_sub_section || sub.sub_id || `KUESIONER_${meetingNum || section.urutan || 'sec'}`;

              if (isKues && validSubId) {
                const subIdStr = String(validSubId);
                // Cek status locked (abaikan jika alert hanya komplain post-test dari cache lama server, karena fase post-test sudah selesai)
                const isPostTestAlert = sub.warningAlert && /post[- ]?test/i.test(sub.warningAlert);
                const isHardLocked = !!(sub.warningAlert && sub.warningAlert.length > 0 && !isPostTestAlert);

                // Cek status completion resmi (jika masih mengeluhkan post-test, belum selesai!)
                let isLmsCompleted = false;
                if (!isPostTestAlert) {
                  isLmsCompleted = Boolean(
                    sub.completion === true ||
                    sub.completion === 1 ||
                    sub.completion === '1' ||
                    sub.completion === 'true' ||
                    sub.is_completed === true ||
                    sub.completed === true ||
                    sub.is_done === true ||
                    sub.status === 'completed' ||
                    sub.status === 'done' ||
                    (Array.isArray(sub.history) && sub.history.length > 0)
                  );
                }

                // Hanya masukkan jika belum selesai dan sudah terbuka (tidak terkunci keras lagi)
                if (!isLmsCompleted && !isHardLocked && !existingIds.has(subIdStr)) {
                  existingIds.add(subIdStr);
                  newlyUnlocked.push({
                    id: validSubId,
                    subId: validSubId,
                    sectionCode: sectionCode,
                    courseCode: c.code,
                    courseTitle: c.title,
                    sectionName: sectionName,
                    meetingNum: meetingNum,
                    type: 'KUESIONER',
                    name: sub.nama_sub_section || sub.judul || 'Kuesioner Evaluasi Dosen',
                    url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(c.code)}/kuesioner/${encodeURIComponent(sectionCode || validSubId)}`,
                    status: 'pending',
                    statusLabel: 'Siap Diisi'
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[AutoPilotSync] Gagal memuat section matkul ${c.code}:`, err);
        }
      }));

      // Urutkan kuesioner baru berdasarkan nomor pertemuan
      newlyUnlocked.sort((a, b) => {
        const numA = typeof a.meetingNum === 'number' ? a.meetingNum : 999;
        const numB = typeof b.meetingNum === 'number' ? b.meetingNum : 999;
        return numA - numB;
      });

      return newlyUnlocked;
    } catch (e) {
      console.error('[AutoPilotSync] Error saat fetch kuesioner terbuka:', e);
      return [];
    }
  },

  /**
   * Real-Time Sweep & Queue Replenishment
   * Menambahkan kuesioner yang baru terbuka ke dalam antrean Auto-Pilot
   * @param {Object} state - Current AutoPilot state
   * @param {HTMLElement} [statusEl] - Optional status element to show progress
   * @returns {Promise<boolean>} True jika ada kuesioner yang berhasil ditambahkan ke antrean
   */
  async syncAndAppendKuesioner(state, statusEl = null) {
    if (!state || !state.active || !Array.isArray(state.queue)) return false;

    if (statusEl) {
      statusEl.textContent = 'Sinkronisasi Real-Time: Memeriksa kuesioner yang baru terbuka di server UNPAM...';
    }

    // Jeda 1.2 detik agar server LMS commit status post-test terakhir
    await new Promise(r => setTimeout(r, 1200));

    const newlyUnlocked = await this.fetchUnlockedKuesionerList({
      coursesMeta: state.coursesMeta,
      currentQueue: state.queue
    });

    if (newlyUnlocked.length > 0) {
      console.log(`[AutoPilotSync] Berhasil mendeteksi ${newlyUnlocked.length} kuesioner baru yang terbuka:`, newlyUnlocked);
      
      // Tambahkan ke antrean state
      state.queue.push(...newlyUnlocked);
      state.total = state.queue.length;
      state.updatedAt = Date.now();
      await AutoPilotState.set(state);

      if (statusEl) {
        statusEl.textContent = `Sinkronisasi sukses! Menemukan ${newlyUnlocked.length} kuesioner yang siap dikerjakan.`;
      }
      return true;
    }

    console.log('[AutoPilotSync] Tidak ditemukan kuesioner baru yang terbuka.');
    return false;
  }
};
