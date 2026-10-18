import { equipmentLabel } from "../equipment.js";

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function Field({ label, children }) {
  return <label className="f">{label}{children}</label>;
}

function InverterCard({ item, onChange, onDelete }) {
  return (
    <div className="eq-card">
      <div className="eq-card-head"><strong>{equipmentLabel(item)}</strong><button type="button" onClick={onDelete}>Видалити</button></div>
      <div className="row">
        <Field label="Бренд"><input value={item.brand || ""} onChange={(e) => onChange("brand", e.target.value)} /></Field>
        <Field label="Модель"><input value={item.model || ""} onChange={(e) => onChange("model", e.target.value)} /></Field>
      </div>
      <div className="row3">
        <Field label="Тип"><select value={item.type || "offgrid"} onChange={(e) => onChange("type", e.target.value)}><option value="offgrid">Автономний</option><option value="hybrid">Гібридний</option></select></Field>
        <Field label="Фаз"><select value={String(item.phases || 1)} onChange={(e) => onChange("phases", +e.target.value)}><option value="1">1</option><option value="3">3</option></select></Field>
        <Field label="Потужність, кВт"><input type="number" min="0.5" step="0.1" value={item.powerKw ?? ""} onChange={(e) => onChange("powerKw", +e.target.value || 0)} /></Field>
      </div>
      <Field label="Клас АКБ">
        <select value={item.batteryClass || "unknown"} onChange={(e) => onChange("batteryClass", e.target.value)}>
          <option value="lv48">Низьковольтна ~48–51 В</option>
          <option value="hv">Високовольтна (HV)</option>
          <option value="unknown">Не вказано</option>
        </select>
      </Field>
      <Field label="Примітка"><input value={item.note || ""} onChange={(e) => onChange("note", e.target.value)} /></Field>
    </div>
  );
}

function BatteryCard({ item, onChange, onDelete }) {
  return (
    <div className="eq-card">
      <div className="eq-card-head"><strong>{equipmentLabel(item)}</strong><button type="button" onClick={onDelete}>Видалити</button></div>
      <div className="row">
        <Field label="Бренд"><input value={item.brand || ""} onChange={(e) => onChange("brand", e.target.value)} /></Field>
        <Field label="Модель"><input value={item.model || ""} onChange={(e) => onChange("model", e.target.value)} /></Field>
      </div>
      <div className="row3">
        <Field label="Ємність, кВт·год"><input type="number" min="0.1" step="0.01" value={item.capacityKwh ?? ""} onChange={(e) => onChange("capacityKwh", +e.target.value || 0)} /></Field>
        <Field label="Розряд, A"><input type="number" min="1" step="1" value={item.dischargeA ?? ""} onChange={(e) => onChange("dischargeA", +e.target.value || 0)} /></Field>
        <Field label="Номінальна напруга, В"><input type="number" min="1" step="0.1" value={item.nominalVoltageV ?? ""} onChange={(e) => onChange("nominalVoltageV", +e.target.value || 0)} /></Field>
      </div>
      <div className="row">
        <Field label="Клас напруги">
          <select value={item.voltageClass || "unknown"} onChange={(e) => onChange("voltageClass", e.target.value)}>
            <option value="lv48">Низьковольтна ~48–51 В</option>
            <option value="hv">Високовольтна (HV)</option>
            <option value="unknown">Не вказано</option>
          </select>
        </Field>
        <label className="ck eq-check"><input type="checkbox" checked={!!item.breaker} onChange={(e) => onChange("breaker", e.target.checked)} />Вбудований DC-захист</label>
      </div>
      <Field label="Примітка"><input value={item.note || ""} onChange={(e) => onChange("note", e.target.value)} /></Field>
    </div>
  );
}

export default function EquipmentCatalog({ equipment, onChange, onReset }) {
  const add = (kind) => {
    const item = kind === "inverters"
      ? { id: uid("inv"), brand: "", model: "", type: "offgrid", phases: 1, powerKw: 6, batteryClass: "unknown", note: "" }
      : { id: uid("bat"), brand: "", model: "", capacityKwh: 5.12, dischargeA: 100, nominalVoltageV: 51.2, voltageClass: "lv48", breaker: false, note: "" };
    onChange({ ...equipment, [kind]: [...equipment[kind], item] });
  };
  const edit = (kind, id, field, value) => onChange({
    ...equipment,
    [kind]: equipment[kind].map((x) => x.id === id ? { ...x, [field]: value } : x),
  });
  const del = (kind, id) => onChange({ ...equipment, [kind]: equipment[kind].filter((x) => x.id !== id) });

  return (
    <section className="card">
      <details className="cat">
        <summary>Каталог інверторів і АКБ</summary>
        <p className="hint" style={{ marginTop: 8 }}>Додані картки зберігаються у цьому браузері та з'являються у випадаючих списках форми. Паспортні характеристики варто перевіряти для конкретної ревізії обладнання.</p>
        <div className="eq-section-head"><h3>Інвертори</h3><button type="button" onClick={() => add("inverters")}>+ Додати інвертор</button></div>
        <div className="eq-grid">{equipment.inverters.map((x) => <InverterCard key={x.id} item={x} onChange={(f, v) => edit("inverters", x.id, f, v)} onDelete={() => del("inverters", x.id)} />)}</div>
        <div className="eq-section-head"><h3>Батареї</h3><button type="button" onClick={() => add("batteries")}>+ Додати АКБ</button></div>
        <div className="eq-grid">{equipment.batteries.map((x) => <BatteryCard key={x.id} item={x} onChange={(f, v) => edit("batteries", x.id, f, v)} onDelete={() => del("batteries", x.id)} />)}</div>
        <div style={{ marginTop: 12 }}><button type="button" onClick={onReset}>Повернути стартовий каталог обладнання</button></div>
      </details>
    </section>
  );
}
