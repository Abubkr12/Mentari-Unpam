const MATERIAL_TYPE_LABELS = {
  POWER_POINT: 'Power Point',
  BUKU_ISBN: 'Buku ISBN',
  VIDEO_AJAR: 'Video Ajar',
  ARTIKEL_RISET: 'Artikel Riset',
  MATERI_LAINNYA: 'Materi Lainnya',
  PENUGASAN_TERSTRUKTUR: 'Penugasan'
};

export const MATERIAL_TEMPLATES = new Set(Object.keys(MATERIAL_TYPE_LABELS));

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getMaterialTypeLabel(kodeTemplate) {
  return MATERIAL_TYPE_LABELS[String(kodeTemplate || '').toUpperCase()] || 'Materi';
}

export function formatDurationSeconds(sec) {
  if (sec === null || sec === undefined || sec === '') return '-';
  const totalSec = Number(sec);
  if (!Number.isFinite(totalSec) || totalSec < 0) return '-';
  const rounded = Math.round(totalSec);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} menit`;
}

export function parseCourseMeta(course) {
  const courseCode = String(course?.kode_course || course?.kode || course?.course_code || course?.id || '');
  const rawName = String(course?.coursename || course?.nama_mata_kuliah || course?.name || '').trim();

  const sksMatch = rawName.match(/^\[(\d+)\]/);
  const sks = sksMatch ? sksMatch[1] : (course?.sks ? String(course.sks) : '');

  const hariMatch = rawName.match(/\(([^)]+)\)/);
  const hari = hariMatch ? hariMatch[1].trim() : (course?.hari ? String(course.hari).trim() : '');

  const kelasMatch = rawName.match(/#\s*([^\s(]+)/);
  const kelas = kelasMatch ? kelasMatch[1].trim() : (course?.kode_kelas || course?.kelas ? String(course.kode_kelas || course.kelas).trim() : '');

  let title = rawName
    .split('#')[0]
    .replace(/^\[\d+\]\s*/, '')
    .replace(/\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();

  if (!title) {
    title = String(course?.nama_mata_kuliah || rawName || 'Mata Kuliah').trim();
  }

  return { courseCode, title, rawName, sks, hari, kelas };
}

function buildMaterialDownloadUrl(file) {
  const cleaned = String(file || '').trim().replace(/^\/+/, '');
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  const encodedPath = cleaned.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return `https://mentari.unpam.ac.id/api/file/${encodedPath}`;
}

function isSubCompletionTruthy(sub) {
  return Boolean(
    sub?.completion === true ||
    sub?.completion === 1 ||
    sub?.completion === '1' ||
    sub?.completion === 'true' ||
    sub?.is_completed === true ||
    sub?.completed === true
  );
}

function isSectionCompleted(subSections) {
  if (!Array.isArray(subSections) || subSections.length === 0) return false;
  const hasDoneKuesioner = subSections.some((sub) => {
    const kt = String(sub.kode_template || sub.tipe || '').toUpperCase();
    return (kt.includes('KUES') || kt.includes('QUES')) && isSubCompletionTruthy(sub);
  });
  if (hasDoneKuesioner) return true;

  const trackables = subSections.filter((sub) => {
    const kt = String(sub.kode_template || '').toUpperCase();
    return (kt === 'FORUM_DISKUSI' || kt === 'POST_TEST') && sub.id;
  });
  if (trackables.length === 0) return false;
  return trackables.every((sub) => isSubCompletionTruthy(sub));
}

// Count completed meetings against numbered/total sections so empty meetings never reduce progress.
export function extractCourseDetail(course, cData) {
  const meta = parseCourseMeta(course);
  const rawSections = Array.isArray(cData) ? cData : (cData?.data || []);

  const sections = rawSections.map((section, idx) => {
    const rawSectionName = String(section?.nama_section || '').trim();
    const match = rawSectionName.match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
    let meetingNum = null;
    if (match) {
      meetingNum = parseInt(match[1], 10);
    } else if (typeof section?.sort === 'number' && section.sort > 0) {
      meetingNum = section.sort;
    } else if (typeof section?.urutan === 'number' && section.urutan > 0) {
      meetingNum = section.urutan;
    }

    const sectionCode = String(section?.kode_section || `sec-${idx + 1}`);
    const sectionName = rawSectionName || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${idx + 1}`);
    const subSections = Array.isArray(section?.sub_section) ? section.sub_section : [];

    const materials = [];
    for (const sub of subSections) {
      const kt = String(sub?.kode_template || '').toUpperCase();
      if (!MATERIAL_TEMPLATES.has(kt)) continue;
      const rawFile = sub?.file ? String(sub.file).trim() : '';
      const rawLink = sub?.link ? String(sub.link).trim() : '';
      if (!rawFile && !rawLink) continue;

      const externalUrl = /^https?:\/\//i.test(rawLink) ? rawLink : '';
      const downloadUrl = rawFile ? buildMaterialDownloadUrl(rawFile) : '';
      if (!downloadUrl && !externalUrl) continue;

      materials.push({
        id: String(sub.id || `${sectionCode}-${kt}-${materials.length}`),
        template: kt,
        typeLabel: getMaterialTypeLabel(kt),
        title: String(sub.judul || sub.nama_sub_section || getMaterialTypeLabel(kt)).trim(),
        file: rawFile,
        link: rawLink,
        downloadUrl,
        externalUrl,
        completion: sub.completion === true
      });
    }

    const completed = isSectionCompleted(subSections);
    return {
      sectionCode,
      sectionName,
      meetingNum,
      materials,
      hasMaterials: materials.length > 0,
      hasAnySubSection: subSections.length > 0,
      completed
    };
  });

  const numberedSections = sections.filter(s => typeof s.meetingNum === 'number' && s.meetingNum > 0);
  const totalMeetings = numberedSections.length > 0 ? numberedSections.length : sections.length;
  const completedPool = numberedSections.length > 0 ? numberedSections : sections;
  const completedMeetings = Math.min(totalMeetings, completedPool.filter(s => s.completed).length);
  const percent = totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0;

  return {
    ...meta,
    progress: { completedMeetings, totalMeetings, percent },
    sections
  };
}

// Deduplicate strictly by NIM across all non-PKKMB courses while preserving each student's shared course list.
export function extractUniqueStudents(courseEntries) {
  const studentMap = new Map();

  for (const entry of courseEntries || []) {
    const courseCode = String(entry?.courseCode || '').trim();
    const courseTitle = String(entry?.courseTitle || 'Mata Kuliah').trim();
    if (!courseCode) continue;
    if (courseCode.toUpperCase().includes('PKKMB') || courseTitle.toUpperCase().includes('PKKMB')) {
      continue;
    }

    const list = Array.isArray(entry?.peserta) ? entry.peserta : [];
    for (const p of list) {
      const nim = String(p?.nim || '').trim();
      if (!nim) continue;
      const nama = String(p?.nama_mahasiswa || p?.nama || 'Mahasiswa').trim();
      const rawEmail = String(p?.alamat_email || p?.email || '').trim();
      const email = rawEmail && rawEmail !== '-' ? rawEmail : '';
      const rawPhone = String(p?.no_hp_mahasiswa || p?.no_hp || '').trim();
      const phone = rawPhone && rawPhone !== '-' ? rawPhone : '';

      let record = studentMap.get(nim);
      if (!record) {
        record = { nim, nama, email, phone, courses: [] };
        studentMap.set(nim, record);
      } else {
        if (!record.email && email) record.email = email;
        if (!record.phone && phone) record.phone = phone;
      }

      if (!record.courses.some(c => c.courseCode === courseCode)) {
        record.courses.push({ courseCode, courseTitle });
      }
    }
  }

  const students = Array.from(studentMap.values());
  students.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  for (const s of students) {
    s.courses.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle, 'id', { sensitivity: 'base' }));
  }
  return students;
}
