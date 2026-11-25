// Usage: node scripts/make-reel.js <config.json> <out-dir>
// Renders the text overlay with Chromium (correct Bangla shaping), then composites the video with ffmpeg.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
(async () => {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
  const y = cfg.videoY ?? 640;
  let html = fs.readFileSync(path.join(__dirname, '..', 'templates', cfg.template + '.html'), 'utf8')
    .replaceAll('VIDEO_Y', y + 'px').replace('TAG', cfg.tag).replace('HEADLINE', cfg.headline)
    .replace('LOGO', cfg.logo ? fs.readFileSync(path.join(__dirname, '..', cfg.logo), 'utf8') : '').replace('CTA', cfg.cta).replace('FOOT', cfg.footer);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const overlay = path.join(out, 'overlay.png');
  await p.screenshot({ path: overlay, omitBackground: true }); await b.close();
  const trim = cfg.start != null ? ['-ss', String(cfg.start), '-to', String(cfg.end)] : [];
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...trim, '-i', cfg.video, '-loop', '1', '-i', overlay,
    '-filter_complex', `color=black:s=1080x1920:r=30[bg];[0:v]scale=1080:608:flags=lanczos,setsar=1[v];[bg][v]overlay=0:${y}:shortest=1[b];[b][1:v]overlay=0:0:shortest=1,format=yuv420p[o]`,
    '-map', '[o]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.join(out, cfg.name + '.mp4')], { stdio: 'inherit' });
  console.log('done');
})();
