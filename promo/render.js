const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const S = require('./script.json');
const A = JSON.parse(fs.readFileSync('durs.json'));
const LEAD = 0.3, PAD = 0.55;
const D = A.map((a, i) => +(LEAD + a + (i === A.length - 1 ? 1.2 : PAD)).toFixed(3));
const total = D.reduce((x, y) => x + y, 0);
console.log('scenes', D, 'total', total);
if (total > 59.2) { console.error('TOO_LONG'); process.exit(3); }
const FPS = 30, N = Math.ceil(total * FPS);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const caps = S.map(s => s.cap);
  await p.goto('file://' + __dirname + '/video.html?d=' + encodeURIComponent(JSON.stringify(D)) + '&c=' + encodeURIComponent(encodeURIComponent(JSON.stringify(caps))));
  await p.evaluate(() => document.fonts.ready);
  const ok = await p.evaluate(() => document.fonts.check('600 40px "Hind Siliguri"', 'বাংলা'));
  console.log('font loaded', ok);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), 'silent.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  // audio: each scene's voice starts LEAD seconds into its scene
  let acc = 0; const inputs = [], filt = [];
  A.forEach((_, i) => { inputs.push('-i', `a${i}.mp3`); const ms = Math.round((acc + LEAD) * 1000); filt.push(`[${i + 1}:a]adelay=${ms}|${ms}[v${i}]`); acc += D[i]; });
  const fc = filt.join(';') + ';' + A.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${A.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`;
  execFileSync('ffmpeg', ['-y', '-i', 'silent.mp4', ...inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-t', String(total), '-movflags', '+faststart', 'promo.mp4'], { stdio: 'inherit' });
  console.log('done');
})();
