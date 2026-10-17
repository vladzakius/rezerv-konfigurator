import { fmt } from "./utils.js";

const STD = [16, 20, 25, 32, 40, 50, 63];
const stdUp = (v) => STD.find((s) => s >= v) || 63;

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
  const invCalc = stdUp((P * 1000) / 230 * 1.25);
  const invA = Math.max(16, Math.min(invCalc, vv));
  const big = vv > 40;
  const near = s.layout === "near";
  const hyb = s.invType === "hybrid";
  const r = {
    invA, big, near, hyb,
    swA: big ? 63 : 40,
    rcdA: big ? 63 : 40,
    dcA: P >= 5 ? 125 : 100,
    inL: hyb ? "GRID" : "AC IN",
    outL: hyb ? "LOAD" : "AC OUT",
  };
  r.k = {
    sw: big ? "sw63" : "sw40",
    rcd: big ? "rcd63" : "rcd40",
    mcb: "mcb2p_" + invA,
    relay: big ? "relay63" : "relay",
    dc: P >= 5 ? "dc125" : "dc100",
    rcbo: +s.boilerKw > 3.5 ? "rcbo20" : "rcbo16",
  };

  add("main", r.k.sw, 1, "мережа / інвертор, розриває L і N");
  add("main", r.k.rcd, 1, "після перемикача — захищає в обох режимах");
  add("main", r.k.mcb, 1, "живлення інвертора, захист кабелю траси");
  if (s.relay === "add") add("main", r.k.relay, 1, "до перемикача і живлення інвертора");
  add("main", "nbus", 1, "окрема N-шина: квартира або міська");
  if (s.newBox) add("main", "box_main", 1);

  if (near) {
    add("inv", r.k.mcb, 1, r.outL + " біля інвертора");
    add("inv", "box_small", 1);
  } else {
    add("inv", "box_inv", 1);
    add("inv", r.k.mcb, 2, `${r.inL} і ${r.outL} — обслуговування, вимога мануалу`);
  }

  if (!s.batBreaker) {
    add("dc", r.k.dc, 1, "розриває + і − батареї");
    add("dc", "box_small", 1, "окремо від AC");
    add("dc", "lugs", 4);
    add("dc", "batcab", 2, "автомат → інвертор, + і −");
  }
  const trace = Math.max(1, +s.trace || 1);
  r.cab = invA <= 25 ? "cab4" : invA <= 40 ? "cab6" : "cab10";
  add("trace", r.cab, trace + 1, "+1 м запас; жили 1-2 вхід, 3-4 вихід, 5 PE");
  add("trace", "duct", trace);
  add("trace", "ferrules", 1);
  add("trace", "anchors", 1);

  if (s.boiler) {
    const heavy = (+s.boilerKw || 0) > 3.5;
    add("opt", r.k.rcbo, 1, "лінія бойлера, до перемикача");
    add("opt", heavy ? "cab3x4" : "cab3x25", Math.max(1, +s.boilerLen || 1));
    add("opt", "socket", 1);
  }
  if (s.irelay) add("opt", "irelay", 1, "обмежує навантаження в режимі АКБ");
  if (s.meter) add("opt", "meter", 1);

  // монтаж: сума в доларах (за курсом) + сума в гривнях
  const usd = +s.workUsd || 0;
  const uah = +s.workUah || 0;
  const rate = +s.rate || 0;
  r.usd = usd;
  r.rate = rate;
  const wSum = usd * rate + uah;
  if (wSum > 0) {
    const note = [usd ? `${fmt(usd)} $ × ${String(rate).replace(".", ",")}` : "", uah ? `${fmt(uah)} грн` : ""]
      .filter(Boolean)
      .join(" + ");
    add("works", "work", 1, note, { name: "Монтажні роботи під ключ", model: "", price: wSum, unit: "компл", url: "" });
  }

  // підказки для монтажника
  const Ibat = (+s.batI || 100) * nB;
  const Pmax = (Ibat * 48 * 0.93) / 1000;
  if (!hyb && s.relay === "none")
    notes.push({ t: "bad", m: "Автономний інвертор без реле напруги на вході — ризик. Реле обов'язкове: пороги 180–190 / 250–255 В, затримка 10–30 с." });
  if (s.relay !== "none") notes.push({ t: "", m: "Реле напруги стоїть до перемикача: захищає і байпас квартири, і вхід інвертора." });
  if (hyb)
    notes.push({ t: "", m: "Гібрид: вимкнути продаж у мережу (Zero export / Sell off), якщо немає «зеленого» тарифу. CT-датчик — на фазу вводу після лічильника, до відгалуження на інвертор (зазвичай у комплекті)." });
  if (invCalc > vv)
    notes.push({ t: "warn", m: `Ввід C${vv} менший за розрахунковий струм інвертора (C${invCalc}) — автомат інвертора обмежено C${vv}. Струм заряду від мережі виставити так, щоб навантаження + заряд не вибивали ввідний.` });
  if (Pmax < P)
    notes.push({ t: "warn", m: `${nB > 1 ? nB + " АКБ віддають" : "АКБ віддає"} до ${Ibat} A ≈ ${Pmax.toFixed(1)} кВт на виході, а інвертор ${P} кВт. У режимі АКБ навантаження понад ~${Math.round((Pmax * 1000) / 230)} A вибиватиме BMS: реле струму, окрема лінія бойлера або домовленість з клієнтом.` });
  const chg = Math.min(vv <= 32 ? 30 : 50, Math.round(Ibat * 0.5));
  notes.push({ t: "", m: `Струм заряду від мережі — до ${chg} A; макс. струм заряду АКБ — до ${Math.round(Ibat * 0.5)} A (0,5C).` });
  if (s.earth === "tnc")
    notes.push({ t: "", m: "TN-C: ПЗІП не ставимо. 5-ту жилу не з'єднувати з PEN у щиті — резерв під TN-C-S; корпус інвертора й АКБ — на PE, якщо в щитовій є справжній PE від ВРП." });
  notes.push({ t: "", m: "Нулі: квартирна N-шина живиться тільки з виходу ПЗВ; міська — N вводу, реле, вхід I перемикача і живлення інвертора. Перемички між шинами немає. Перевірка: перемикач у «0» — між шинами обрив." });
  notes.push({ t: "", m: "Перемикач: продзвонити, що L і N одного джерела замикаються в одному положенні; підписати положення «Мережа» / «Інвертор»." });
  if (!s.batBreaker) notes.push({ t: "", m: "DC-автомат полярний: батарея на верхні клеми 1(+) / 3(−), інвертор — з нижніх 2 / 4." });
  if (+s.groupA >= 25) notes.push({ t: "", m: `Автомати груп C${s.groupA}: якщо проводка алюмінієва 2,5 мм², замінити на C16–C20.` });
  if (s.boiler) notes.push({ t: "", m: "Бойлер живиться до перемикача: при відключенні світла він не працює і не перевантажує АКБ." });
  notes.push({ t: "", m: "Монтаж інвертора і АКБ — тільки на негорючу стіну; зазор ~50 см зверху й знизу, ~20 см з боків." });

  let mat = 0;
  let wk = 0;
  items.forEach((it) => {
    it.c = it.c || cat(it.key);
    it.sum = it.c.price * it.qty;
    if (it.zone === "works") wk += it.sum;
    else mat += it.sum;
  });
  Object.assign(r, { mat, works: wk, total: mat + wk, Pmax, chg, Ibat, lim: Math.min(P, Pmax), kwh: (+s.batKwh || 0) * nB });
  return { items, notes, r };
}

/** Зведений список покупок (без робіт), однакові позиції об'єднані */
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

/** Перелік виконаних робіт для звіту (без цін) */
export function worksDone(s, r) {
  const w = ["Монтаж інвертора і АКБ на стіну"];
  if (!r.near) w.push("Збірка щитка біля інвертора");
  if (!s.batBreaker) w.push("DC-підключення АКБ через автомат постійного струму");
  w.push("Роботи в поверховому щиті: перемикач мережа / інвертор, ПЗВ, розділення нулів");
  w.push(`Прокладка траси — ${Math.max(1, +s.trace || 1)} м`);
  if (s.boiler) w.push("Окрема лінія бойлера");
  w.push("Пусконаладка, налаштування інвертора, інструктаж");
  return w;
}

export function clientText(s, calc, zones) {
  const r = calc.r;
  let i = 0;
  let t = `Кошторис — ${s.client || "об'єкт"}\nІнвертор: ${s.invModel} ${s.invKw} кВт · АКБ: ${s.batModel} × ${s.batN}\n\n`;
  Object.keys(zones).forEach((z) => {
    const rows = calc.items.filter((it) => it.zone === z);
    if (!rows.length) return;
    t += `${zones[z]}:\n`;
    rows.forEach((it) => {
      i++;
      t += `${i}. ${it.c.name}${it.c.model ? " (" + it.c.model + ")" : ""} — ${it.qty} ${it.c.unit} × ${fmt(it.c.price)} = ${fmt(it.sum)} грн\n`;
    });
    t += "\n";
  });
  t += `Матеріали: ${fmt(r.mat)} грн\nМонтаж: ${fmt(r.works)} грн${r.usd ? ` (${fmt(r.usd)} $)` : ""}\nРазом: ${fmt(r.total)} грн\n\nЦіни орієнтовні, без вартості інвертора та АКБ.`;
  return t;
}
