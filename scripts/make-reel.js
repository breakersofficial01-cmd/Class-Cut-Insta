// Usage: node scripts/make-reel.js reels/<name>.json [out-dir=output]
// 1) Renders the text overlay in Chromium (correct Bangla conjuncts; ffmpeg drawtext breaks them)
// 2) Composites the landscape video into a 1080x1920 frame with ffmpeg.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const rd = (f, enc) => fs.readFileSync(path.join(ROOT, f), enc);

const FONTS = [['Hind Siliguri', 500, 'HindSiliguri-Medium'], ['Hind Siliguri', 600, 'HindSiliguri-SemiBold'],
  ['Hind Siliguri', 700, 'HindSiliguri-Bold'], ['Poppins', 700, 'Poppins-Bold'], ['Poppins', 800, 'Poppins-ExtraBold']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};font-display:block;src:url(data:font/ttf;base64,${rd(`assets/fonts/${file}.ttf`).toString('base64')}) format('truetype')}`).join('\n');

(async () => {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = process.argv[3] || path.join(ROOT, 'output'); fs.mkdirSync(out, { recursive: true });
  const y = cfg.videoY ?? 640;
  const cardLines = cfg.card?.lines ?? [];
  const card = cfg.card ? `<div class="card">${cfg.card.title ? `<div class="t">${cfg.card.title}</div>` : ''}${cardLines.map(l => `<div>${l}</div>`).join('')}</div>` : '';
  const cardH = cfg.card ? 26 + 18 + (cfg.card.title ? 72 : 0) + cardLines.length * 58 : 0;
  const ctaY = 1290 + (cfg.card ? cardH + 30 : 0);
  const footY = ctaY + 220;
  const vals = { FONTS, VIDEO_Y: y + 'px', CTA_Y: ctaY + 'px', FOOT_Y: footY + 'px', CARD: card,
    LOGO: cfg.logo ? rd(cfg.logo, 'utf8') : '', TAG: cfg.tag ?? '', HEADLINE: cfg.headline ?? '',
    CTA: cfg.cta ?? '', FOOT: cfg.footer ?? '' };
  let html = rd(`templates/${cfg.template}.html`, 'utf8')
    .replace(/\b(FONTS|VIDEO_Y|CTA_Y|FOOT_Y|CARD|LOGO|TAG|HEADLINE|CTA|FOOT)\b/g, k => vals[k]);
  if (!cfg.tag) html = html.replace('<div class="tag"></div>', '');
  if (!cfg.cta) html = html.replace('<div class="cta"></div>', '');

  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  const overlay = path.join(out, cfg.name + '-overlay.png');
  await p.screenshot({ path: overlay, omitBackground: true }); await b.close();

  const trim = cfg.start != null ? ['-ss', String(cfg.start)] : [];
  const to = cfg.end != null ? ['-to', String(cfg.end)] : [];
  const mp4 = path.join(out, cfg.name + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...trim, ...to, '-i', cfg.video, '-loop', '1', '-i', overlay,
    '-filter_complex', `color=black:s=1080x1920:r=30[bg];[0:v]scale=1080:608:flags=lanczos,setsar=1[v];[bg][v]overlay=0:${y}:shortest=1[b];[b][1:v]overlay=0:0:shortest=1,format=yuv420p[o]`,
    '-map', '[o]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  const preview = path.join(out, cfg.name + '-preview.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '3', '-i', mp4, '-frames:v', '1', preview]);
  fs.unlinkSync(overlay);
  console.log('Reel:', mp4, '\nPreview:', preview);
})();
