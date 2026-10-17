import { esc } from "./utils.js";

/* Генератор SVG-схеми щита. Повертає рядок SVG і перелік позицій до номерів на схемі. */

const C = { L: "#d1302f", N: "#1f6fd1", PEy: "#d8b21c", PEg: "#2f8f46", DCm: "#222", ink: "#1d2733", mute: "#5b6876", edge: "#8d98a3", term: "#c3cad1", acc: "#b65f27", paper: "#fcfdfd" };
const FONT = 'font-family="Golos Text, Arial, sans-serif"';

/* Фірмовий вигляд апаратів (без логотипів — тільки кольори і назва текстом) */
const STY = {
  schneider: { body: "#f3f4f4", front: "#ffffff", edge: "#8f989f", tog: "#2f363b", hi: "#525b61", brand: "Schneider", bc: "#2e9e48", test: "#8a9298" },
  hager: { body: "#e7e9ea", front: "#f4f5f5", edge: "#8f989f", tog: "#7a8691", hi: "#a3adb6", brand: "hager", bc: "#24508f", test: "#e6b021" },
  tomzn: { body: "#f2f2ef", front: "#fbfbf9", edge: "#8f989f", tog: "#1e1e1e", hi: "#444", brand: "TOMZN", bc: "#cf3a2e", test: "#999" },
  zubr: { body: "#f4f4f4", front: "#fdfdfd", edge: "#8f989f", tog: "#444", hi: "#666", brand: "ZUBR", bc: "#cf3a2e", test: "#999" },
  eaton: { body: "#eef0f1", front: "#fafafa", edge: "#8f989f", tog: "#2b2b2b", hi: "#555", brand: "EATON", bc: "#222", test: "#3d7bd9" },
  abb: { body: "#eef0f1", front: "#fafafa", edge: "#8f989f", tog: "#3a3a3a", hi: "#5e5e5e", brand: "ABB", bc: "#e2001a", test: "#3d7bd9" },
  generic: { body: "#eceef0", front: "#f7f8f9", edge: "#98a1a9", tog: "#5d666e", hi: "#7e878e", brand: "", bc: "#5b6876", test: "#999" },
};

function brandOf(cat, key) {
  const c = cat(key);
  const m = `${c.model || ""} ${c.name || ""}`.toLowerCase();
  for (const b of ["schneider", "hager", "tomzn", "zubr", "eaton", "abb"]) if (m.includes(b)) return b;
  return "generic";
}
const wire = (pts, color, w) =>
  `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="${w || 3.2}" stroke-linejoin="round" stroke-linecap="round"/>`;
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${o.size || 11}" font-weight="${o.w || 400}" fill="${o.fill || C.ink}" text-anchor="${o.anchor || "middle"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}>${esc(s)}</text>`;
const badge = (x, y, n) => `<circle cx="${x}" cy="${y}" r="9" fill="${C.acc}"/>${txt(x, y + 3.8, n, { size: 10, w: 700, fill: "#fff" })}`;
const screw = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="4.6" fill="#dfe3e6" stroke="#6f7a84" stroke-width="1"/><line x1="${cx - 2.8}" y1="${cy - 1.2}" x2="${cx + 2.8}" y2="${cy + 1.2}" stroke="#5f6a74" stroke-width="1.3"/>`;

/* модульний апарат: kind = mcb | rcd | sw | relay | dc */
function din(x, y, w, h, o) {
  const s = STY[o.brand] || STY.generic;
  const cx = x + w / 2;
  const k = o.kind || "mcb";
  const narrow = w < 45;
  let g = `<rect x="${x + 1.5}" y="${y + 2.5}" width="${w}" height="${h}" rx="4" fill="#0b1a2a" opacity=".10"/>`;
  g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${o.fill || s.body}" stroke="${s.edge}" stroke-width="1.1"/>`;
  g += `<rect x="${x + 2.5}" y="${y + 19}" width="${w - 5}" height="${h - 38}" rx="3" fill="${s.front}" stroke="${s.edge}" stroke-width=".8"/>`;
  const mods = Math.round(w / 18);
  for (let i = 1; i < mods; i++) g += `<line x1="${x + (i * w) / mods}" y1="${y + 3}" x2="${x + (i * w) / mods}" y2="${y + 16}" stroke="${s.edge}" stroke-width=".5" opacity=".6"/>`;
  (o.top || []).forEach((t) => (g += screw(t, y + 9)));
  (o.bot || []).forEach((t) => (g += screw(t, y + h - 9)));
  if (k === "relay") {
    g += `<rect x="${x + 8}" y="${y + 23}" width="${w - 16}" height="22" rx="2" fill="#1d0f0f"/>` + txt(cx, y + 40, "230", { size: 15, w: 700, fill: "#ff4b3e" });
    [cx - 14, cx, cx + 14].forEach((bx) => (g += `<circle cx="${bx}" cy="${y + 52}" r="3.4" fill="#d9dde0" stroke="#7b858e"/>`));
  } else if (k === "sw") {
    g += `<rect x="${cx - 31}" y="${y + 25}" width="62" height="17" rx="8.5" fill="#d7dbde" stroke="${s.edge}"/>`;
    g += `<rect x="${cx - 31}" y="${y + 22}" width="17" height="23" rx="3" fill="${s.tog}"/><rect x="${cx - 29}" y="${y + 24}" width="13" height="8" rx="2" fill="${s.hi}"/>`;
    g += txt(cx - 22, y + 55, "I", { size: 9, w: 700 }) + txt(cx, y + 55, "0", { size: 9, w: 700 }) + txt(cx + 22, y + 55, "II", { size: 9, w: 700 });
  } else {
    const tw = narrow ? 16 : 22;
    const tx = cx - tw / 2 - (k === "rcd" ? 9 : 0);
    g += `<rect x="${tx}" y="${y + 23}" width="${tw}" height="24" rx="2.5" fill="${s.tog}"/><rect x="${tx + 2}" y="${y + 25}" width="${tw - 4}" height="9" rx="1.5" fill="${s.hi}"/>`;
    g += `<rect x="${tx + tw / 2 - 5}" y="${y + 50}" width="10" height="5" rx="1" fill="#d63a2f"/>`;
    if (k === "rcd") g += `<circle cx="${x + w - 14}" cy="${y + 33}" r="5.5" fill="${s.test}" stroke="#6f7a84" stroke-width=".8"/>` + txt(x + w - 14, y + 35.5, "T", { size: 7, w: 700, fill: "#fff" });
    if (k === "dc") g += txt(x + 9, y + 33, "+", { size: 11, w: 700, fill: "#cf3a2e" }) + txt(x + w - 9, y + 33, "−", { size: 11, w: 700 });
  }
  if (s.brand) g += narrow ? txt(cx, y + 64, s.brand.slice(0, 5), { size: 5.8, w: 700, fill: s.bc }) : txt(cx, y + 64, s.brand, { size: 7.5, w: 700, fill: s.bc, ls: ".3" });
  if (o.label) g += txt(cx, y + 77, o.label, { size: narrow ? 10 : 11, w: 700 });
  if (o.sub) g += txt(cx, y + 87, o.sub, { size: 8.5, fill: C.mute });
  if (o.badge) g += badge(x + w - 1, y - 1, o.badge);
  return g;
}

function bus(x1, x2, y, n) {
  let g = `<rect x="${x1 - 4}" y="${y - 3}" width="16" height="20" rx="2" fill="#2f6fb8"/><rect x="${x2 - 12}" y="${y - 3}" width="16" height="20" rx="2" fill="#2f6fb8"/>`;
  g += `<rect x="${x1}" y="${y + 1}" width="${x2 - x1}" height="12" rx="2" fill="#d4b063" stroke="#8a6a22"/>`;
  for (let x = x1 + 10; x < x2 - 4; x += 16)
    g += `<circle cx="${x}" cy="${y + 7}" r="3.3" fill="#ecd9a0" stroke="#8a6a22" stroke-width=".8"/><line x1="${x - 2}" y1="${y + 7}" x2="${x + 2}" y2="${y + 7}" stroke="#8a6a22" stroke-width=".9"/>`;
  if (n) g += badge(x2 + 14, y + 7, n);
  return g;
}

export function buildSVG(s, calc, cat) {
  const r = calc.r;
  const parts = [];
  let n = 0;
  const P = (t) => {
    parts.push(t);
    return ++n;
  };
  const W = 1200;
  const H = 660;
  let g = "";
  g += `<rect x="20" y="20" width="1160" height="290" rx="12" fill="none" stroke="#9aa5af" stroke-dasharray="7 6"/>`;
  g += `<rect x="20" y="330" width="1160" height="310" rx="12" fill="none" stroke="#9aa5af" stroke-dasharray="7 6"/>`;
  g += txt(36, 301, r.near ? "БІЛЯ ІНВЕРТОРА (щит поруч)" : "БІЛЯ ІНВЕРТОРА", { anchor: "start", size: 11, w: 700, fill: C.mute });
  g += txt(36, 631, "ПОВЕРХОВИЙ ЩИТ / ЩИТОВА", { anchor: "start", size: 11, w: 700, fill: C.mute });

  const hasRelay = s.relay !== "none";
  const nG = Math.max(1, +s.groups || 1);
  const nShown = Math.min(nG, 6);
  const gx0 = 680;
  const gStep = 44;
  const gEnd = gx0 + nShown * gStep;
  const bx = gEnd + 40;
  const Lmax = Math.max(457, s.boiler ? bx + 15 : 0);
  const Nmax = Math.max(507, s.boiler ? bx + 35 : 0);

  /* проводи (під апаратами) */
  let w = "";
  w += wire([[69, 338], [69, 390]], C.L) + wire([[95, 338], [95, 390]], C.N);
  if (hasRelay) {
    w += wire([[69, 500], [69, 520], [198, 520], [198, 500]], C.L);
    w += wire([[166, 585], [166, 500]], C.N);
    w += wire([[230, 500], [230, 545], [Lmax, 545]], C.L);
  } else {
    w += wire([[69, 500], [69, 545], [Lmax, 545]], C.L);
  }
  w += wire([[95, 500], [95, 592], [140, 592]], C.N);
  w += wire([[309, 545], [309, 500]], C.L) + wire([[457, 545], [457, 500]], C.L);
  w += wire([[335, 585], [335, 500]], C.N);
  w += wire([[340, 592], [360, 592], [360, 615], [Nmax, 615]], C.N) + wire([[507, 615], [507, 500]], C.N);
  w += `<rect x="297" y="${r.near ? 140 : 250}" width="50" height="${r.near ? 250 : 140}" rx="10" fill="none" stroke="#8d98a3" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  w += wire([[309, 390], [309, r.near ? 140 : 250]], C.L) + wire([[335, 390], [335, r.near ? 140 : 250]], C.N);
  w += wire([[309, 140], [309, 105], [405, 105], [405, 290], [465, 290], [465, 276]], C.L);
  w += wire([[335, 140], [335, 113], [413, 113], [413, 282], [480, 282], [480, 276]], C.N);
  w += wire([[525, 276], [525, 292], [640, 292], [640, 105], [689, 105], [689, 140]], C.L);
  w += wire([[540, 276], [540, 284], [632, 284], [632, 113], [715, 113], [715, 140]], C.N);
  w += `<rect x="680" y="250" width="45" height="74" rx="10" fill="none" stroke="#8d98a3" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  w += wire([[689, 250], [689, 318], [395, 318], [395, 625], [432, 625], [432, 500]], C.L);
  w += wire([[715, 250], [715, 324], [403, 324], [403, 632], [482, 632], [482, 500]], C.N);
  w += wire([[440, 390], [440, 364], [581, 364], [581, 390]], C.L);
  w += wire([[495, 390], [495, 372], [609, 372], [609, 390]], C.N);
  w += wire([[581, 500], [581, 520], [660, 520], [660, 370], [gx0 + 18 + (nShown - 1) * gStep, 370]], C.L);
  for (let i = 0; i < nShown; i++) {
    const x = gx0 + 18 + i * gStep;
    w += wire([[x, 370], [x, 390]], C.L) + wire([[x, 500], [x, 540]], C.L) + wire([[x, 599], [x, 622]], C.N);
  }
  w += wire([[609, 500], [609, 592], [640, 592]], C.N);
  if (s.boiler) {
    w += wire([[bx + 15, 545], [bx + 15, 500]], C.L) + wire([[bx + 35, 615], [bx + 35, 500]], C.N);
    w += wire([[bx + 15, 390], [bx + 15, 352]], C.L) + wire([[bx + 35, 390], [bx + 35, 352]], C.N);
  }
  w += `<polyline points="40,34 1045,34 1045,70" fill="none" stroke="${C.PEy}" stroke-width="3.2"/><polyline points="40,34 1045,34 1045,70" fill="none" stroke="${C.PEg}" stroke-width="3.2" stroke-dasharray="8 8"/>`;
  w += `<polyline points="530,34 530,45" fill="none" stroke="${C.PEy}" stroke-width="3.2"/>`;
  if (!s.batBreaker) {
    w += wire([[930, 110], [819, 110], [819, 140]], C.L, 5) + wire([[930, 125], [845, 125], [845, 140]], C.DCm, 5);
    w += wire([[819, 250], [819, 290], [598, 290], [598, 276]], C.L, 5) + wire([[845, 250], [845, 300], [580, 300], [580, 276]], C.DCm, 5);
  } else {
    w += wire([[930, 110], [860, 110], [860, 290], [598, 290], [598, 276]], C.L, 5) + wire([[930, 125], [875, 125], [875, 300], [580, 300], [580, 276]], C.DCm, 5);
  }
  g += w;

  /* апарати */
  const B = (key) => brandOf(cat, key);
  let a = "";
  const n1 = P(`Ввідний автомат 2P C${s.vvod} (наявний)`);
  a += din(50, 390, 64, 110, { top: [69, 95], bot: [69, 95], label: `C${s.vvod}`, sub: "ввід", badge: n1 });
  if (hasRelay) {
    const n2 = P(`Реле напруги ${cat(r.k.relay).model}${s.relay === "have" ? " (наявне)" : " — нове"}`);
    a += din(150, 390, 96, 110, { kind: "relay", brand: B(r.k.relay), bot: [166, 198, 230], label: "Реле U", sub: "N · Lin · Lout", badge: n2 });
  }
  const n3 = P(`Автомат 2P C${r.invA} ${cat(r.k.mcb).model} — живлення інвертора (захист траси)`);
  a += din(290, 390, 64, 110, { brand: B(r.k.mcb), top: [309, 335], bot: [309, 335], label: `C${r.invA}`, sub: "інвертор", badge: n3 });
  const n4 = P(`Перемикач I-0-II ${cat(r.k.sw).model}: I — мережа (4 L, 8 N), II — інвертор (2 L, 6 N), вихід 1 L / 5 N`);
  a += din(420, 390, 100, 110, { kind: "sw", brand: B(r.k.sw), top: [440, 495], bot: [432, 457, 482, 507], label: "I-0-II", sub: `${r.swA}A · 1-L 5-N`, badge: n4 });
  ["II", "I", "II", "I"].forEach((t, i) => (a += txt([432, 457, 482, 507][i], 514, t, { size: 9, w: 700, fill: C.mute })));
  const n5 = P(`ПЗВ ${r.rcdA}A 30 мА тип A ${cat(r.k.rcd).model} — після перемикача`);
  a += din(560, 390, 70, 110, { kind: "rcd", brand: B(r.k.rcd), top: [581, 609], bot: [581, 609], label: "ПЗВ", sub: "30 мА · A", badge: n5 });
  const n6 = P(`Автомати груп C${s.groupA} × ${nG} (наявні)`);
  for (let i = 0; i < nShown; i++) {
    const x = gx0 + i * gStep;
    a += din(x, 390, 36, 110, { top: [x + 18], bot: [x + 18], label: `C${s.groupA}`, sub: `гр.${i + 1}` });
    a += `<polygon points="${x + 14},540 ${x + 22},540 ${x + 18},548" fill="${C.L}"/>`;
  }
  a += badge(gEnd - 6, 389, n6);
  if (nG > nShown) a += txt(gEnd + 6, 470, `+${nG - nShown}`, { anchor: "start", size: 13, w: 700, fill: C.mute });
  const n7 = P("N-шина міська: N вводу, реле, вхід I перемикача, живлення інвертора");
  a += bus(140, 340, 585, n7);
  const n8 = P(`N-шина квартирна ${cat("nbus").model} (нова): тільки з виходу ПЗВ + нулі груп`);
  a += bus(640, Math.max(gEnd, 700), 585, n8);
  if (s.boiler) {
    const nb = P(`Диф. автомат ${cat(r.k.rcbo).model} — лінія бойлера (поза резервом)`);
    a += din(bx, 390, 50, 110, { brand: B(r.k.rcbo), top: [bx + 15, bx + 35], bot: [bx + 15, bx + 35], label: "Диф", sub: +s.boilerKw > 3.5 ? "C20" : "C16", badge: nb });
    a += txt(bx + 25, 346, "Бойлер", { size: 11, w: 700 });
  }
  if (!r.near) {
    const n9 = P(`${r.inL}: автомат 2P C${r.invA} біля інвертора`);
    a += din(290, 140, 64, 110, { brand: B(r.k.mcb), top: [309, 335], bot: [309, 335], label: `C${r.invA}`, sub: r.inL, badge: n9 });
  }
  const n10 = P(`Інвертор ${s.invModel || ""} ${s.invKw} кВт (${r.hyb ? "гібридний" : "автономний"})`);
  a += `<rect x="442" y="48" width="180" height="230" rx="14" fill="#0b1a2a" opacity=".10"/>`;
  a += `<rect x="440" y="45" width="180" height="230" rx="14" fill="#f5f6f7" stroke="${C.edge}" stroke-width="1.4"/>`;
  a += `<path d="M440 215 H620 V261 a14 14 0 0 1 -14 14 H454 a14 14 0 0 1 -14 -14 Z" fill="#e3e7ea" stroke="${C.edge}" stroke-width="1"/>`;
  a += `<rect x="472" y="70" width="116" height="78" rx="8" fill="#1c2630"/><rect x="480" y="78" width="100" height="44" rx="3" fill="#0f2a22"/>`;
  a += `<text x="530" y="104" ${FONT} font-size="15" font-weight="700" fill="#5fe0a0" text-anchor="middle">230V</text><text x="530" y="117" ${FONT} font-size="8.5" fill="#7fb7ff" text-anchor="middle">${esc(s.invKw)} kW · ${r.hyb ? "HYBRID" : "OFF-GRID"}</text>`;
  [494, 512, 530, 548, 566].forEach((x) => (a += `<circle cx="${x}" cy="136" r="4" fill="#3a4651"/>`));
  a += txt(530, 180, (s.invModel || "Інвертор").slice(0, 26), { size: 10.5, w: 700 });
  a += txt(472, 236, r.inL, { size: 9, fill: C.mute }) + txt(532, 236, r.outL, { size: 9, fill: C.mute }) + txt(589, 236, "BAT", { size: 9, fill: C.mute });
  [465, 480, 525, 540, 580, 598].forEach((x, i) => (a += `<rect x="${x - 5}" y="262" width="10" height="13" rx="2" fill="${i === 4 ? "#333" : i === 5 ? C.L : C.term}" stroke="#6b7782"/>`));
  a += badge(619, 46, n10);
  const n11 = P(`${r.outL}: автомат 2P C${r.invA} біля інвертора`);
  a += din(670, 140, 64, 110, { brand: B(r.k.mcb), top: [689, 715], bot: [689, 715], label: `C${r.invA}`, sub: r.outL, badge: n11 });
  if (!s.batBreaker) {
    const n12 = P(`DC-автомат 2P ${r.dcA}A ${cat(r.k.dc).model} (+ і −)`);
    a += din(800, 140, 64, 110, { kind: "dc", brand: B(r.k.dc), top: [819, 845], bot: [819, 845], label: `${r.dcA}A`, sub: "DC 2P", badge: n12 });
  }
  const n13 = P(`АКБ ${s.batModel || ""} × ${s.batN} (${r.kwh.toFixed(2)} кВт·год)${s.batBreaker ? " — вбудований DC-автомат" : ""}`);
  a += `<rect x="932" y="73" width="230" height="190" rx="10" fill="#0b1a2a" opacity=".10"/>`;
  a += `<rect x="930" y="70" width="230" height="190" rx="10" fill="#f1f3f5" stroke="${C.edge}" stroke-width="1.4"/><path d="M930 104 V80 a10 10 0 0 1 10 -10 H1150 a10 10 0 0 1 10 10 V104 Z" fill="#2a333c"/>`;
  a += `<circle cx="948" cy="110" r="6" fill="${C.L}"/><circle cx="948" cy="125" r="6" fill="#222"/>`;
  a += txt(1045, 92, (s.batModel || "АКБ").slice(0, 28), { size: 11, w: 700, fill: "#fff" });
  for (let i = 0; i < 4; i++) a += `<rect x="${985 + i * 34}" y="205" width="26" height="8" rx="2" fill="${i < 3 ? "#4cc07d" : "#cfd5da"}"/>`;
  a += txt(1045, 160, `${s.batN} × ${(+s.batKwh || 0).toFixed(2)} кВт·год`, { size: 13, w: 700 });
  a += txt(1045, 180, `до ${r.Ibat} A розряду`, { size: 10.5, fill: C.mute });
  a += badge(1159, 71, n13);
  g += a;

  g += txt(44, 30, "PE", { anchor: "start", size: 10, w: 700, fill: C.mute });
  g += txt(104, 350, "від лічильника", { anchor: "start", size: 10, fill: C.mute });
  g += txt(36, 322, `${cat(r.cab).name.replace("Кабель ", "")} · ${s.trace} м`, { anchor: "start", size: 10.5, w: 700, fill: C.mute });
  g += txt(760, 322, "жили 1-2 — вхід, 3-4 — вихід, 5 — PE", { anchor: "start", size: 10, fill: C.mute });
  if (!s.batBreaker) g += txt(890, 282, "DC", { size: 10, w: 700, fill: C.mute });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Схема підключення інвертора"><rect width="${W}" height="${H}" fill="${C.paper}"/>${g}</svg>`;
  return { svg, parts };
}
