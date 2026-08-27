"use strict";
const { boot, sleep, assert } = require("./helpers");

async function importFile(t, text) {
  const input = t.d.querySelector("#restoreFile");
  const file = new t.w.File([text], "backup.json", { type: "application/json" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  await sleep(80); // FileReader is async
}
function makeBackup(overrides = {}, dataOverrides = {}) {
  return Object.assign({
    format: "visual-routine-backup", version: 1,
    createdAt: "2026-08-27T10:00:00.000Z", appVersion: "phase-1",
    data: Object.assign({
      settings: { lang: "pt" },
      activities: [{ id: "r1", label: "Restored", minutes: 5, src: "emoji", img: "⭐", type: "timer", time: "", done: false }],
      favorites: [], events: [], aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: []
    }, dataOverrides)
  }, overrides);
}

exports.cases = [
  { name: "export produces valid JSON with format, version and full data", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#backupBtn"));
    const blob = t.blob();
    assert(blob, "no file was produced");
    const obj = JSON.parse(await blob.text());
    assert(obj.format === "visual-routine-backup" && obj.version === 1, "format/version missing");
    assert(obj.createdAt && obj.appVersion, "metadata missing");
    for (const k of ["settings","activities","favorites","events","aacCards","aacPics","aacPicsQ","aacHidden"])
      assert(k in obj.data, "data missing key " + k);
    assert(obj.data.activities.length === t.d.querySelectorAll("#routine .card").length,
      "exported activities differ from UI");
  }},
  { name: "valid import: confirmation shown, data replaced atomically", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    await importFile(t, JSON.stringify(makeBackup()));
    assert(t.confirms.length === 1, "confirmation dialog not shown");
    assert(t.confirms[0].includes("1 activities"), "confirmation should summarize the backup");
    const saved = JSON.parse(t.w.localStorage.getItem("visual-routine-v2"));
    assert(saved.activities.length === 1 && saved.activities[0].label === "Restored", "data not replaced");
    assert(t.alerts.length === 0, "unexpected alert: " + t.alerts.join("; "));
  }},
  { name: "cancel on confirmation changes nothing", fn: async () => {
    const t = boot({ confirmResult: false }); await sleep(300);
    const before = t.w.localStorage.getItem("visual-routine-v2");
    t.click(t.d.querySelector("#editBtn"));
    await importFile(t, JSON.stringify(makeBackup()));
    assert(t.confirms.length === 1, "confirmation not shown");
    assert(t.w.localStorage.getItem("visual-routine-v2") === before, "state changed after cancel");
  }},
  { name: "invalid JSON is rejected with a friendly message; state untouched", fn: async () => {
    const t = boot(); await sleep(300);
    const before = t.w.localStorage.getItem("visual-routine-v2");
    t.click(t.d.querySelector("#editBtn"));
    await importFile(t, "this is not json {{{");
    assert(t.alerts.some(a => a.includes("not a valid backup")), "friendly rejection missing");
    assert(t.confirms.length === 0, "must reject BEFORE confirmation");
    assert(t.w.localStorage.getItem("visual-routine-v2") === before, "state changed on invalid file");
  }},
  { name: "wrong format is rejected", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    await importFile(t, JSON.stringify(makeBackup({ format: "something-else" })));
    assert(t.alerts.some(a => a.includes("not a valid backup")), "wrong format accepted");
    assert(t.confirms.length === 0, "confirmed a wrong-format file");
  }},
  { name: "incompatible version is rejected with its own message", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    await importFile(t, JSON.stringify(makeBackup({ version: 2 })));
    assert(t.alerts.some(a => a.includes("incompatible")), "incompatible version accepted");
  }},
  { name: "structurally broken data (missing arrays) is rejected — no partial state", fn: async () => {
    const t = boot(); await sleep(300);
    const before = t.w.localStorage.getItem("visual-routine-v2");
    t.click(t.d.querySelector("#editBtn"));
    const bad = makeBackup(); delete bad.data.events;
    await importFile(t, JSON.stringify(bad));
    assert(t.alerts.some(a => a.includes("not a valid backup")), "broken structure accepted");
    assert(t.w.localStorage.getItem("visual-routine-v2") === before, "partial state written");
  }},
];
