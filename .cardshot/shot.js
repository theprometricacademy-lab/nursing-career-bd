const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet"></head><body style="font-family:'Noto Sans Bengali',sans-serif"><span style="font-weight:800">বাংলা</span><span style="font-weight:600">বাংলা</span><span>বাংলা</span></body></html>`, { waitUntil: 'networkidle' });
  await p.addScriptTag({ content: fs.readFileSync('.cardshot/bundle.js', 'utf8') });
  const out = await p.evaluate(async () => {
    await Promise.all(['400','600','700','800'].map((w) => document.fonts.load(`${w} 40px "Noto Sans Bengali"`, 'বাংলা')));
    const c1 = document.createElement('canvas'), c2 = document.createElement('canvas'), c3 = document.createElement('canvas');
    await window.drawTop3(c1, { weekStart: '2026-11-07', participants: 128, top: [
      { rank: 1, name: 'সোনিয়া খাতুন', avatar: null, score: 46.5, max: 50, mins: 31 },
      { rank: 2, name: 'মোঃ আব্দুল্লাহ আল মামুন', avatar: null, score: 44, max: 50, mins: 28 },
      { rank: 3, name: 'র*** খা***', avatar: null, score: 43.5, max: 50, mins: 39 }] });
    await window.drawMyCard(c2, { name: 'সোনিয়া খাতুন', avatar: null, rank: 2, participants: 128, score: 44, max: 50, mins: 28, weekStart: '2026-11-07', final: false });
    await window.drawMyCard(c3, { name: 'Mohammad Abdullah Al Mamun', avatar: null, rank: 14, participants: 128, score: 31.5, max: 50, mins: 40, weekStart: '2026-11-07', final: true });
    return [c1.toDataURL(), c2.toDataURL(), c3.toDataURL()];
  });
  fs.mkdirSync('out', { recursive: true });
  out.forEach((d, i) => fs.writeFileSync(`out/card${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
  await b.close();
})();
