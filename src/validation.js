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

  if (s.workCur === "usd" && num(s.workUsd) > 0 && !(num(s.rate) > 0)) {
    errors.push("Для монтажу в доларах потрібен курс гривні.");
  }

  if (calc?.r?.Pmax > 0 && num(s.invKw) > calc.r.Pmax) {
    warnings.push("Потужність АКБ нижча за номінальну потужність інвертора — перевір обмеження конкретного обладнання.");
  }

  if (num(s.trace) > 10) {
    warnings.push("Траса від щита до інвертора понад 10 м — окремо перевір параметри кабелю, спосіб прокладання та вимоги виробника інвертора.");
  }

  if (s.earth === "tnc") {
    warnings.push("Конфігурація TN-C потребує перевірки на місці перед фінальним рішенням.");
  }

  if (s.example) {
    warnings.push("Зараз показано приклад. Заміни демонстраційні дані параметрами реального об'єкта.");
  }

  const level = errors.length ? "incomplete" : warnings.length ? "check" : "ready";
  const label = level === "incomplete" ? "Недостатньо даних" : level === "check" ? "Потрібна перевірка" : "Готово до звіту";
  return { level, label, errors, warnings };
}
