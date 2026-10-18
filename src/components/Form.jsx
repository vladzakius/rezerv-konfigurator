import { useEffect } from "react";
import { TYPE_HINT } from "../catalog.js";
import { fmt } from "../utils.js";

function F({ label, children }) {
  return (
    <label className="f">
      {label}
      {children}
    </label>
  );
}

export default function Form({ s, set, setWork, setRate, onRateRefresh, rateBusy, rateStatus, calc, children }) {
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
    const n = raw === "" ? "" : Math.max(1, Math.min(80, +raw || 1));
    set("trace", n);
    if (n !== "") set("layout", +n <= 3 ? "near" : "far");
  };

  const placement = trace <= 3
    ? { cls: "near", title: "Поруч із щитом", text: "До 3 м — конфігуратор автоматично використовує компактний варіант розміщення." }
    : trace <= 10
      ? { cls: "far", title: "Рознесене розміщення", text: "Понад 3 м — конфігуратор автоматично додає окрему зону біля інвертора." }
      : { cls: "check", title: "Довга траса — перевірити проєкт", text: "Понад 10 м варто окремо перевірити трасу та параметри кабелю перед монтажем." };

  return (
    <aside className="form" aria-label="Вхідні дані">
      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Об'єкт</legend>
          <F label="Клієнт / адреса"><input type="text" {...v("client")} /></F>
        </fieldset>

        <fieldset>
          <legend>Інвертор і АКБ</legend>
          <F label="Модель інвертора"><input type="text" {...v("invModel")} /></F>
          <div className="row">
            <F label="Потужність, кВт">
              <select {...v("invKw")}>
                {["1.5", "3", "3.6", "5", "6", "8", "10", "12"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </F>
            <F label="Тип інвертора">
              <select {...v("invType")}>
                <option value="offgrid">Автономний (off-grid)</option>
                <option value="hybrid">Гібридний</option>
              </select>
            </F>
          </div>
          <p className="field-hint">{TYPE_HINT[s.invType]}</p>
          <F label="Модель АКБ"><input type="text" {...v("batModel")} /></F>
          <div className="row">
            <F label="Кількість АКБ"><input type="number" min="1" max="8" step="1" {...v("batN", true)} /></F>
            <F label="Розряд 1 АКБ, A"><input type="number" min="20" max="300" step="5" {...v("batI", true)} /></F>
          </div>
          <div className="row">
            <F label="Ємність 1 АКБ, кВт·год"><input type="number" min="1" max="20" step="0.01" {...v("batKwh", true)} /></F>
            <label className="ck" style={{ alignSelf: "end" }}><input type="checkbox" {...c("batBreaker")} />Вбудований DC-автомат</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Мережа і щит</legend>
          <div className="row">
            <F label="Ввідний автомат, A">
              <select {...v("vvod")}>
                {["16", "20", "25", "32", "40", "50", "63"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </F>
            <F label="Заземлення">
              <select {...v("earth")}>
                <option value="tnc">TN-C (старий будинок)</option>
                <option value="tncs">TN-C-S / TN-S</option>
              </select>
            </F>
          </div>
          <F label="Реле напруги">
            <select {...v("relay")}>
              <option value="have">Вже є</option>
              <option value="add">Додати нове</option>
              <option value="none">Без реле</option>
            </select>
          </F>
          <label className="ck"><input type="checkbox" {...c("newBox")} />Потрібен новий бокс у щитовій</label>
        </fieldset>

        <fieldset>
          <legend>Розташування і траса</legend>
          <div className="trace-head">
            <F label="Відстань від щита до інвертора, м">
              <input type="number" min="1" max="80" step="1" value={s.trace ?? ""} onChange={(e) => setTrace(e.target.value)} />
            </F>
            <div className={"placement-pill " + placement.cls}>{trace <= 3 ? "до 3 м" : trace <= 10 ? "3–10 м" : "10+ м"}</div>
          </div>
          <div className="trace-slider">
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={Math.min(trace, 30)}
              aria-label="Відстань від щита до інвертора"
              onChange={(e) => setTrace(e.target.value)}
            />
            <div className="trace-marks"><span>1 м</span><span>3 м</span><span>10 м</span><span>30 м</span></div>
          </div>
          <div className={"placement-note " + placement.cls}>
            <strong>{placement.title}</strong>
            <span>{placement.text}</span>
          </div>
          {trace > 30 && <p className="status" style={{ margin: 0 }}>Для 31–80 м введи точне значення у полі вище — повзунок показує перші 30 м.</p>}
        </fieldset>

        <fieldset>
          <legend>Групи квартири</legend>
          <div className="row">
            <F label="Груп у резерві"><input type="number" min="1" max="20" step="1" {...v("groups", true)} /></F>
            <F label="Номінал груп, A">
              <select {...v("groupA")}>
                {["10", "16", "20", "25", "32"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </F>
          </div>
          <label className="ck"><input type="checkbox" {...c("boiler")} />Окрема лінія бойлера (поза резервом)</label>
          {s.boiler && (
            <div className="row">
              <F label="Бойлер, кВт"><input type="number" min="0.5" max="6" step="0.5" {...v("boilerKw", true)} /></F>
              <F label="Кабель, м"><input type="number" min="1" max="60" step="1" {...v("boilerLen", true)} /></F>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Додатково</legend>
          <label className="ck"><input type="checkbox" {...c("irelay")} />Реле обмеження струму на виході</label>
          <label className="ck"><input type="checkbox" {...c("meter")} />Wi-Fi лічильник резервної частини</label>
        </fieldset>

        <fieldset>
          <legend>Вартість монтажу</legend>
          <div className="row">
            <F label={`Монтаж, $${s.workCur === "uah" ? " · еквівалент" : ""}`}>
              <input type="number" min="0" step="10" placeholder="300–400" className={s.workCur === "uah" ? "derived" : ""}
                value={s.workUsd ?? ""} onChange={(e) => setWork("usd", e.target.value)} />
            </F>
            <F label={`Монтаж, грн${s.workCur === "usd" ? " · еквівалент" : ""}`}>
              <input type="number" min="0" step="100" className={s.workCur === "usd" ? "derived" : ""}
                value={s.workUah ?? ""} onChange={(e) => setWork("uah", e.target.value)} />
            </F>
          </div>
          <div className="rate-row">
            <F label="Курс $, грн"><input type="number" min="0" step="0.0001" value={s.rate ?? ""} onChange={(e) => setRate(e.target.value)} /></F>
            <button type="button" onClick={onRateRefresh} disabled={rateBusy}>Курс НБУ</button>
          </div>
          <p className="status" style={{ margin: 0 }}>{rateStatus}</p>
          <div className="wk-sum">
            <span>Монтаж</span>
            <span>{r.wLabel || "—"}{r.wCur === "usd" && r.wAmt ? ` ≈ ${fmt(r.works)} грн` : ""}</span>
          </div>
          <p className="status" style={{ margin: 0 }}>Вводь в одному полі — друге покаже еквівалент. У звіт і текст для клієнта йде та валюта, яку ти ввів.</p>
        </fieldset>

        {children}
      </form>
    </aside>
  );
}
