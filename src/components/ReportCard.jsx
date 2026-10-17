import { shrinkImage } from "../utils.js";

const CAPTIONS = [
  "Поверховий щит — до",
  "Поверховий щит — після",
  "Інвертор і АКБ на стіні",
  "Щиток біля інвертора",
  "DC-автомат АКБ",
  "Траса в кабель-каналі",
  "Налаштування інвертора",
  "Перевірка роботи від АКБ",
];

export default function ReportCard({ s, set, photos, setPhotos, onPdf, busy, status, setStatus }) {
  const v = (k) => ({ value: s[k] ?? "", onChange: (e) => set(k, e.target.value) });

  async function addFiles(e) {
    const files = [...e.target.files];
    e.target.value = "";
    setStatus("Обробляю фото…");
    let bad = 0;
    const added = [];
    for (const f of files) {
      const r = await shrinkImage(f);
      if (r) added.push({ id: Math.random().toString(36).slice(2), cap: "", ...r });
      else bad++;
    }
    setPhotos((p) => [...p, ...added]);
    setStatus(bad ? `${bad} фото не вдалося відкрити (формат не підтримується)` : "");
  }
  const setCap = (id, cap) => setPhotos((p) => p.map((x) => (x.id === id ? { ...x, cap } : x)));
  const remove = (id) => setPhotos((p) => p.filter((x) => x.id !== id));
  const up = (i) =>
    setPhotos((p) => {
      const n = [...p];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      return n;
    });

  return (
    <section className="card">
      <h2>Фотозвіт для замовника (PDF)</h2>
      <p className="hint">Обладнання, схема, виконані роботи, кошторис і фото. Фото не зберігаються після закриття сторінки — додавай перед формуванням.</p>
      <div className="row3">
        <label className="f">Виконавець<input type="text" {...v("executor")} /></label>
        <label className="f">Телефон<input type="tel" {...v("phone")} /></label>
        <label className="f">Дата робіт<input type="date" {...v("rpDate")} /></label>
      </div>
      <label className="ck" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={!!s.rpPrices} onChange={(e) => set("rpPrices", e.target.checked)} />
        Додати кошторис з цінами
      </label>
      {photos.length > 0 && (
        <div className="phgrid">
          {photos.map((p, i) => (
            <div className="ph" key={p.id}>
              <img src={p.src} alt={p.cap || `Фото ${i + 1}`} />
              <input type="text" list="capList" value={p.cap} placeholder={`Підпис до фото ${i + 1}`} onChange={(e) => setCap(p.id, e.target.value)} />
              <div className="ph-act">
                <button type="button" aria-label="Перемістити вище" disabled={i === 0} onClick={() => up(i)}>↑</button>
                <button type="button" aria-label="Видалити фото" onClick={() => remove(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <datalist id="capList">
        {CAPTIONS.map((c) => <option key={c} value={c} />)}
      </datalist>
      <div className="pdf-row">
        <label className="btn">
          + Додати фото
          <input type="file" accept="image/*" multiple className="vh" onChange={addFiles} />
        </label>
        <button type="button" className="primary" onClick={onPdf} disabled={busy}>Сформувати PDF</button>
        <span className="status">{status}</span>
      </div>
    </section>
  );
}
