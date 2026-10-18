import { useEffect } from "react";
import { TYPE_HINT } from "../catalog.js";
import { equipmentLabel } from "../equipment.js";
import { fmt } from "../utils.js";

function F({ label, children }) {
  return <label className="f">{label}{children}</label>;
}

export default function Form({ s, set, setPatch, equipment, setWork, setRate, onRateRefresh, rateBusy, rateStatus, calc, children }) {
  const v = (k, num) => ({
    value: s[k] ?? "",
    onChange: (e) => set(k, num ? (e.target.value === "" ? "" : +e.target.value) : e.target.value),
  });
  const c = (k) => ({ checked: !!s[k], onChange: (e) => set(k, e.target.checked) });
  const r = calc.r;
  const trace = Math.max(1, +s.trace || 1);
  const autoLayout = trace <= 3 ? "near" : "far";

  useEffect(() => {
    if (s.layout !== autoLayout) set("layout", autoLayout);
  }, [s.trace, s.layout]);

  const setTrace = (raw) => {
    const n = raw === "" ? "" : Math.max(1, Math.min(200, +raw || 1));
    set("trace", n);
    if (n !== "") set("layout", +n <= 3 ? "near" : "far");
  };

  const placement = trace <= 3
    ? { cls: "near", title: "Поруч із щитом", text: "Коротка траса; компактне розміщення." }
    : trace <= 15
      ? { cls: "far", title: "Коротка рознесена траса", text: "Окрема зона біля інвертора; у кошторис додається запас кабелю." }
      : trace <= 30
        ? { cls: "check", title: "Середня траса", text: "Потрібна перевірка перерізу та способу прокладання." }
        : trace <= 50
          ? { cls: "check", title: "Довга траса", text: "Переріз і захист не вважаються підтвердженими без окремого розрахунку." }
          : { cls: "check", title: "Дуже довга траса", text: "Для 50+ м конфігуратор додає запас матеріалу, але не підтверджує проєктний переріз." };

  const chooseInverter = (id) => {
    if (!id) return setPatch({ invCatalogId: "" });
    const x = equipment.inverters.find((i) => i.id === id);
    if (!x) return;
    setPatch({
      invCatalogId: id,
      invModel: equipmentLabel(x),
      invKw: String(x.powerKw || ""),
      invType: x.type || "offgrid",
      invPhases: String(x.phases || 1),
      invBatteryClass: x.batteryClass || "unknown",
    });
  };

  const chooseBattery = (id) => {
    if (!id) return setPatch({ batCatalogId: "" });
    const x = equipment.batteries.find((i) => i.id === id);
    if (!x) return;
    setPatch({
      batCatalogId: id,
      batModel: equipmentLabel(x),
      batKwh: x.capacityKwh || "",
      batI: x.dischargeA || "",
      batV: x.nominalVoltageV || "",
      batVoltageClass: x.voltageClass || "unknown",
      batBreaker: !!x.breaker,
    });
  };

  const phaseText = +s.gridPhases === 3 && +s.invPhases === 1
    ? `3ф мережа → 1ф резерв (${s.backupPhase || "L1"})`
    : `${+s.gridPhases === 3 ? "3ф" : "1ф"} мережа → ${+s.invPhases === 3 ? "3ф" : "1ф"} інвертор`;

  const classesKnown = s.invBatteryClass && s.invBatteryClass !== "unknown" && s.batVoltageClass && s.batVoltageClass !== "unknown";
  const classMatch = classesKnown && s.invBatteryClass === s.batVoltageClass;

  return (
    <aside className="form" aria-label="Вхідні дані">
      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Об'єкт</legend>
          <F label="Клієнт / адреса"><input type="text" {...v("client")} /></F>
        </fieldset>

        <fieldset>
          <legend>Інвертор і АКБ</legend>
          <F label="Інвертор з каталогу">
            <select value={s.invCatalogId || ""} onChange={(e) => chooseInverter(e.target.value)}>
              <option value="">Вручну</option>
              {equipment.inverters.map((x) => <option key={x.id} value={x.id}>{equipmentLabel(x)}</option>)}
            </select>
          </F>
          <F label="Модель інвертора"><input type="text" {...v("invModel")} onChange={(e) => setPatch({ invCatalogId: "", invModel: e.target.value })} /></F>
          <div className="row3">
            <F label="Потужність, кВт"><select {...v("invKw")}>{["1.5", "3", "3.6", "5", "6", "8", "10", "12", "15", "20"].map((x) => <option key={x}>{x}</option>)}</select></F>
            <F label="Тип інвертора"><select {...v("invType")}><option value="offgrid">Автономний</option><option value="hybrid">Гібридний</option></select></F>
            <F label="Фаз інвертора"><select {...v("invPhases")}><option value="1">1 фаза</option><option value="3">3 фази</option></select></F>
          </div>
          <F label="Клас АКБ інвертора">
            <select {...v("invBatteryClass")}>
              <option value="unknown">Не вказано</option>
              <option value="lv48">Низьковольтна ~48–51 В</option>
              <option value="hv">Високовольтна (HV)</option>
            </select>
          </F>
          <p className="field-hint">{TYPE_HINT[s.invType]}</p>

          <F label="АКБ з каталогу">
            <select value={s.batCatalogId || ""} onChange={(e) => chooseBattery(e.target.value)}>
              <option value="">Вручну</option>
              {equipment.batteries.map((x) => <option key={x.id} value={x.id}>{equipmentLabel(x)}</option>)}
            </select>
          </F>
          <F label="Модель АКБ"><input type="text" {...v("batModel")} onChange={(e) => setPatch({ batCatalogId: "", batModel: e.target.value })} /></F>
          <div className="row3">
            <F label="Кількість АКБ"><input type="number" min="1" max="16" step="1" {...v("batN", true)} /></F>
            <F label="Розряд 1 АКБ, A"><input type="number" min="1" max="500" step="5" {...v("batI", true)} /></F>
            <F label="Номінальна напруга 1 АКБ, В"><input type="number" min="1" max="1000" step="0.1" {...v("batV", true)} /></F>
          </div>
          <div className="row">
            <F label="Ємність 1 АКБ, кВт·год"><input type="number" min="0.1" max="100" step="0.01" {...v("batKwh", true)} /></F>
            <F label="Клас напруги АКБ">
              <select {...v("batVoltageClass")}>
                <option value="unknown">Не вказано</option>
                <option value="lv48">Низьковольтна ~48–51 В</option>
                <option value="hv">Високовольтна (HV)</option>
              </select>
            </F>
          </div>
          <label className="ck"><input type="checkbox" {...c("batBreaker")} />Вбудований DC-захист</label>
          {classesKnown && <div className={`compat-note ${classMatch ? "ok" : "bad"}`}>{classMatch ? "Класи напруги інвертора й АКБ збігаються." : "Класи напруги інвертора й АКБ не збігаються — перевір сумісність обладнання."}</div>}
        </fieldset>

        <fieldset>
          <legend>Мережа і щит</legend>
          <div className="row3">
            <F label="Мережа"><select {...v("gridPhases")}><option value="1">1 фаза · 230 В</option><option value="3">3 фази · 400/230 В</option></select></F>
            <F label="Ввідний автомат, A"><select {...v("vvod")}>{["16", "20", "25", "32", "40", "50", "63"].map((x) => <option key={x}>{x}</option>)}</select></F>
            <F label="Заземлення"><select {...v("earth")}><option value="tnc">TN-C</option><option value="tncs">TN-C-S / TN-S</option></select></F>
          </div>
          {+s.gridPhases === 3 && +s.invPhases === 1 && <F label="Фаза резерву"><select {...v("backupPhase")}><option>L1</option><option>L2</option><option>L3</option></select></F>}
          <div className="system-summary"><strong>{phaseText}</strong><span>{+s.invPhases === 3 ? "3-ф схема і номінали захисту потребують окремої перевірки." : "1-ф логіка кошторису активна."}</span></div>
          <F label="Реле напруги"><select {...v("relay")}><option value="have">Вже є</option><option value="add">Додати нове</option><option value="none">Без окремого реле</option></select></F>
          <label className="ck"><input type="checkbox" {...c("newBox")} />Потрібен новий бокс у щитовій</label>
        </fieldset>

        <fieldset>
          <legend>Розташування і траса</legend>
          <div className="trace-head">
            <F label="Відстань від щита до інвертора, м"><input type="number" min="1" max="200" step="1" value={s.trace ?? ""} onChange={(e) => setTrace(e.target.value)} /></F>
            <div className={"placement-pill " + placement.cls}>{trace <= 3 ? "до 3 м" : trace <= 15 ? "4–15 м" : trace <= 30 ? "16–30 м" : trace <= 50 ? "31–50 м" : trace <= 100 ? "51–100 м" : "100+ м"}</div>
          </div>
          <div className="trace-slider">
            <input type="range" min="1" max="100" step="1" value={Math.min(trace, 100)} aria-label="Відстань від щита до інвертора" onChange={(e) => setTrace(e.target.value)} />
            <div className="trace-marks"><span>1</span><span>15</span><span>30</span><span>50</span><span>80</span><span>100 м</span></div>
          </div>
          <F label="Спосіб прокладання траси">
            <select {...v("routeMethod")}><option value="duct">Кабель-канал / гофра</option><option value="existing">Існуюча труба / стояк</option><option value="open">Відкрита траса</option><option value="other">Інше / визначити на об'єкті</option></select>
          </F>
          <div className={"placement-note " + placement.cls}><strong>{placement.title}</strong><span>{placement.text}</span></div>
          {trace > 100 && <p className="status" style={{ margin: 0 }}>Для 100–200 м введи точне значення у полі — повзунок обмежений 100 м.</p>}
        </fieldset>

        <fieldset>
          <legend>Резервні навантаження</legend>
          <F label="Сценарій резерву"><select {...v("reserveMode")}><option value="groups">Вибрані групи</option><option value="section">Вся резервна секція щита</option></select></F>
          <div className="row">
            <F label="Груп у резерві"><input type="number" min="1" max="40" step="1" {...v("groups", true)} /></F>
            <F label="Номінал груп, A"><select {...v("groupA")}>{["10", "16", "20", "25", "32"].map((x) => <option key={x}>{x}</option>)}</select></F>
          </div>
          <label className="ck"><input type="checkbox" {...c("boiler")} />Окрема лінія бойлера (поза резервом)</label>
          {s.boiler && <div className="row"><F label="Бойлер, кВт"><input type="number" min="0.5" max="6" step="0.5" {...v("boilerKw", true)} /></F><F label="Кабель, м"><input type="number" min="1" max="100" step="1" {...v("boilerLen", true)} /></F></div>}
        </fieldset>

        <fieldset>
          <legend>Додатково</legend>
          <label className="ck"><input type="checkbox" {...c("irelay")} />Реле обмеження струму на виході</label>
          <label className="ck"><input type="checkbox" {...c("meter")} />Wi-Fi лічильник резервної частини</label>
        </fieldset>

        <fieldset>
          <legend>Вартість монтажу</legend>
          <div className="row">
            <F label={`Монтаж, $${s.workCur === "uah" ? " · еквівалент" : ""}`}><input type="number" min="0" step="10" placeholder="300–400" className={s.workCur === "uah" ? "derived" : ""} value={s.workUsd ?? ""} onChange={(e) => setWork("usd", e.target.value)} /></F>
            <F label={`Монтаж, грн${s.workCur === "usd" ? " · еквівалент" : ""}`}><input type="number" min="0" step="100" className={s.workCur === "usd" ? "derived" : ""} value={s.workUah ?? ""} onChange={(e) => setWork("uah", e.target.value)} /></F>
          </div>
          <div className="rate-row"><F label="Курс $, грн"><input type="number" min="0" step="0.0001" value={s.rate ?? ""} onChange={(e) => setRate(e.target.value)} /></F><button type="button" onClick={onRateRefresh} disabled={rateBusy}>Курс НБУ</button></div>
          <p className="status" style={{ margin: 0 }}>{rateStatus}</p>
          <div className="wk-sum"><span>Монтаж</span><span>{r.wLabel || "—"}{r.wCur === "usd" && r.wAmt ? ` ≈ ${fmt(r.works)} грн` : ""}</span></div>
          <p className="status" style={{ margin: 0 }}>Вводь в одному полі — друге покаже еквівалент. У звіт і текст для клієнта йде та валюта, яку ти ввів.</p>
        </fieldset>

        {children}
      </form>
    </aside>
  );
}
