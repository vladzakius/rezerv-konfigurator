import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CAT, EXAMPLE } from "../src/catalog.js";
import { compute } from "../src/compute.js";
import { validateConfig } from "../src/validation.js";
import { buildPhaseOverview } from "../src/scheme3.js";

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
  const state = base({ invKw: "3", batN: 2, batI: 100, batV: 51.2, batKwh: 5.12, trace: 8, workCur: "uah", workUah: 12000, workUsd: "" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.errors.length, 0);
  assert.equal(validation.level, "ready");
});

test("medium inverter route requires a project check", () => {
  const state = base({ invKw: "3", batN: 2, batI: 100, batV: 51.2, batKwh: 5.12, trace: 18, workCur: "uah", workUah: 12000, workUsd: "" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.level, "check");
  assert.ok(validation.warnings.some((x) => x.includes("16–30 м")));
});

test("80 m route adds material reserve and stays in review mode", () => {
  const state = base({ invKw: "3", trace: 80, workCur: "uah", workUah: 12000, workUsd: "" });
  const result = compute(state, cat);
  assert.equal(result.r.route.key, "very-long");
  assert.equal(result.r.route.reserve, 8);
  const cable = result.items.find((x) => x.zone === "trace" && x.key === result.r.cab);
  assert.equal(cable.qty, 88);
  const validation = validateConfig(state, result);
  assert.equal(validation.level, "check");
  assert.ok(validation.warnings.some((x) => x.includes("понад 50 м")));
});

test("three-phase inverter uses project placeholders and suppresses detailed auto scheme", () => {
  const state = base({ gridPhases: "3", invPhases: "3", invKw: "12", trace: 20 });
  const result = compute(state, cat);
  assert.equal(result.r.schemeSupported, false);
  assert.ok(result.items.some((x) => x.key === "sw4p_project"));
  assert.ok(result.items.some((x) => x.key === "ac3p_cable"));
  assert.ok(!result.items.some((x) => x.key.startsWith("mcb2p_")));
});

test("three-phase grid to single-phase inverter records selected backup phase", () => {
  const state = base({ gridPhases: "3", invPhases: "1", backupPhase: "L2" });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(result.r.phaseScenario, "3to1");
  assert.ok(validation.warnings.some((x) => x.includes("L2")));
});

test("battery voltage class mismatch is blocking", () => {
  const state = base({ invBatteryClass: "lv48", batVoltageClass: "hv", batV: 300 });
  const result = compute(state, cat);
  const validation = validateConfig(state, result);
  assert.equal(validation.level, "incomplete");
  assert.ok(validation.errors.some((x) => x.includes("Клас напруги")));
  assert.ok(result.items.some((x) => x.key === "dc_project"));
});

test("3-to-1 client overview shows selected backup phase and conceptual warning", () => {
  const state = base({ gridPhases: "3", invPhases: "1", backupPhase: "L2" });
  const result = compute(state, cat);
  const view = buildPhaseOverview(state, result);
  assert.equal(view.conceptual, true);
  assert.match(view.svg, /3-ф мережа → 1-ф резерв/);
  assert.match(view.svg, /L2/);
  assert.match(view.svg, /Концептуальна схема для клієнта/);
});

test("3-to-3 client overview contains project protection and reserve blocks", () => {
  const state = base({ gridPhases: "3", invPhases: "3", invKw: "12" });
  const result = compute(state, cat);
  const view = buildPhaseOverview(state, result);
  assert.equal(view.conceptual, true);
  assert.match(view.svg, /3-ф мережа → 3-ф резерв/);
  assert.match(view.svg, /Проєктний 4P захист/);
  assert.match(view.svg, /3-ф резерв/);
});
