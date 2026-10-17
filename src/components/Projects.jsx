import { useEffect, useState } from "react";
import { DEFAULT_CAT, EXAMPLE } from "../catalog.js";
import { compute } from "../compute.js";
import { fmt, load, save } from "../utils.js";

const LOCAL_KEY = "rz_projects";

const makeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
};

export default function Projects({ db, projects, onSave, onOpen, onDelete, onReset, status }) {
  const [armed, setArmed] = useState(null);
  const [localProjects, setLocalProjects] = useState(() => {
    const v = load(LOCAL_KEY);
    return Array.isArray(v) ? v : [];
  });

  useEffect(() => {
    if (!db) save(LOCAL_KEY, localProjects);
  }, [db, localProjects]);

  const list = db ? projects : localProjects;
  const storageStatus = db
    ? status
    : "Об'єкти зберігаються локально в цьому браузері. Фото до архіву не входять.";

  const saveLocal = () => {
    const inputs = { ...EXAMPLE, ...(load("rz_state") || {}) };
    delete inputs.example;
    const catOver = load("rz_cat") || {};
    const cat = (key) => ({ ...(DEFAULT_CAT[key] || { name: key, model: "", price: 0, unit: "шт", url: "" }), ...(catOver[key] || {}) });
    const total = compute(inputs, cat).r.total;
    const item = {
      id: makeId(),
      name: inputs.client || `Об'єкт ${new Date().toLocaleDateString("uk-UA")}`,
      inputs,
      total,
      createdAt: Date.now(),
    };
    setLocalProjects((p) => [item, ...p].slice(0, 50));
  };

  const saveCurrent = () => {
    if (db) onSave();
    else saveLocal();
  };

  const deleteCurrent = (id) => {
    if (db) onDelete(id);
    else setLocalProjects((p) => p.filter((x) => x.id !== id));
  };

  return (
    <>
      <div className="row">
        <button type="button" onClick={saveCurrent}>Зберегти об'єкт</button>
        <button type="button" onClick={onReset}>Скинути</button>
      </div>
      <p className="status">{storageStatus}</p>
      <div className="proj">
        {list.length === 0 && <p className="status">Збережених об'єктів поки немає. Заповни форму і натисни «Зберегти об'єкт».</p>}
        {list.map((p) => (
          <div className="proj-item" key={p.id}>
            <div title={p.name}>
              {p.name} <span className="status">· {new Date(p.createdAt || 0).toLocaleDateString("uk-UA")} · {fmt(p.total)} грн</span>
            </div>
            <span>
              <button type="button" onClick={() => onOpen(p)}>Відкрити</button>{" "}
              <button
                type="button"
                aria-label="Видалити"
                onClick={() => {
                  if (armed === p.id) {
                    setArmed(null);
                    deleteCurrent(p.id);
                  } else {
                    setArmed(p.id);
                    setTimeout(() => setArmed((a) => (a === p.id ? null : a)), 3000);
                  }
                }}
              >
                {armed === p.id ? "Точно?" : "✕"}
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
