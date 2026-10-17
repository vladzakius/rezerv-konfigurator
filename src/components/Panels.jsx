import { ZONES } from "../catalog.js";
import { buyList } from "../compute.js";
import { fmt } from "../utils.js";

export function SchemePanel({ s, svg, parts }) {
  return (
    <section className="card">
      <h2>
        {s.client || "Схема підключення"}
        {s.example && <span className="badge-ex">приклад</span>}
      </h2>
      <p className="hint">Апарати намальовані у стилі моделей з довідника (Schneider, Hager, Tomzn, ZUBR). Номери — позиції у переліку під схемою.</p>
      <div className="sheet" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="legend">
        <span><i style={{ background: "#d1302f" }} />L фаза</span>
        <span><i style={{ background: "#1f6fd1" }} />N нуль</span>
        <span><i style={{ background: "repeating-linear-gradient(90deg,#d8b21c 0 6px,#2f8f46 6px 12px)" }} />PE</span>
        <span><i style={{ background: "#d1302f", height: 6 }} />DC +</span>
        <span><i style={{ background: "#222", height: 6 }} />DC −</span>
        <span><i style={{ background: "transparent", border: "1.5px dashed #8d98a3", height: 10 }} />кабель траси</span>
      </div>
      <ol className="parts">
        {parts.map((p, i) => <li key={i}>{p}</li>)}
      </ol>
    </section>
  );
}

export function NotesPanel({ notes }) {
  return (
    <section className="card">
      <h2>Що врахувати</h2>
      <p className="hint">Підказки для монтажника формуються з введених параметрів. У звіт для замовника не потрапляють.</p>
      <ul className="notes">
        {notes.map((n, i) => <li key={i} className={n.t}>{n.m}</li>)}
      </ul>
    </section>
  );
}

export function EstimatePanel({ calc }) {
  const r = calc.r;
  let i = 0;
  return (
    <section className="card">
      <h2>Кошторис</h2>
      <p className="hint">Без вартості інвертора та АКБ. Ціни орієнтовні — перед закупівлею уточнити.</p>
      <div className="tbl">
        <table>
          <thead>
            <tr><th>№</th><th>Позиція</th><th className="n">К-сть</th><th className="n">Ціна</th><th className="n">Сума, грн</th></tr>
          </thead>
          <tbody>
            {Object.keys(ZONES).map((z) => {
              const rows = calc.items.filter((it) => it.zone === z);
              if (!rows.length) return null;
              return [
                <tr className="zone" key={z}>
                  <td colSpan={4}>{ZONES[z]}</td>
                  <td className="n">{fmt(rows.reduce((a, b) => a + b.sum, 0))}</td>
                </tr>,
                ...rows.map((it) => {
                  i++;
                  const c = it.c;
                  const sub = [c.model, it.note].filter(Boolean);
                  return (
                    <tr key={z + it.key + i}>
                      <td>{i}</td>
                      <td>
                        {c.name}
                        {sub.length > 0 && (
                          <small>
                            {c.model && (c.url ? <a href={c.url} target="_blank" rel="noopener">{c.model}</a> : c.model)}
                            {c.model && it.note ? " · " : ""}
                            {it.note}
                          </small>
                        )}
                      </td>
                      <td className="n">{it.qty} {c.unit}</td>
                      <td className="n">{fmt(c.price)}</td>
                      <td className="n">{fmt(it.sum)}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="totals">
        <div className="tot"><span>Матеріали</span><b>{fmt(r.mat)} грн</b></div>
        <div className="tot">
          <span>Монтаж{r.wCur === "usd" && r.wAmt ? ` · ≈ ${fmt(r.works)} грн` : ""}</span>
          <b>{r.wLabel || "0 грн"}</b>
        </div>
        <div className="tot main">
          <span>Разом{r.wCur === "usd" && r.wAmt ? ` · ≈ ${fmt(r.total)} грн` : ""}</span>
          <b>{r.totalLabel}</b>
        </div>
      </div>
    </section>
  );
}

export function ShoppingPanel({ calc, bought, onToggle, onReset, onCopy }) {
  const L = buyList(calc);
  const done = L.filter((x) => bought[x.key]).length;
  const rest = L.filter((x) => !bought[x.key]).reduce((a, x) => a + x.sum, 0);
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Список покупок</h2>
          <p className="hint">Однакові позиції зведені. Відмічай куплене — позначки зберігаються разом з об'єктом.</p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => onCopy(L)}>Копіювати список</button>
          <button type="button" onClick={onReset}>Зняти позначки</button>
        </div>
      </div>
      <div className="buy-sum">Куплено {done} з {L.length} · лишилось купити на {fmt(rest)} грн</div>
      <div className="buy-bar"><i style={{ width: `${L.length ? (done / L.length) * 100 : 0}%` }} /></div>
      {L.map((x) => (
        <label key={x.key} className={"buy" + (bought[x.key] ? " done" : "")}>
          <input type="checkbox" checked={!!bought[x.key]} onChange={(e) => onToggle(x.key, e.target.checked)} />
          <div className="buy-name">
            {x.c.name}
            {x.c.model && <small>{x.c.model}</small>}
          </div>
          <div className="q">
            {x.qty} {x.c.unit}
            <small>{fmt(x.sum)} грн</small>
          </div>
        </label>
      ))}
    </section>
  );
}
