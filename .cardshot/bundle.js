// src/lib/circulars.ts
var BN_DIGITS = "০১২৩৪৫৬৭৮৯";
var bnNum = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

// src/lib/winnerCard.ts
var avatarUrl = (path) => path ? `${"https://pnbuydaeooxjojkzjdby.supabase.co"}/storage/v1/object/public/avatars/${path}` : null;
function bnOrdinal(n) {
  const suf = { 1: "ম", 2: "য়", 3: "য়", 4: "র্থ", 5: "ম", 6: "ষ্ঠ", 7: "ম", 8: "ম", 9: "ম", 10: "ম" };
  return `${bnNum(n)}${suf[n] ?? "তম"}`;
}
var fmtNum = (x) => bnNum(Number.isInteger(Number(x)) ? Number(x) : Number(x).toFixed(1).replace(/\.0$/, ""));
function weekLabel(weekStart) {
  const s = new Date(`${weekStart}T12:00:00+06:00`), e = new Date(s.getTime() + 6 * 86400000);
  const f = (d, o) => d.toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", ...o });
  return `${f(s, { day: "numeric", month: "long" })} – ${f(e, { day: "numeric", month: "long", year: "numeric" })}`;
}
var MEDAL = [
  { ring: "#f5c542", deep: "#a16207", label: "\uD83E\uDD47" },
  { ring: "#cbd5e1", deep: "#475569", label: "\uD83E\uDD48" },
  { ring: "#f0a061", deep: "#9a3412", label: "\uD83E\uDD49" }
];
function loadImage(src) {
  if (!src)
    return Promise.resolve(null);
  return new Promise((res) => {
    const im = new Image;
    im.crossOrigin = "anonymous";
    const t = setTimeout(() => res(null), 6000);
    im.onload = () => {
      clearTimeout(t);
      res(im);
    };
    im.onerror = () => {
      clearTimeout(t);
      res(null);
    };
    im.src = src;
  });
}
function wrap(x, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const out = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (x.measureText(t).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else
      cur = t;
  }
  if (cur)
    out.push(cur);
  if (out.length > maxLines) {
    out.length = maxLines;
    out[maxLines - 1] = `${out[maxLines - 1].slice(0, -1)}…`;
  }
  return out;
}
function background(x) {
  const g = x.createLinearGradient(0, 0, 1080, 1350);
  g.addColorStop(0, "#0d47a1");
  g.addColorStop(0.65, "#1f7ad6");
  g.addColorStop(1, "#db2777");
  x.fillStyle = g;
  x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = "rgba(255,255,255,.07)";
  x.beginPath();
  x.arc(980, 140, 240, 0, 7);
  x.fill();
  x.beginPath();
  x.arc(70, 1240, 280, 0, 7);
  x.fill();
}
function avatar(x, font, img, name, cx, cy, r, ring) {
  x.save();
  x.fillStyle = ring;
  x.beginPath();
  x.arc(cx, cy, r + 12, 0, 7);
  x.fill();
  x.fillStyle = "#fff";
  x.beginPath();
  x.arc(cx, cy, r + 4, 0, 7);
  x.fill();
  x.beginPath();
  x.arc(cx, cy, r, 0, 7);
  x.closePath();
  x.clip();
  if (img) {
    const s = Math.min(img.width, img.height);
    x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
  } else {
    const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, "#1f7ad6");
    g.addColorStop(1, "#ec4899");
    x.fillStyle = g;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `800 ${Math.round(r * 0.95)}px ${font}`;
    x.fillText(Array.from(name.trim())[0] ?? "★", cx, cy + r * 0.06);
    x.textBaseline = "alphabetic";
  }
  x.restore();
}
function footer(x, font, line) {
  x.textAlign = "center";
  x.fillStyle = "#fde68a";
  x.font = `800 40px ${font}`;
  x.fillText(line, 540, 1200);
  x.fillStyle = "#fff";
  x.beginPath();
  x.roundRect(200, 1235, 680, 78, 39);
  x.fill();
  x.fillStyle = "#1f7ad6";
  x.font = `800 38px ${font}`;
  x.fillText("nursingcareerbd.com/weekly-test", 540, 1287);
}
async function setup(c) {
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  c.width = 1080;
  c.height = 1350;
  return { x: c.getContext("2d"), font };
}
async function drawTop3(c, d) {
  const top = d.top.slice(0, 3);
  const imgs = await Promise.all(top.map((w) => loadImage(avatarUrl(w.avatar))));
  const { x, font } = await setup(c);
  background(x);
  x.textAlign = "left";
  x.fillStyle = "#fff";
  x.font = `800 44px ${font}`;
  x.fillText("Nursing Career BD", 70, 105);
  x.textAlign = "right";
  x.font = `600 32px ${font}`;
  x.fillStyle = "#cfe3ff";
  x.fillText("সাপ্তাহিক ফ্রি মডেল টেস্ট", 1010, 105);
  x.textAlign = "center";
  x.fillStyle = "#fff";
  x.font = `800 72px ${font}`;
  x.fillText("এই সপ্তাহের সেরা ৩ জন \uD83C\uDFC6", 540, 245);
  x.font = `600 36px ${font}`;
  x.fillStyle = "#e0f2fe";
  x.fillText(`${weekLabel(d.weekStart)} · অংশ নিয়েছেন ${bnNum(d.participants)} জন`, 540, 310);
  const slots = [{ i: 1, cx: 205, cy: 600, r: 108 }, { i: 0, cx: 540, cy: 530, r: 140 }, { i: 2, cx: 875, cy: 600, r: 108 }];
  for (const s of slots) {
    const w = top[s.i];
    if (!w)
      continue;
    const m = MEDAL[s.i];
    const boxTop = s.cy + s.r + 30, boxH = s.i === 0 ? 430 : 360;
    x.fillStyle = "rgba(255,255,255,.96)";
    x.beginPath();
    x.roundRect(s.cx - 160, boxTop - 40, 320, boxH, 32);
    x.fill();
    avatar(x, font, imgs[s.i], w.name, s.cx, s.cy, s.r, m.ring);
    x.font = `${s.i === 0 ? 76 : 62}px ${font}`;
    x.fillText(m.label, s.cx + s.r * 0.72, s.cy - s.r * 0.55);
    x.textAlign = "center";
    x.fillStyle = m.deep;
    x.font = `800 ${s.i === 0 ? 46 : 40}px ${font}`;
    x.fillText(`${bnOrdinal(w.rank)} স্থান`, s.cx, boxTop + 30);
    x.fillStyle = "#0f2a4a";
    x.font = `800 ${s.i === 0 ? 40 : 34}px ${font}`;
    const nl = wrap(x, w.name, 280, 2);
    nl.forEach((l, k) => x.fillText(l, s.cx, boxTop + 90 + k * 46));
    const yS = boxTop + 90 + nl.length * 46 + 30;
    x.fillStyle = "#1f7ad6";
    x.font = `800 ${s.i === 0 ? 58 : 50}px ${font}`;
    x.fillText(`${fmtNum(w.score)}/${fmtNum(w.max)}`, s.cx, yS);
    x.fillStyle = "#5b6b80";
    x.font = `600 30px ${font}`;
    x.fillText(`${bnNum(w.mins)} মিনিটে`, s.cx, yS + 48);
  }
  footer(x, font, "নতুন টেস্ট চলছে — আপনিও অংশ নিন, একদম ফ্রি!");
}
async function drawMyCard(c, d) {
  const img = await loadImage(avatarUrl(d.avatar));
  const { x, font } = await setup(c);
  background(x);
  const m = MEDAL[d.rank - 1];
  x.textAlign = "left";
  x.fillStyle = "#fff";
  x.font = `800 44px ${font}`;
  x.fillText("Nursing Career BD", 70, 105);
  x.textAlign = "right";
  x.font = `600 32px ${font}`;
  x.fillStyle = "#cfe3ff";
  x.fillText(weekLabel(d.weekStart), 1010, 105);
  x.textAlign = "center";
  x.fillStyle = "#fff";
  x.font = `800 54px ${font}`;
  x.fillText("সাপ্তাহিক ফ্রি মডেল টেস্ট", 540, 215);
  avatar(x, font, img, d.name, 540, 440, 150, m?.ring ?? "#ffffff");
  if (m) {
    x.font = `96px ${font}`;
    x.fillText(m.label, 540 + 118, 440 - 92);
  }
  x.textAlign = "center";
  x.fillStyle = "#fff";
  x.font = `800 60px ${font}`;
  wrap(x, d.name, 900, 1).forEach((l) => x.fillText(l, 540, 680));
  x.fillStyle = "rgba(255,255,255,.96)";
  x.beginPath();
  x.roundRect(110, 730, 860, 400, 40);
  x.fill();
  x.fillStyle = m?.deep ?? "#1f7ad6";
  x.font = `800 112px ${font}`;
  x.fillText(`${bnOrdinal(d.rank)} স্থান`, 540, 860);
  x.fillStyle = "#5b6b80";
  x.font = `700 38px ${font}`;
  x.fillText(`${bnNum(d.participants)} জনের মধ্যে${d.final ? "" : " (এখন পর্যন্ত)"}`, 540, 920);
  x.fillStyle = "#e8f1fd";
  x.beginPath();
  x.roundRect(170, 960, 340, 130, 28);
  x.fill();
  x.beginPath();
  x.roundRect(570, 960, 340, 130, 28);
  x.fill();
  x.fillStyle = "#1f7ad6";
  x.font = `800 54px ${font}`;
  x.fillText(`${fmtNum(d.score)}/${fmtNum(d.max)}`, 340, 1030);
  x.fillText(`${bnNum(d.mins)} মিনিট`, 740, 1030);
  x.fillStyle = "#5b6b80";
  x.font = `600 30px ${font}`;
  x.fillText("নম্বর", 340, 1072);
  x.fillText("সময়", 740, 1072);
  footer(x, font, "আপনিও দিন — প্রতি সপ্তাহে ফ্রি মডেল টেস্ট");
}

// ../../../tmp/claude-0/-home-claude/1f720a24-4383-5f11-bd5b-36242d1bc53b/scratchpad/card/entry.ts
window.drawTop3 = drawTop3;
window.drawMyCard = drawMyCard;
