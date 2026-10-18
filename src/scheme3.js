import { esc } from "./utils.js";

const C = {
  ink: "#1d2733",
  muted: "#66727f",
  edge: "#9aa5af",
  paper: "#fcfdfd",
  phase: "#b65f27",
  neutral: "#1f6fd1",
  battery: "#2f8f46",
  warn: "#b77800",
  soft: "#f4f6f8",
};

const FONT = 'font-family="Golos Text, Arial, sans-serif"';
const txt = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${o.size || 18}" font-weight="${o.w || 500}" fill="${o.fill || C.ink}" text-anchor="${o.anchor || "middle"}">${esc(s)}</text>`;

function box(x, y, w, h, title, sub, o = {}) {
  const fill = o.fill || "#fff";
  const stroke = o.stroke || C.edge;
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  g += txt(x + w / 2, y + 38, title, { size: 19, w: 700 });
  if (sub) g += txt(x + w / 2, y + 68, sub, { size: 13, fill: C.muted });
  return g;
}

function arrow(x1, y1, x2, y2, label) {
  let g = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="3" marker-end="url(#arr)"/>`;
  if (label) g += txt((x1 + x2) / 2, y1 - 12, label, { size: 12, fill: C.muted });
  return g;
}

function phaseBadges(x, y, selected) {
  const phases = ["L1", "L2", "L3", "N"];
  return phases.map((p, i) => {
    const active = p === selected;
    const fill = p === "N" ? C.neutral : active ? C.phase : "#eef1f3";
    const color = p === "N" || active ? "#fff" : C.muted;
    return `<rect x="${x + i * 46}" y="${y}" width="36" height="26" rx="13" fill="${fill}" stroke="${active ? C.phase : C.edge}"/>${txt(x + i * 46 + 18, y + 18, p, { size: 11, w: 700, fill: color })}`;
  }).join("");
}

function batteryBlock(x, y, s) {
  const name = s.batModel || "АКБ";
  const qty = Math.max(1, +s.batN || 1);
  let g = box(x, y, 250, 100, "АКБ", `${name} × ${qty}`, { fill: "#f1f8f3", stroke: C.battery });
  g += `<line x1="${x + 125}" y1="${y}" x2="${x + 125}" y2="${y - 58}" stroke="${C.battery}" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#arrGreen)"/>`;
  return g;
}

function header(title, subtitle) {
  return txt(60, 55, title, { anchor: "start", size: 26, w: 700 }) +
    txt(60, 82, subtitle, { anchor: "start", size: 14, fill: C.muted });
}

function footerNote() {
  return `<rect x="60" y="560" width="1080" height="58" rx="12" fill="#fff7e6" stroke="#d7a443"/>` +
    txt(600, 585, "Концептуальна схема для клієнта — не монтажна схема", { size: 15, w: 700, fill: C.warn }) +
    txt(600, 606, "Номінали захисту, перерізи та остаточна топологія підтверджуються за паспортом обладнання і проєктом.", { size: 12, fill: C.muted });
}

function wrap(g, label) {
  const W = 1200;
  const H = 660;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.ink}"/></marker><marker id="arrGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.battery}"/></marker></defs><rect width="${W}" height="${H}" fill="${C.paper}"/>${g}</svg>`;
}

export function buildPhaseOverview(s, calc) {
  const r = calc.r;
  const gridPhases = +s.gridPhases === 3 ? 3 : 1;
  const invPhases = +s.invPhases === 3 ? 3 : 1;
  const scenario = `${gridPhases}to${invPhases}`;
  const parts = [];
  let g = "";

  if (scenario === "3to1") {
    const phase = s.backupPhase || "L1";
    parts.push("3-фазна мережа об'єкта");
    parts.push("Проєктний захист резервної гілки");
    parts.push(`Резервна гілка від ${phase}`);
    parts.push("1-фазний інвертор");
    parts.push("Резервна секція щита");
    parts.push("Акумуляторна батарея");

    g += header("3-ф мережа → 1-ф резерв", `Резервна гілка: ${phase} · ${s.invModel || "інвертор"}`);
    g += box(60, 170, 180, 100, "3-ф мережа", "400/230 В");
    g += phaseBadges(63, 285, phase);
    g += box(310, 170, 210, 100, "Проєктний захист", "номінали — за проєктом", { fill: C.soft });
    g += box(590, 170, 210, 100, `Гілка ${phase}`, "інші фази — поза резервом", { fill: "#fff7e6", stroke: "#d7a443" });
    g += box(870, 150, 250, 140, "1-ф інвертор", `${s.invModel || "Модель"} · ${s.invKw || "—"} кВт`);
    g += arrow(240, 220, 310, 220);
    g += arrow(520, 220, 590, 220);
    g += arrow(800, 220, 870, 220);
    g += box(870, 360, 250, 110, "Резервна секція", s.reserveMode === "section" ? "вся резервна секція" : `${s.groups || "—"} груп`);
    g += arrow(995, 290, 995, 360, "резерв");
    g += batteryBlock(590, 385, s);
    g += arrow(840, 435, 870, 435, "DC/АКБ");
    g += footerNote();
    return { svg: wrap(g, "Концептуальна схема 3-ф мережа до 1-ф резерву"), parts, conceptual: true };
  }

  if (scenario === "3to3") {
    parts.push("3-фазна мережа об'єкта");
    parts.push("Проєктний 4P захист");
    parts.push("3-фазний інвертор");
    parts.push("3-фазна резервна секція");
    parts.push("Акумуляторна батарея");

    g += header("3-ф мережа → 3-ф резерв", `${s.invModel || "3-ф інвертор"} · ${s.invKw || "—"} кВт`);
    g += box(70, 175, 200, 105, "3-ф мережа", "L1 · L2 · L3 · N");
    g += phaseBadges(77, 300, "");
    g += box(340, 175, 220, 105, "Проєктний 4P захист", "тип і номінал — за проєктом", { fill: C.soft });
    g += box(650, 150, 260, 155, "3-ф інвертор", `${s.invModel || "Модель"} · ${s.invKw || "—"} кВт`);
    g += box(980, 175, 150, 105, "3-ф резерв", "резервний щит");
    g += arrow(270, 228, 340, 228);
    g += arrow(560, 228, 650, 228);
    g += arrow(910, 228, 980, 228);
    g += batteryBlock(655, 390, s);
    g += arrow(780, 390, 780, 305, "АКБ");
    g += footerNote();
    return { svg: wrap(g, "Концептуальна схема 3-ф мережа до 3-ф резерву"), parts, conceptual: true };
  }

  parts.push("Конфігурація потребує перегляду");
  g += header("Конфігурація потребує перегляду", "1-ф мережа → 3-ф інвертор не показується як робоча схема");
  g += box(160, 190, 260, 120, "1-ф мережа", "поточні вхідні дані", { fill: C.soft });
  g += box(780, 190, 260, 120, "3-ф інвертор", s.invModel || "Модель", { fill: "#fff0f0", stroke: "#c86464" });
  g += `<line x1="420" y1="250" x2="780" y2="250" stroke="#c86464" stroke-width="3" stroke-dasharray="10 8"/>`;
  g += txt(600, 230, "потрібна інша топологія або обладнання", { size: 15, w: 700, fill: "#a23f3f" });
  g += footerNote();
  return { svg: wrap(g, "Конфігурація потребує перегляду"), parts, conceptual: true };
}
