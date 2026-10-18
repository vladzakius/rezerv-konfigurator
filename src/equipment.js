export const DEFAULT_EQUIPMENT = {
  inverters: [
    {
      id: "growatt-spf-6000-es-plus",
      brand: "Growatt",
      model: "SPF 6000 ES Plus",
      type: "offgrid",
      phases: 1,
      powerKw: 6,
      batteryClass: "lv48",
      note: "Стартова картка з поточного прикладу. Перевір характеристики за паспортом конкретної ревізії.",
    },
  ],
  batteries: [
    {
      id: "dyness-dl5-0c",
      brand: "Dyness",
      model: "DL5.0C",
      capacityKwh: 5.12,
      dischargeA: 100,
      nominalVoltageV: 51.2,
      voltageClass: "lv48",
      breaker: false,
      note: "Стартова картка з поточного прикладу. Параметри захисту звіряти з паспортом АКБ.",
    },
  ],
};

export function normalizeEquipment(saved) {
  const src = saved && typeof saved === "object" ? saved : {};
  const inv = Array.isArray(src.inverters) ? src.inverters : [];
  const bat = Array.isArray(src.batteries) ? src.batteries : [];
  const merge = (defaults, custom) => {
    const map = new Map(defaults.map((x) => [x.id, x]));
    custom.forEach((x) => x?.id && map.set(x.id, { ...map.get(x.id), ...x }));
    return [...map.values()];
  };
  return { inverters: merge(DEFAULT_EQUIPMENT.inverters, inv), batteries: merge(DEFAULT_EQUIPMENT.batteries, bat) };
}

export const equipmentLabel = (x) => [x.brand, x.model].filter(Boolean).join(" ") || "Без назви";
