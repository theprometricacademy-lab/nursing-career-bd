// Builds a 1080x1920 promo clip of nursingcareerbd.com: real phone screenshots scrolling inside a phone frame + Bangla captions.
const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');
const OUT = 'promo'; fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://nursingcareerbd.com';
const SCR_W = 720, SCR_H = 1300, SCR_X = 180, SCR_Y = 470;

const scenes = [
  { kind: 'card', dur: 4, html: `<div class="logo"><img src="${SITE}/icons/icon-512.png"></div><h1 class="big">Nursing Career BD</h1><p class="lead">শুধু নার্সদের জন্য<br>প্রস্তুতি ও চাকরি — এক জায়গায়</p>` },
  { kind: 'screen', dur: 5, url: '/', title: '১১,০০০+ প্রশ্ন · ২০টি বিষয়', sub: 'বাংলা ও ইংরেজি দুই ভাষায়' },
  { kind: 'screen', dur: 5, url: '/question-solution/senior-staff-nurse-govt-employees-hospital-bpsc-03-08-2026', title: 'বিগত বছরের প্রশ্ন', sub: 'সঠিক উত্তর ও ব্যাখ্যাসহ' },
  { kind: 'screen', dur: 5, url: '/weekly-test', max: 560, title: 'প্রতি শনিবার ফ্রি মডেল টেস্ট', sub: '৫০ প্রশ্ন · ৪০ মিনিট · মেধাতালিকা' },
  { kind: 'screen', dur: 5, url: '/circulars', title: 'সরকারি নার্সিং সার্কুলার', sub: 'সব বিজ্ঞপ্তি এক জায়গায়' },
  { kind: 'screen', dur: 5, url: '/jobs', title: 'প্রাইভেট হাসপাতালে চাকরি', sub: 'একবার সিভি বানিয়ে সরাসরি আবেদন' },
  { kind: 'card', dur: 4.5, html: `<p class="lead" style="margin:0 0 30px">শুরু করুন</p><h1 class="huge">একদম ফ্রি</h1><div class="pill">nursingcareerbd.com</div><p class="small">মোবাইল নম্বর বা Google দিয়ে ১ মিনিটে অ্যাকাউন্ট</p>` },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@500;700;800&display=swap');
*{margin:0;box-sizing:border-box} html,body{width:1080px;height:1920px;font-family:'Noto Sans Bengali',sans-serif;color:#fff}
.bg{position:absolute;inset:0;background:linear-gradient(160deg,#0d47a1 0%,#1f7ad6 55%,#db2777 100%);overflow:hidden}
.bg:before{content:'';position:absolute;width:620px;height:620px;border-radius:50%;background:rgba(255,255,255,.08);right:-200px;top:-160px}
.bg:after{content:'';position:absolute;width:700px;height:700px;border-radius:50%;background:rgba(255,255,255,.07);left:-260px;bottom:-260px}
.cap{position:absolute;left:60px;right:60px;top:120px;text-align:center}
.cap h2{font-size:76px;font-weight:800;line-height:1.25;text-shadow:0 4px 18px rgba(0,0,0,.25)}
.cap p{margin-top:18px;font-size:44px;font-weight:600;color:#fde68a}
.brand{position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:40px;font-weight:700;letter-spacing:.5px}
.card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px}
.logo img{width:260px;height:260px;border-radius:60px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.big{margin-top:60px;font-size:96px;font-weight:800}
.huge{font-size:150px;font-weight:800;color:#fde68a}
.lead{margin-top:36px;font-size:58px;font-weight:700;line-height:1.45}
.pill{margin-top:70px;background:#fff;color:#1f7ad6;font-size:66px;font-weight:800;padding:26px 60px;border-radius:999px}
.small{margin-top:46px;font-size:40px;font-weight:600;color:#e0f2fe}
.frame{position:absolute;left:${SCR_X - 24}px;top:${SCR_Y - 24}px;width:${SCR_W + 48}px;height:${SCR_H + 48}px;border:24px solid #0b1220;border-radius:70px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
`;

(async () => {
  const b = await chromium.launch();
  const art = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const render = async (body, file, transparent = false) => {
    await art.setContent(`<html><head><style>${CSS}</style></head><body${transparent ? ' style="background:transparent"' : ''}>${body}</body></html>`, { waitUntil: 'networkidle' });
    await art.evaluate(() => document.fonts.ready);
    await art.screenshot({ path: file, omitBackground: transparent });
  };
  await render('<div class="frame"></div>', `${OUT}/frame.png`, true);

  const phone = await b.newContext({
    viewport: { width: 360, height: 650 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'bn-BD',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const p = await phone.newPage();

  const parts = [];
  for (const [i, s] of scenes.entries()) {
    const f = `${OUT}/s${i}.mp4`;
    if (s.kind === 'card') {
      await render(`<div class="bg"></div><div class="card">${s.html}</div>`, `${OUT}/c${i}.png`);
      const frames = Math.round(s.dur * 30);
      execSync(`ffmpeg -y -loglevel error -loop 1 -i ${OUT}/c${i}.png -vf "scale=2160:3840,zoompan=z='min(zoom+0.0006,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30,format=yuv420p" -frames:v ${frames} -c:v libx264 -preset veryfast -crf 19 ${f}`);
    } else {
      await p.goto(SITE + s.url, { waitUntil: 'networkidle', timeout: 60000 });
      await p.addStyleTag({ content: '.fixed{display:none!important}' });
      await p.waitForTimeout(2500);
      const shot = `${OUT}/shot${i}.png`;
      await p.screenshot({ path: shot, fullPage: true, clip: { x: 0, y: 0, width: 360, height: 1500 } });
      const H = (await art.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); return im.height; }, 'data:image/png;base64,' + fs.readFileSync(shot).toString('base64')));
      const D = Math.max(0, Math.min(H - SCR_H, s.max ?? 1600));
      await render(`<div class="bg"></div><div class="cap"><h2>${s.title}</h2><p>${s.sub}</p></div><div class="brand">nursingcareerbd.com</div>`, `${OUT}/bg${i}.png`);
      // ease-in-out scroll from 0.8s to dur-0.6s
      const T0 = 0.8, T1 = s.dur - 0.6;
      const y = `${D}*(1-cos(PI*min(1\\,max(0\\,(t-${T0})/${T1 - T0}))))/2`;
      execSync(`ffmpeg -y -loglevel error -loop 1 -t ${s.dur} -i ${OUT}/bg${i}.png -loop 1 -t ${s.dur} -i ${shot} -loop 1 -t ${s.dur} -i ${OUT}/frame.png -filter_complex "[1:v]crop=${SCR_W}:${SCR_H}:0:'${y}'[s];[0:v][s]overlay=${SCR_X}:${SCR_Y}[a];[a][2:v]overlay=0:0,format=yuv420p" -r 30 -c:v libx264 -preset veryfast -crf 19 ${f}`);
    }
    parts.push({ f, dur: s.dur });
  }
  await b.close();

  // join with 0.5s cross-fades, add a silent audio track so editors import it cleanly
  const X = 0.5; let filter = ''; let last = '[0:v]'; let off = 0;
  for (let k = 1; k < parts.length; k++) {
    off += parts[k - 1].dur - X;
    const out = k === parts.length - 1 ? '[v]' : `[x${k}]`;
    filter += `${last}[${k}:v]xfade=transition=fade:duration=${X}:offset=${off.toFixed(2)}${out};`;
    last = out;
  }
  const total = parts.reduce((a, s) => a + s.dur, 0) - X * (parts.length - 1);
  execSync(`ffmpeg -y -loglevel error ${parts.map((s) => `-i ${s.f}`).join(' ')} -f lavfi -t ${total} -i anullsrc=r=44100:cl=stereo -filter_complex "${filter.slice(0, -1)}" -map "[v]" -map ${parts.length}:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 96k -shortest -movflags +faststart ${OUT}/NursingCareerBD-promo.mp4`);
  console.log('total', total);
})();
