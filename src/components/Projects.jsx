import { useState } from "react";
import { fmt } from "../utils.js";

export default function Projects({ db, projects, onSave, onOpen, onDelete, onReset, status }) {
  const [armed, setArmed] = useState(null);
  return (
    <>
      <div className="row">
        <button type="button" onClick={onSave} disabled={!db}>Зберегти об'єкт</button>
        <button type="button" onClick={onReset}>Скинути</button>
      </div>
      <p className="status">{status}</p>
      {db && (
        <div className="proj">
          {projects.length === 0 && <p className="status">Збережених об'єктів поки немає. Заповни форму і натисни «Зберегти об'єкт».</p>}
          {projects.map((p) => (
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
                      onDelete(p.id);
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
      )}
    </>
  );
}
