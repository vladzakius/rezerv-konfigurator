import { DEFAULT_CAT } from "../catalog.js";

export default function Catalog({ cat, onChange, onReset, status }) {
  return (
    <section className="card">
      <details className="cat">
        <summary>Довідник цін і моделей</summary>
        <p className="hint" style={{ marginTop: 8 }}>
          Зміни зберігаються автоматично і застосовуються до всіх кошторисів. Бренд у моделі визначає вигляд апарата на схемі. {status}
        </p>
        <div className="catwrap">
          <div>
            <div className="cat-row cat-head"><div>Позиція</div><div>Модель</div><div>Ціна, грн</div><div>Од.</div><div>Посилання</div></div>
            {Object.keys(DEFAULT_CAT).map((k) => {
              const c = cat(k);
              return (
                <div className="cat-row" key={k}>
                  <div>{c.name}</div>
                  <input type="text" aria-label={`Модель: ${c.name}`} value={c.model} onChange={(e) => onChange(k, "model", e.target.value)} />
                  <input type="number" min="0" step="1" aria-label={`Ціна: ${c.name}`} value={c.price} onChange={(e) => onChange(k, "price", +e.target.value || 0)} />
                  <div>{c.unit}</div>
                  <input type="text" aria-label={`Посилання: ${c.name}`} value={c.url} onChange={(e) => onChange(k, "url", e.target.value)} />
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={onReset}>Повернути заводські ціни</button>
        </div>
      </details>
    </section>
  );
}
