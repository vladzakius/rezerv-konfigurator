import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CAT, EXAMPLE } from "../src/catalog.js";
import { compute } from "../src/compute.js";
import { validateConfig } from "../src/validation.js";

const cat = (key) => DEFAULT_CAT[key] || { name: key, model: "", price: 0, unit: "шт", url: "" };

function base(overrides = {}) {
  return { ...EXAMPLE, example: false, earth: "tncs", client: "Тестовий об'єкт", ...overrides };
}

test("compute returns finite non-negative totals", () => {
  const result = compute(base(), cat);
  assert.ok(Number.isFinite(result.r.mat));
  assert.ok(Number.isFinite(result.r.works));
  assert.ok(Number.isFinite(result.r.total));
  assert.ok(result.r.mat >= 0);
  assert.ok(result.r.total >= result.r.mat);
});

test("USD work remains separated in client total label", () => {
  const result = compute(base({ workCur: "usd", workUsd: 350, rate: 41.5 }), cat);
  assert.match(result.r.totalLabel, /грн \+ 350 \$/);
  assert.equal(result.r.wCur, "usd");
  assert.equal(result.r.wAmt, 350);
});

test("validation catches missing core equipment data", () => {
  const state = base({ invModel: "", batModel: "" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.level, "incomplete");
  assert.ok(validation.errors.some((x) => x.includes("інвертора")));
  assert.ok(validation.errors.some((x) => x.includes("АКБ")));
});

test("validation can reach ready state for complete neutral scenario", () => {
  const state = base({ invKw: "3", batN: 2, batI: 100, batKwh: 5.12, trace: 8, workCur: "uah", workUah: 12000, workUsd: "" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.level, "ready");
});

test("long inverter route requires a project check", () => {
  const state = base({ invKw: "3", batN: 2, batI: 100, batKwh: 5.12, trace: 18, workCur: "uah", workUah: 12000, workUsd: "" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.level, "check");
  assert.ok(validation.warnings.some((x) => x.includes("понад 10 м")));
});
