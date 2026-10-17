import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CAT, EXAMPLE, ZONES } from "./catalog.js";
import { compute, clientText } from "./compute.js";
import { buildSVG } from "./scheme.js";
import { makePdf } from "./report.js";
import { useRuntime, saveFile } from "./runtime.js";
import { copyText, load, save, slug } from "./utils.js";
import Form from "./components/Form.jsx";
import { SchemePanel, NotesPanel, EstimatePanel, ShoppingPanel } from "./components/Panels.jsx";
import ReportCard from "./components/ReportCard.jsx";
import Catalog from "./components/Catalog.jsx";
import Projects from "./components/Projects.jsx";

const normalize = (s) => ({ ...EXAMPLE, ...s, bought: s.bought || {} });

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
  const { svg, parts } = useMemo(() => buildSVG(state, calc, cat), [state, calc, cat]);

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2200);
  };
  const set = (k, v) => setState((p) => ({ ...p, [k]: v, example: false }));

  useEffect(() => save("rz_state", state), [state]);
  useEffect(() => save("rz_cat", catOver), [catOver]);

  /* статус сховища */
  useEffect(() => {
    if (!available) setDbStatus("Збереження об'єктів доступне у перегляді на claude.ai. Ціни зберігаються в цьому браузері.");
    else if (!ready) setDbStatus("Підключаю збереження…");
    else if (!db) setDbStatus("Сховище недоступне — ціни і чернетка лишаються в цьому браузері.");
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
    if (!db) return toast("Збереження об'єктів недоступне в цьому перегляді");
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

      <div className="grid">
        <Form s={state} set={set} calc={calc}>
          <Projects
            db={db}
            projects={projects}
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
