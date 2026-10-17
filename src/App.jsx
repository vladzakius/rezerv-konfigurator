import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CAT, EXAMPLE, ZONES } from "./catalog.js";
import { compute, clientText } from "./compute.js";
import { validateConfig } from "./validation.js";
import { buildSVG } from "./scheme.js";
import { makePdf } from "./report.js";
import { useRuntime, saveFile } from "./runtime.js";
import { copyText, load, save, slug } from "./utils.js";
import Form from "./components/Form.jsx";
import { SchemePanel, NotesPanel, EstimatePanel, ShoppingPanel } from "./components/Panels.jsx";
import ReportCard from "./components/ReportCard.jsx";
import Catalog from "./components/Catalog.jsx";
import Projects from "./components/Projects.jsx";

const normalize = (s) => {
  const n = { ...EXAMPLE, ...s, bought: s.bought || {} };
  if (!s.workCur) n.workCur = +s.workUsd ? "usd" : +s.workUah ? "uah" : "usd";
  return derive(n, {}, true);
};

/* Монтаж: поле у валюті workCur — введене, друге — еквівалент за курсом */
function derive(p, patch, keepExample) {
  const n = { ...p, ...patch };
  if (!keepExample) n.example = false;
  const rate = +n.rate || 0;
  if (n.workCur === "usd") n.workUah = n.workUsd === "" || !rate ? "" : Math.round(+n.workUsd * rate);
  else n.workUsd = n.workUah === "" || !rate ? "" : Math.round(+n.workUah / rate);
  return n;
}

const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json";

export default function App() {
  const [state, setState] = useState(() => normalize(load("rz_state") || {}));
  const [catOver, setCatOver] = useState(() => load("rz_cat") || {});
  const [photos, setPhotos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [catStatus, setCatStatus] = useState("");
  const [dbStatus, setDbStatus] = useState("");
  const { db, dl, ready, available } = useRuntime();
  const catDirty = useRef(false);
  const toastTimer = useRef(null);

  const cat = useCallback(
    (key) => {
      const d = DEFAULT_CAT[key] || { name: key, model: "", price: 0, unit: "шт", url: "" };
      return { model: "", url: "", ...d, ...(catOver[key] || {}) };
    },
    [catOver]
  );
  const calc = useMemo(() => compute(state, cat), [state, cat]);
  const validation = useMemo(() => validateConfig(state, calc), [state, calc]);
  const { svg, parts } = useMemo(() => buildSVG(state, calc, cat), [state, calc, cat]);

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2200);
  };
  const set = (k, v) => setState((p) => ({ ...p, [k]: v, example: false }));
  const num = (v) => (v === "" ? "" : +v);
  const setWork = (cur, v) => setState((p) => derive(p, cur === "usd" ? { workUsd: num(v), workCur: "usd" } : { workUah: num(v), workCur: "uah" }));
  const setRate = (v) => setState((p) => derive(p, { rate: num(v), rateDate: "" }));

  /* офіційний курс НБУ */
  const [rateBusy, setRateBusy] = useState(false);
  const [rateStatus, setRateStatus] = useState("");
  const refreshRate = useCallback(async () => {
    setRateBusy(true);
    setRateStatus("Отримую курс НБУ…");
    try {
      const res = await fetch(NBU_URL);
      const j = await res.json();
      const x = Array.isArray(j) ? j[0] : null;
      if (!x || !x.rate) throw new Error("rate");
      const rate = Math.round(x.rate * 100) / 100;
      setState((p) => derive(p, { rate, rateDate: x.exchangedate }, true));
      setRateStatus(`Офіційний курс НБУ на ${x.exchangedate}: ${String(rate).replace(".", ",")} грн`);
    } catch {
      setRateStatus("Не вдалося отримати курс НБУ — введи курс вручну.");
    }
    setRateBusy(false);
  }, []);
  useEffect(() => {
    refreshRate();
  }, [refreshRate]);

  useEffect(() => save("rz_state", state), [state]);
  useEffect(() => save("rz_cat", catOver), [catOver]);

  /* статус сховища */
  useEffect(() => {
    if (!available) setDbStatus("");
    else if (!ready) setDbStatus("Підключаю збереження…");
    else if (!db) setDbStatus("Хмарне сховище недоступне — використовується локальне збереження.");
    else setDbStatus("");
  }, [available, ready, db]);

  /* довідник зі сховища + підписка на об'єкти */
  useEffect(() => {
    if (!db) return;
    let unsub = null;
    (async () => {
      try {
        const snap = await db.doc("settings/catalog").get();
        if (snap.exists) {
          const v = snap.data();
          if (v && v.items) setCatOver({ ...v.items });
        }
      } catch {
        setCatStatus("Довідник зі сховища не завантажився — показано ціни з цього браузера.");
      }
    })();
    try {
      unsub = db
        .collection("projects")
        .orderBy("createdAt", "desc")
        .limit(30)
        .onSnapshot(
          (s) => setProjects(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => setDbStatus("Список об'єктів недоступний: " + (err?.code || "помилка"))
        );
    } catch {
      setDbStatus("Список об'єктів недоступний.");
    }
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [db]);

  /* збереження довідника в сховище з затримкою */
  useEffect(() => {
    if (!catDirty.current) return;
    catDirty.current = false;
    const t = setTimeout(async () => {
      if (!db) {
        setCatStatus("Збережено в цьому браузері.");
        return;
      }
      setCatStatus("Зберігаю…");
      try {
        await db.doc("settings/catalog").set({ items: catOver, updatedAt: Date.now() });
        setCatStatus("Збережено.");
      } catch (e) {
        setCatStatus("Не вдалося зберегти: " + (e?.code || "помилка") + ". Зміни лишились у цьому браузері.");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [catOver, db]);

  const changeCat = (k, f, v) => {
    catDirty.current = true;
    setCatOver((o) => ({ ...o, [k]: { ...(o[k] || {}), [f]: v } }));
  };
  const resetCat = () => {
    catDirty.current = true;
    setCatOver({});
    toast("Повернуто заводські ціни");
  };

  const copy = async (t) => toast((await copyText(t)) ? "Скопійовано — встав у месенджер" : "Не вдалося скопіювати");

  const downloadSvg = () => saveFile(dl, `Shema_${slug(state.client)}.svg`, new Blob([svg], { type: "image/svg+xml" }));
  const downloadCsv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [["№", "Зона", "Позиція", "Модель", "К-сть", "Од.", "Ціна", "Сума"]];
    calc.items.forEach((it, i) => rows.push([i + 1, ZONES[it.zone], it.c.name, it.c.model, it.qty, it.c.unit, it.c.price, it.sum]));
    rows.push(["", "", "Матеріали", "", "", "", "", calc.r.mat], ["", "", "Монтаж", "", "", "", "", calc.r.works], ["", "", "Разом", "", "", "", "", calc.r.total]);
    const csv = "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n");
    saveFile(dl, `Koshtorys_${slug(state.client)}.csv`, new Blob([csv], { type: "text/csv" }));
  };

  const makeReport = async () => {
    setPdfBusy(true);
    try {
      const { blob, pages } = await makePdf({ s: state, calc, cat, svg, parts, photos, zones: ZONES, onStatus: setPdfStatus });
      setPdfStatus("Зберігаю…");
      const ok = await saveFile(dl, `Zvit_${slug(state.client)}.pdf`, blob);
      setPdfStatus(ok ? `Готово: ${pages} стор.` : "Збереження скасовано");
    } catch {
      setPdfStatus("Не вдалося сформувати PDF — перевір інтернет і спробуй ще раз.");
    }
    setPdfBusy(false);
  };

  const saveProject = async () => {
    if (!db) return toast("Хмарне збереження недоступне");
    const inputs = { ...state };
    delete inputs.example;
    try {
      await db.collection("projects").add({ name: inputs.client || "Об'єкт " + new Date().toLocaleDateString("uk-UA"), inputs, total: calc.r.total, createdAt: Date.now() });
      toast("Об'єкт збережено");
    } catch (e) {
      toast("Не вдалося зберегти: " + (e?.code || "помилка"));
    }
  };
  const openProject = (p) => {
    setState(normalize({ ...p.inputs, example: false }));
    toast("Об'єкт відкрито");
  };
  const deleteProject = async (id) => {
    try {
      await db.doc("projects/" + id).delete();
      toast("Видалено");
    } catch {
      toast("Не вдалося видалити");
    }
  };

  const toggleBuy = (k, on) =>
    setState((p) => {
      const b = { ...(p.bought || {}) };
      if (on) b[k] = true;
      else delete b[k];
      return { ...p, bought: b };
    });
  const copyBuy = (L) =>
    copy(`Список покупок — ${state.client || "об'єкт"}\n\n` + L.map((x) => `${state.bought[x.key] ? "✅" : "⬜"} ${x.c.name}${x.c.model ? " (" + x.c.model + ")" : ""} — ${x.qty} ${x.c.unit}`).join("\n"));

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Конфігуратор резервного живлення</h1>
          <p className="lead">Введи параметри об'єкта — схема щита, кошторис, список покупок і фотозвіт збираються автоматично. Ціни орієнтовні, редагуються в довіднику внизу.</p>
        </div>
        <div className="actions">
          <button className="primary" type="button" onClick={() => copy(clientText(state, calc, ZONES))}>Копіювати для клієнта</button>
          <button type="button" onClick={downloadSvg}>Схема (SVG)</button>
          <button type="button" onClick={downloadCsv}>Кошторис (CSV)</button>
        </div>
      </header>

      <section className={`readiness ${validation.level}`} aria-live="polite">
        <div className="readiness-head">
          <strong>{validation.label}</strong>
          <span>{validation.errors.length ? `${validation.errors.length} обов'язкових полів` : validation.warnings.length ? `${validation.warnings.length} зауважень` : "Критичних зауважень немає"}</span>
        </div>
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <ul>
            {validation.errors.map((x) => <li key={`e-${x}`}>{x}</li>)}
            {validation.warnings.map((x) => <li key={`w-${x}`}>{x}</li>)}
          </ul>
        )}
      </section>

      <div className="grid">
        <Form s={state} set={set} setWork={setWork} setRate={setRate} onRateRefresh={refreshRate} rateBusy={rateBusy} rateStatus={rateStatus} calc={calc}>
          <Projects
            db={db}
            projects={projects}
            state={state}
            calc={calc}
            status={dbStatus}
            onSave={saveProject}
            onOpen={openProject}
            onDelete={deleteProject}
            onReset={() => setState(normalize({}))}
          />
        </Form>

        <main>
          <SchemePanel s={state} svg={svg} parts={parts} />
          <NotesPanel notes={calc.notes} />
          <EstimatePanel calc={calc} />
          <ShoppingPanel calc={calc} bought={state.bought} onToggle={toggleBuy} onReset={() => set("bought", {})} onCopy={copyBuy} />
          <ReportCard s={state} set={set} photos={photos} setPhotos={setPhotos} onPdf={makeReport} busy={pdfBusy} status={pdfStatus} setStatus={setPdfStatus} />
          <Catalog cat={cat} onChange={changeCat} onReset={resetCat} status={catStatus} />
        </main>
      </div>
      <div className={"toast" + (toastMsg ? " on" : "")} role="status" aria-live="polite">{toastMsg}</div>
    </div>
  );
}
