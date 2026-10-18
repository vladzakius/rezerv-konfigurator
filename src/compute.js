import { fmt } from "./utils.js";

const STD = [16, 20, 25, 32, 40, 50, 63];
const stdUp = (v) => STD.find((s) => s >= v) || 63;

function routeProfile(m) {
  const trace = Math.max(1, +m || 1);
  if (trace <= 3) return { key: "near", label: "до 3 м", reserve: 1, review: false };
  if (trace <= 15) return { key: "short", label: "4–15 м", reserve: 2, review: false };
  if (trace <= 30) return { key: "medium", label: "16–30 м", reserve: Math.max(3, Math.ceil(trace * 0.08)), review: true };
  if (trace <= 50) return { key: "long", label: "31–50 м", reserve: Math.ceil(trace * 0.1), review: true };
  if (trace <= 100) return { key: "very-long", label: "51–100 м", reserve: Math.ceil(trace * 0.1), review: true };
  return { key: "special", label: "100+ м", reserve: Math.ceil(trace * 0.12), review: true };
}

/** Розрахунок позицій кошторису, номіналів і підказок з вхідних даних */
export function compute(s, cat) {
  const items = [];
  const notes = [];
  const add = (zone, key, qty, note, c) => {
    if (qty > 0) items.push({ zone, key, qty, note: note || "", c });
  };

  const P = +s.invKw || 0;
  const vv = +s.vvod || 32;
  const nB = Math.max(1, +s.batN || 1);
  const gridPhases = +s.gridPhases === 3 ? 3 : 1;
  const invPhases = +s.invPhases === 3 ? 3 : 1;
  const trace = Math.max(1, +s.trace || 1);
  const route = routeProfile(trace);
  const near = route.key === "near";
  const hyb = s.invType === "hybrid";
  const phaseScenario = `${gridPhases}to${invPhases}`;
  const nominalAcA = P > 0 ? (invPhases === 3 ? (P * 1000) / (Math.sqrt(3) * 400) : (P * 1000) / 230) : 0;

  /* Автоматичний підбір 1-ф захисту збережено лише для 1-ф інвертора. Для 3-ф режиму — тільки проєктні placeholders. */
  const invCalc = invPhases === 1 ? stdUp(nominalAcA * 1.25) : 0;
  const invA = invPhases === 1 ? Math.max(16, Math.min(invCalc, vv)) : 0;
  const big = vv > 40;
  const r = {
    invA, big, near, hyb, gridPhases, invPhases, phaseScenario, nominalAcA, route,
    schemeSupported: invPhases === 1,
    swA: big ? 63 : 40,
    rcdA: big ? 63 : 40,
    dcA: P >= 5 ? 125 : 100,
    inL: hyb ? "GRID" : "AC IN",
    outL: hyb ? "LOAD" : "AC OUT",
  };
  r.k = {
    sw: big ? "sw63" : "sw40",
    rcd: big ? "rcd63" : "rcd40",
    mcb: "mcb2p_" + (invA || 32),
    relay: big ? "relay63" : "relay",
    dc: P >= 5 ? "dc125" : "dc100",
    rcbo: +s.boilerKw > 3.5 ? "rcbo20" : "rcbo16",
  };

  if (invPhases === 1) {
    add("main", r.k.sw, 1, "мережа / інвертор, 1-ф конфігурація");
    add("main", r.k.rcd, 1, "1-ф резервна частина");
    add("main", r.k.mcb, 1, "живлення інвертора; остаточний захист звірити з паспортом");
    if (s.relay === "add") add("main", r.k.relay, 1, "за проєктом");
    add("main", "nbus", 1, "окрема N-шина резервної частини");
    if (s.newBox) add("main", "box_main", 1);

    if (near) {
      add("inv", r.k.mcb, 1, r.outL + " біля інвертора");
      add("inv", "box_small", 1);
    } else {
      add("inv", "box_inv", 1);
      add("inv", r.k.mcb, 2, `${r.inL} і ${r.outL}; остаточну комплектацію звірити з паспортом`);
    }
  } else {
    add("main", "sw4p_project", 1, "4P; номінал після перевірки проєкту");
    add("main", "rcd4p_project", 1, "тип і номінал після перевірки проєкту");
    add("main", "ac3p_protection", 1, "без автоматичного підбору номіналу");
    add("inv", "box_inv", 1, "розмір визначити після комплектації");
  }

  if (!s.batBreaker) {
    add("dc", r.k.dc, 1, "параметри DC-захисту звірити з паспортом АКБ та інвертора");
    add("dc", "box_small", 1, "окремо від AC");
    add("dc", "lugs", 4);
    add("dc", "batcab", 2, "готові силові кабелі АКБ");
  }

  if (invPhases === 1) {
    r.cab = invA <= 25 ? "cab4" : invA <= 40 ? "cab6" : "cab10";
    add("trace", r.cab, trace + route.reserve, `траса ${trace} м + ${route.reserve} м запасу; переріз потребує перевірки для довгих трас`);
  } else {
    r.cab = "ac3p_cable";
    add("trace", "ac3p_cable", trace + route.reserve, `траса ${trace} м + ${route.reserve} м запасу; переріз за окремим розрахунком`);
  }
  if (s.routeMethod === "duct") add("trace", "duct", trace);
  add("trace", "ferrules", 1);
  add("trace", "anchors", 1);

  if (s.boiler) {
    const heavy = (+s.boilerKw || 0) > 3.5;
    add("opt", r.k.rcbo, 1, "лінія бойлера поза резервом; остаточний захист перевірити");
    add("opt", heavy ? "cab3x4" : "cab3x25", Math.max(1, +s.boilerLen || 1));
    add("opt", "socket", 1);
  }
  if (s.irelay) add("opt", "irelay", 1, "налаштування за паспортом обладнання");
  if (s.meter) add("opt", "meter", 1);

  const rate = +s.rate || 0;
  const cur = s.workCur === "uah" ? "uah" : "usd";
  const wAmt = cur === "usd" ? +s.workUsd || 0 : +s.workUah || 0;
  r.rate = rate;
  r.wCur = cur;
  r.wAmt = wAmt;
  r.wLabel = wAmt ? (cur === "usd" ? `${fmt(wAmt)} $` : `${fmt(wAmt)} грн`) : "";
  if (wAmt > 0) {
    const wUah = cur === "usd" ? wAmt * rate : wAmt;
    const note = cur === "usd" ? `${fmt(wAmt)} $ за курсом ${String(rate).replace(".", ",")}` : "";
    add("works", "work", 1, note, { name: "Монтажні роботи під ключ", model: "", price: wUah, unit: "компл", url: "" });
  }

  const Ibat = (+s.batI || 100) * nB;
  const Pmax = (Ibat * 48 * 0.93) / 1000;

  if (phaseScenario === "1to3") notes.push({ t: "bad", m: "1-фазна мережа та 3-фазний інвертор — несумісний базовий сценарій. Потрібна інша топологія або інше обладнання." });
  if (phaseScenario === "3to1") notes.push({ t: "warn", m: `3-ф мережа → 1-ф резерв: у конфігураторі обрана фаза ${s.backupPhase || "L1"}. Трифазні споживачі та баланс фаз потребують окремої перевірки проєкту.` });
  if (phaseScenario === "3to3") notes.push({ t: "warn", m: "3-ф резерв: схема та номінали захисту не підбираються автоматично. Конфігуратор формує кошторисні placeholders і перелік даних для перевірки проєкту." });
  if (invPhases === 3 && nominalAcA > 0) notes.push({ t: "", m: `Орієнтовний номінальний AC-струм інвертора — близько ${nominalAcA.toFixed(1)} A на фазу. Це довідкове значення, не номінал захисного апарата.` });

  if (!hyb && s.relay === "none") notes.push({ t: "warn", m: "Для автономного інвертора без окремого реле напруги перевір вимоги виробника до AC-входу." });
  if (hyb) notes.push({ t: "", m: "Гібридний режим: параметри експорту, CT та мережеві налаштування звірити з паспортом і умовами оператора мережі." });
  if (invPhases === 1 && invCalc > vv) notes.push({ t: "warn", m: `Розрахункове навантаження інвертора вище вводу C${vv}. Потрібно перевірити ліміти заряджання та загальне навантаження об'єкта.` });
  if (Pmax < P) notes.push({ t: "warn", m: `Сумарна віддача АКБ за введеними даними нижча за номінальну потужність інвертора. Перевір паспортні ліміти АКБ/BMS та інвертора.` });

  const chg = Math.min(vv <= 32 ? 30 : 50, Math.round(Ibat * 0.5));
  r.chg = chg;
  if (route.review) notes.push({ t: "warn", m: `Траса ${trace} м (${route.label}): базовий переріз не вважається підтвердженим. Перевір падіння напруги, допустимий струм, спосіб прокладання та паспорт інвертора.` });
  if (trace > 50) notes.push({ t: "warn", m: "Дуже довга AC-траса: у кошторис додано 10% запасу кабелю. Проєктний переріз і захист мають бути підтверджені окремим розрахунком." });
  if (s.routeMethod === "existing") notes.push({ t: "", m: "Траса в існуючій трубі/стояку: перевір фактичний стан, доступний внутрішній діаметр і можливість протяжки до закупівлі кабелю." });

  if (s.earth === "tnc") notes.push({ t: "warn", m: "TN-C: стан системи заземлення та можливість підключення корпусів потрібно перевірити на місці кваліфікованим спеціалістом." });
  if (+s.groupA >= 25) notes.push({ t: "warn", m: `Групи C${s.groupA}: перевір відповідність номіналу фактичному кабелю кожної групи.` });
  if (s.boiler) notes.push({ t: "", m: "Бойлер у цій конфігурації позначений як навантаження поза резервом." });
  notes.push({ t: "", m: "Умови монтажу, вентиляцію, відступи та допустиме місце встановлення інвертора/АКБ звірити з паспортом конкретних моделей." });

  let mat = 0;
  let wk = 0;
  items.forEach((it) => {
    it.c = it.c || cat(it.key);
    it.sum = it.c.price * it.qty;
    if (it.zone === "works") wk += it.sum;
    else mat += it.sum;
  });
  Object.assign(r, { mat, works: wk, total: mat + wk, Pmax, Ibat, lim: Math.min(P, Pmax), kwh: (+s.batKwh || 0) * nB });
  r.totalLabel = r.wCur === "usd" && r.wAmt ? `${fmt(mat)} грн + ${fmt(r.wAmt)} $` : `${fmt(r.total)} грн`;
  return { items, notes, r };
}

export const workPrice = (it, r) => (it.zone === "works" && r.wCur === "usd" ? `${fmt(r.wAmt)} $` : null);

export function buyList(calc) {
  const map = new Map();
  calc.items
    .filter((it) => it.zone !== "works")
    .forEach((it) => {
      const m = map.get(it.key);
      if (m) {
        m.qty += it.qty;
        m.sum += it.sum;
      } else map.set(it.key, { key: it.key, c: it.c, qty: it.qty, sum: it.sum });
    });
  return [...map.values()];
}

export function worksDone(s, r) {
  const w = ["Монтаж інвертора і АКБ"];
  if (!r.near) w.push("Окрема зона/щиток біля інвертора");
  if (!s.batBreaker) w.push("DC-підключення АКБ із передбаченим захистом");
  w.push(`Роботи з резервною частиною щита · ${r.gridPhases}ф мережа → ${r.invPhases}ф інвертор`);
  w.push(`Прокладка AC-траси — ${Math.max(1, +s.trace || 1)} м`);
  if (s.boiler) w.push("Окрема лінія бойлера поза резервом");
  w.push("Пусконаладка та перевірка за документацією обладнання");
  return w;
}

export function clientText(s, calc, zones) {
  const r = calc.r;
  let i = 0;
  let t = `Кошторис — ${s.client || "об'єкт"}\nІнвертор: ${s.invModel} ${s.invKw} кВт · ${r.invPhases}ф · АКБ: ${s.batModel} × ${s.batN}\nМережа: ${r.gridPhases}ф · траса: ${Math.max(1, +s.trace || 1)} м\n\n`;
  Object.keys(zones).forEach((z) => {
    const rows = calc.items.filter((it) => it.zone === z);
    if (!rows.length) return;
    t += `${zones[z]}:\n`;
    rows.forEach((it) => {
      i++;
      const wp = workPrice(it, r);
      t += wp
        ? `${i}. ${it.c.name} — ${wp}\n`
        : `${i}. ${it.c.name}${it.c.model ? " (" + it.c.model + ")" : ""} — ${it.qty} ${it.c.unit} × ${fmt(it.c.price)} = ${fmt(it.sum)} грн\n`;
    });
    t += "\n";
  });
  t += `Матеріали: ${fmt(r.mat)} грн\n${r.wLabel ? `Монтаж: ${r.wLabel}\n` : ""}Разом: ${r.totalLabel}`;
  return t;
}
