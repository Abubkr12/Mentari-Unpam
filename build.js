import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const entries = [
  { in: 'src/background/service-worker.js', out: 'dist/background/service-worker', format: 'esm' },
  { in: 'src/content/main-sniffer.js', out: 'dist/content/main-sniffer', format: 'iife' },
  { in: 'src/content/content.js', out: 'dist/content/content', format: 'iife' },
  { in: 'src/content/apiKeyManager.js', out: 'dist/content/apiKeyManager', format: 'iife' },
  { in: 'src/content/gemini.js', out: 'dist/content/gemini', format: 'iife' },
  { in: 'src/content/token.js', out: 'dist/content/token', format: 'iife' },
  { in: 'src/content/quiz.js', out: 'dist/content/quiz', format: 'iife' },
  { in: 'src/content/discus.js', out: 'dist/content/discus', format: 'iife' },
  { in: 'src/content/presensi.js', out: 'dist/content/presensi', format: 'iife' },
  { in: 'src/content/kuisioner.js', out: 'dist/content/kuisioner', format: 'iife' },
  { in: 'src/content/QuickSurvey.js', out: 'dist/content/QuickSurvey', format: 'iife' },
  { in: 'src/content/pw.js', out: 'dist/content/pw', format: 'iife' },
  { in: 'src/content/home.js', out: 'dist/content/home', format: 'iife' },
  { in: 'src/popup/script.js', out: 'dist/popup/script', format: 'iife' }
];

async function build() {
  console.log('🚀 Memulai build Mentari Mod Modern Edition...');

  // Pastikan direktori dist ada
  const dirs = ['dist', 'dist/background', 'dist/content', 'dist/popup', 'dist/assets'];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // Copy assets
  if (fs.existsSync('src/assets/icon.png')) {
    fs.copyFileSync('src/assets/icon.png', 'dist/assets/icon.png');
  }
  if (fs.existsSync('src/assets/background.png')) {
    fs.copyFileSync('src/assets/background.png', 'dist/assets/background.png');
  }
  if (fs.existsSync('src/popup/popup.html')) {
    fs.copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
  }

  // Bundle each entry
  for (const entry of entries) {
    if (fs.existsSync(entry.in)) {
      await esbuild.build({
        entryPoints: [entry.in],
        outfile: `${entry.out}.js`,
        bundle: true,
        format: entry.format,
        minify: false,
        sourcemap: false,
        target: ['chrome110'],
        logLevel: 'info'
      });
      console.log(`  ✓ Bundled: ${entry.in} -> ${entry.out}.js`);
    }
  }

  // Generate dist/manifest.json dengan path RELATIF terhadap folder dist/
  const distManifest = {
    manifest_version: 3,
    name: 'Mentari Mod v2.0',
    version: '2.1.0',
    description: 'Ekstensi modern untuk meningkatkan pengalaman belajar di MENTARI UNPAM dengan asisten AI Gemini generasi baru, anti-deteksi, dan manajemen presensi.',
    permissions: ['scripting', 'activeTab', 'storage'],
    host_permissions: [
      'https://mentari.unpam.ac.id/*',
      'https://my.unpam.ac.id/*',
      'https://generativelanguage.googleapis.com/*',
      'https://api.github.com/*'
    ],
    background: {
      service_worker: 'background/service-worker.js',
      type: 'module'
    },
    action: {
      default_popup: 'popup/popup.html',
      default_icon: 'assets/icon.png'
    },
    content_scripts: [
      {
        matches: [
          'https://mentari.unpam.ac.id/*',
          'https://my.unpam.ac.id/*'
        ],
        js: ['content/main-sniffer.js'],
        world: 'MAIN',
        run_at: 'document_start'
      },
      {
        matches: ['https://mentari.unpam.ac.id/*'],
        exclude_matches: ['https://mentari.unpam.ac.id/login'],
        js: [
          'content/apiKeyManager.js',
          'content/gemini.js',
          'content/token.js',
          'content/content.js'
        ]
      },
      {
        matches: ['https://mentari.unpam.ac.id/login'],
        js: ['content/home.js']
      },
      {
        matches: ['https://mentari.unpam.ac.id/u-courses/*/exam/*'],
        js: ['content/quiz.js']
      },
      {
        matches: ['https://mentari.unpam.ac.id/u-courses/*/kuesioner/*'],
        js: ['content/kuisioner.js']
      },
      {
        matches: ['https://mentari.unpam.ac.id/u-courses/*/forum/*/topics/*'],
        js: ['content/discus.js']
      },
      {
        matches: ['https://my.unpam.ac.id/*'],
        exclude_matches: ['https://mentari.unpam.ac.id/login'],
        js: [
          'content/presensi.js',
          'content/QuickSurvey.js'
        ]
      },
      {
        matches: [
          'https://my.unpam.ac.id/login',
          'https://mentari.unpam.ac.id/login'
        ],
        js: ['content/pw.js']
      }
    ],
    web_accessible_resources: [
      {
        resources: [
          'content/main-sniffer.js',
          'content/token.js',
          'content/apiKeyManager.js',
          'assets/background.png'
        ],
        matches: [
          'https://mentari.unpam.ac.id/*',
          'https://my.unpam.ac.id/*'
        ]
      }
    ],
    icons: {
      '16': 'assets/icon.png',
      '48': 'assets/icon.png',
      '128': 'assets/icon.png'
    }
  };
  fs.writeFileSync('dist/manifest.json', JSON.stringify(distManifest, null, 2));
  console.log('  ✓ Generated dist/manifest.json (relative paths)');

  // Update root manifest.json juga
  const rootManifest = {
    ...distManifest,
    background: {
      service_worker: 'dist/background/service-worker.js',
      type: 'module'
    },
    action: {
      default_popup: 'dist/popup/popup.html',
      default_icon: 'dist/assets/icon.png'
    },
    content_scripts: distManifest.content_scripts.map(cs => ({
      ...cs,
      js: cs.js.map(j => `dist/${j}`)
    })),
    web_accessible_resources: distManifest.web_accessible_resources.map(war => ({
      ...war,
      resources: war.resources.map(r => `dist/${r}`)
    })),
    icons: {
      '16': 'dist/assets/icon.png',
      '48': 'dist/assets/icon.png',
      '128': 'dist/assets/icon.png'
    }
  };
  fs.writeFileSync('manifest.json', JSON.stringify(rootManifest, null, 2));
  console.log('  ✓ Updated root manifest.json');

  console.log('\n✨ Build selesai! Ekstensi siap digunakan.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
