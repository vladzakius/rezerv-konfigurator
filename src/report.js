import { esc, fmt, dec } from "./utils.js";
import { worksDone, workPrice } from "./compute.js";

/* PDF-фотозвіт: HTML-сторінки рендеряться поза екраном (html2canvas) і складаються в A4 (jsPDF).
   Кирилиця йде через браузерні шрифти, тому вбудовувати шрифт у PDF не потрібно. */

function svgToPng(svg, w, h) {
  return new Promise((res) => {
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d");
        x.fillStyle = "#fff";
        x.fillRect(0, 0, w, h);
        x.drawImage(img, 0, 0, w, h);
        res(c.toDataURL("image/png"));
      } catch {
        res(url);
      }
    };
    img.onerror = () => res(url);
    img.src = url;
  });
}
const waitImages = (el) =>
  Promise.all([...el.querySelectorAll("img")].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));

function reportSection({ s, calc, cat, png, parts, zones }) {
  const r = calc.r;
  const d = s.rpDate ? new Date(s.rpDate + "T12:00:00").toLocaleDateString("uk-UA") : "";
  const kv = [
    ["Інвертор", `${s.invModel || "—"}, ${s.invKw} кВт`],
    ["Тип", r.hyb ? "гібридний" : "автономний"],
    ["Батарея", `${s.batModel || "—"} × ${s.batN}`],
    ["Ємність", `${dec(r.kwh, 2)} кВт·год`],
    ["Макс. навантаження від АКБ", `${dec(r.lim)} кВт`],
    ["Груп у резерві", `${s.groups}`],
    ["Траса", `${cat(r.cab).name.replace("Кабель ", "")}, ${s.trace} м`],
    ["Ввідний автомат", `C${s.vvod}`],
  ];
  let h = `<div class="rp"><div class="rp-head" data-blk><div><div class="rp-kicker">Звіт про виконані роботи</div><h1>Система резервного живлення</h1><div>${esc(s.client || "")}</div></div>
    <div class="rp-meta">${esc(d)}<br>${s.executor ? "Виконавець: " + esc(s.executor) : ""}${s.phone ? "<br>" + esc(s.phone) : ""}</div></div>`;
  h += `<h2 data-blk>Встановлене обладнання</h2><div class="rp-kv" data-blk>${kv.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>`;
  if (png)
    h += `<h2 data-blk>Схема підключення</h2><img class="rp-img" data-blk src="${png}" alt=""><div class="rp-leg" data-blk>L — червоний, N — синій, PE — жовто-зелений, DC: + червоний, − чорний. Пунктир — кабель траси.</div>
    <div class="rp-parts" data-blk>${parts.map((p, i) => `<div>${i + 1}. ${esc(p)}</div>`).join("")}</div>`;
  h += `<h2 data-blk>Виконані роботи</h2><ul>${worksDone(s, r).map((x) => `<li data-blk>${esc(x)}</li>`).join("")}</ul>`;
  if (s.rpPrices) {
    h += `<h2 data-blk>Кошторис</h2><table><thead><tr data-blk><th>№</th><th>Позиція</th><th class="n">К-сть</th><th class="n">Ціна, грн</th><th class="n">Сума, грн</th></tr></thead><tbody>`;
    let i = 0;
    Object.keys(zones).forEach((z) => {
      const rows = calc.items.filter((it) => it.zone === z);
      if (!rows.length) return;
      h += `<tr class="z" data-blk><td colspan="4">${zones[z]}</td><td class="n">${fmt(rows.reduce((a, b) => a + b.sum, 0))}</td></tr>`;
      rows.forEach((it) => {
        i++;
        const wp = workPrice(it, r);
        const extra = it.zone !== "works" && it.c.model ? ` <span style="color:#5b6876">(${esc(it.c.model)})</span>` : "";
        h += `<tr data-blk><td>${i}</td><td>${esc(it.c.name)}${extra}</td><td class="n">${it.qty} ${esc(it.c.unit)}</td><td class="n">${wp || fmt(it.c.price)}</td><td class="n">${wp || fmt(it.sum)}</td></tr>`;
      });
    });
    h += `<tr class="t" data-blk><td></td><td>Матеріали</td><td></td><td></td><td class="n">${fmt(r.mat)} грн</td></tr>`;
    if (r.wLabel) h += `<tr class="t" data-blk><td></td><td>Монтаж</td><td></td><td></td><td class="n">${r.wLabel}</td></tr>`;
    h += `<tr class="t" data-blk><td></td><td>Разом</td><td></td><td></td><td class="n">${r.totalLabel}</td></tr></tbody></table>`;
  }
  h += `<div class="rp-sign" data-blk><div>Виконавець: ${esc(s.executor || "")}</div><div>Замовник</div></div></div>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = h;
  return wrap.firstElementChild;
}

function photoPage(s, list, startIdx) {
  const el = document.createElement("div");
  el.className = "rp-pg";
  el.innerHTML =
    `<div class="rp-pghead">Фотозвіт · ${esc(s.client || "")}</div>` +
    list
      .map((p, j) => {
        const k = Math.min(698 / p.w, 420 / p.h);
        const w = Math.round(p.w * k);
        const h = Math.round(p.h * k);
        return `<div class="rp-ph"><div class="rp-phbox"><img src="${p.src}" width="${w}" height="${h}" style="width:${w}px;height:${h}px" alt=""></div><div class="rp-cap">${startIdx + j + 1}. ${esc(p.cap || "Фото")}</div></div>`;
      })
      .join("");
  return el;
}

/* розрізає довгу секцію на сторінки, не розриваючи рядки таблиці, пункти й картинки */
function sliceCuts(sec) {
  const top = sec.getBoundingClientRect().top;
  const H = sec.offsetHeight;
  const CH = 1123 - 40 - 60;
  const blocks = [...sec.querySelectorAll("[data-blk]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { t: r.top - top, b: r.bottom - top + (el.tagName === "H2" ? 90 : 0) };
  });
  const cuts = [];
  let start = 0;
  while (start < H - 4) {
    let cut = Math.min(start + CH, H);
    if (cut < H) {
      let ch = true;
      while (ch) {
        ch = false;
        for (const b of blocks)
          if (b.t < cut - 1 && b.b > cut + 1 && b.t > start + 30) {
            cut = b.t;
            ch = true;
          }
      }
    }
    cuts.push([start, cut]);
    start = cut;
  }
  return cuts;
}
function pageCanvas(S) {
  const c = document.createElement("canvas");
  c.width = Math.round(794 * S);
  c.height = Math.round(1123 * S);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
function footer(c, S, label, i, N) {
  const x = c.getContext("2d");
  x.fillStyle = "#d5dbe0";
  x.fillRect(48 * S, (1123 - 38) * S, (794 - 96) * S, S);
  x.fillStyle = "#7a8590";
  x.font = `${10.5 * S}px "Golos Text", Arial, sans-serif`;
  x.textAlign = "left";
  x.fillText(String(label || "").slice(0, 70), 48 * S, (1123 - 20) * S);
  x.textAlign = "right";
  x.fillText(`${i} / ${N}`, (794 - 48) * S, (1123 - 20) * S);
}

export async function makePdf({ s, calc, cat, svg, parts, photos, zones, onStatus }) {
  onStatus?.("Завантажую модулі…");
  const [{ jsPDF }, h2cMod] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const html2canvas = h2cMod.default || h2cMod;
  if (document.fonts?.ready) await document.fonts.ready;
  onStatus?.("Готую сторінки…");

  const host = document.createElement("div");
  host.className = "rp-host";
  document.body.appendChild(host);
  try {
    const png = await svgToPng(svg, 2400, 1320);
    const sec = reportSection({ s, calc, cat, png, parts, zones });
    host.appendChild(sec);
    await waitImages(host);
    const H = sec.offsetHeight;
    const S = Math.min(2, Math.sqrt(14e6 / (794 * H)));
    const cv = await html2canvas(sec, { scale: S, backgroundColor: "#ffffff", logging: false });
    const cuts = sliceCuts(sec);
    const groups = [];
    for (let i = 0; i < photos.length; i += 2) groups.push(photos.slice(i, i + 2));
    const N = cuts.length + groups.length;

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const PW = pdf.internal.pageSize.getWidth();
    const PH = pdf.internal.pageSize.getHeight();
    let idx = 0;
    for (const [y0, y1] of cuts) {
      const pc = pageCanvas(S);
      const sy = Math.round(y0 * S);
      const sh = Math.min(cv.height - sy, Math.round((y1 - y0) * S));
      if (sh > 0) pc.getContext("2d").drawImage(cv, 0, sy, cv.width, sh, 0, Math.round(40 * S), pc.width, sh);
      idx++;
      footer(pc, S, s.client, idx, N);
      if (idx > 1) pdf.addPage();
      pdf.addImage(pc.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, PW, PH);
    }
    host.innerHTML = "";
    for (let g = 0; g < groups.length; g++) {
      onStatus?.(`Фото: сторінка ${g + 1} з ${groups.length}…`);
      const pg = photoPage(s, groups[g], g * 2);
      host.appendChild(pg);
      await waitImages(pg);
      const S2 = 1.6;
      const c = await html2canvas(pg, { scale: S2, backgroundColor: "#ffffff", logging: false, width: 794, height: 1123 });
      const pc = pageCanvas(S2);
      pc.getContext("2d").drawImage(c, 0, 0, pc.width, pc.height);
      idx++;
      footer(pc, S2, s.client, idx, N);
      pdf.addPage();
      pdf.addImage(pc.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, PW, PH);
      host.innerHTML = "";
    }
    return { blob: pdf.output("blob"), pages: N };
  } finally {
    host.remove();
  }
}
