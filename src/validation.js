export function validateConfig(s, calc) {
  const errors = [];
  const warnings = [];

  const text = (v) => String(v || "").trim();
  const num = (v) => Number(v);

  if (!text(s.client)) warnings.push("Не вказано клієнта або адресу об'єкта.");
  if (!text(s.invModel)) errors.push("Вкажи модель інвертора.");
  if (!(num(s.invKw) > 0)) errors.push("Вкажи потужність інвертора.");
  if (!text(s.batModel)) errors.push("Вкажи модель АКБ.");
  if (!(num(s.batN) >= 1)) errors.push("Кількість АКБ має бути не менше 1.");
  if (!(num(s.batI) > 0)) errors.push("Вкажи допустимий струм розряду АКБ.");
  if (!(num(s.batKwh) > 0)) errors.push("Вкажи ємність АКБ.");
  if (!(num(s.trace) >= 1)) errors.push("Вкажи довжину траси.");
  if (!(num(s.groups) >= 1)) errors.push("Вкажи кількість груп у резерві.");

  const gridPhases = num(s.gridPhases) === 3 ? 3 : 1;
  const invPhases = num(s.invPhases) === 3 ? 3 : 1;
  if (gridPhases === 1 && invPhases === 3) {
    errors.push("3-фазний інвертор не можна вважати готовою конфігурацією від 1-фазної мережі без іншої топології.");
  }
  if (gridPhases === 3 && invPhases === 1) {
    warnings.push(`3-ф мережа → 1-ф резерв (${s.backupPhase || "L1"}): баланс фаз і трифазні навантаження треба перевірити окремо.`);
  }
  if (invPhases === 3) {
    warnings.push("Для 3-фазного інвертора схема, AC-захист і переріз траси не підтверджуються автоматично.");
  }

  if (s.workCur === "usd" && num(s.workUsd) > 0 && !(num(s.rate) > 0)) {
    errors.push("Для монтажу в доларах потрібен курс гривні.");
  }

  if (calc?.r?.Pmax > 0 && num(s.invKw) > calc.r.Pmax) {
    warnings.push("Потужність АКБ нижча за номінальну потужність інвертора — перевір обмеження конкретного обладнання.");
  }

  const trace = num(s.trace);
  if (trace > 15 && trace <= 30) warnings.push("Траса 16–30 м — перевір переріз, падіння напруги та спосіб прокладання.");
  if (trace > 30 && trace <= 50) warnings.push("Траса 31–50 м — потрібен окремий розрахунок AC-траси перед закупівлею кабелю.");
  if (trace > 50) warnings.push("Траса понад 50 м — проєктний переріз і захист мають бути підтверджені окремим розрахунком.");
  if (s.routeMethod === "existing") warnings.push("Для існуючої труби/стояка перевір доступний простір і стан траси до закупівлі кабелю.");

  if (s.earth === "tnc") {
    warnings.push("Конфігурація TN-C потребує перевірки на місці перед фінальним рішенням.");
  }

  if (s.example) warnings.push("Зараз показано приклад. Заміни демонстраційні дані параметрами реального об'єкта.");

  const level = errors.length ? "incomplete" : warnings.length ? "check" : "ready";
  const label = level === "incomplete" ? "Недостатньо даних" : level === "check" ? "Потрібна перевірка" : "Готово до звіту";
  return { level, label, errors, warnings };
}
