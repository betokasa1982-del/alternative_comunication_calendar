"use strict";
const { boot, sleep, assert, hhmm } = require("./helpers");

const seed = (n, extra = {}) => Object.assign({
  id: "s" + n, label: "Act" + n, minutes: 5, src: "emoji", img: "🔵", type: "timer", time: "", done: false
}, extra);
const STATE = acts => ({ settings: { lang: "pt" }, activities: acts, favorites: [], events: [],
  aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: [] });
const nb = (t, id) => t.d.querySelector(id);

exports.cases = [
  { name: "NOW/NEXT/LATER: correct activities, later excludes done and caps at 3", fn: async () => {
    const acts = [seed(1), seed(2), seed(3), seed(4, { done: true }), seed(5), seed(6), seed(7)];
    const t = boot({ storage: STATE(acts) }); await sleep(300);
    assert(nb(t, "#nbNowTag").textContent === "AGORA", "NOW tag");
    assert(nb(t, "#nbNowLabel").textContent === "Act1", "NOW activity wrong");
    assert(nb(t, "#nbNextLabel").textContent === "Act2", "NEXT activity wrong");
    const chips = [...t.d.querySelectorAll("#nbChips .nb-chip .cl")].map(x => x.textContent);
    assert(chips.join(",") === "Act3,Act5,Act6", "LATER wrong (must skip done, cap 3): " + chips.join(","));
  }},
  { name: "completing NOW moves everything up (deterministic, single source)", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { type: "check" }), seed(2), seed(3)]) }); await sleep(300);
    t.click(nb(t, "#nbNow")); // check-type: tapping the NOW card completes it
    assert(nb(t, "#nbNowLabel").textContent === "Act2", "NOW did not advance");
    assert(nb(t, "#nbNextLabel").textContent === "Act3", "NEXT did not advance");
    const doneCard = [...t.d.querySelectorAll("#routine .card")][0];
    assert(doneCard.classList.contains("done"), "list card not marked done");
  }},
  { name: "edges: single activity — NEXT shows routine-finished, never an empty card", fn: async () => {
    const t = boot({ storage: STATE([seed(1)]) }); await sleep(300);
    assert(nb(t, "#nbNowLabel").textContent === "Act1", "NOW wrong");
    assert(nb(t, "#nbNextLabel").textContent.includes("Terminou a rotina"), "NEXT must explain the end");
    assert(nb(t, "#nbLater").style.display === "none", "LATER should hide when empty");
  }},
  { name: "edges: last activity done -> celebration; never returns to an old activity", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { done: true }), seed(2, { type: "check" })]) }); await sleep(300);
    t.click(nb(t, "#nbNow"));
    assert(nb(t, "#nbNow").classList.contains("alldone"), "all-done state missing");
    assert(nb(t, "#nbNowLabel").textContent.includes("Terminou a rotina"), "celebration missing");
    assert(nb(t, "#nbNext").style.display === "none", "NEXT should hide when all done");
    assert(!nb(t, "#nbNowLabel").textContent.includes("Act"), "fell back to an old activity");
  }},
  { name: "edges: empty routine hides the block without errors", fn: async () => {
    const t = boot({ storage: STATE([]) }); await sleep(300);
    assert(nb(t, "#nowBlock").style.display === "none", "block should hide on empty routine");
    assert(t.errors().length === 0, "errors: " + t.errors().join("; "));
  }},
  { name: "temporal states: chips carry text+symbol for done/now/soon/next (not color-only)", fn: async () => {
    const soonTime = hhmm(new Date(Date.now() + 5 * 60000));
    const acts = [seed(1, { done: true }), seed(2), seed(3, { type: "clock", time: soonTime }), seed(4, { type: "check" })];
    const t = boot({ storage: STATE(acts) }); await sleep(300);
    const chip = i => t.d.querySelectorAll("#routine .card")[i].querySelector(".stchip").textContent;
    assert(chip(0).includes("✓") && chip(0).includes("Concluído"), "done chip: " + chip(0));
    assert(chip(1).includes("▶") && chip(1).includes("Agora"), "now chip: " + chip(1));
    assert(chip(2).includes("⏳") && chip(2).includes("Quase"), "soon chip: " + chip(2));
    assert(chip(3).includes("○") && chip(3).includes("Próximo"), "next chip: " + chip(3));
  }},
  { name: "clock in the past is not 'almost'; no fake countdown for check/timer types", fn: async () => {
    const past = hhmm(new Date(Date.now() - 30 * 60000));
    const t = boot({ storage: STATE([seed(1), seed(2, { type: "clock", time: past }), seed(3, { type: "check" })]) });
    await sleep(300);
    const cards = [...t.d.querySelectorAll("#routine .card")];
    assert(!cards[1].querySelector(".stchip").textContent.includes("Quase"), "past clock counted as almost");
    assert(cards[2].querySelector(".sub").textContent.trim().endsWith("Próximo"), "check card must carry no time info");
    assert(nb(t, "#nbLive").style.display === "none", "no timer running — live bar must be hidden");
  }},
  { name: "timer reflection: NOW card mirrors the one real timer; stop clears it", fn: async () => {
    const t = boot({ storage: STATE([seed(1), seed(2)]) }); await sleep(300);
    t.click(nb(t, "#nbNow")); // starts the existing timer for Act1
    assert(t.d.querySelector("#timer").classList.contains("open"), "timer did not start from NOW card");
    await sleep(150); // let the rAF loop tick
    assert(nb(t, "#nbLive").style.display === "flex", "NOW card does not reflect the running timer");
    assert(nb(t, "#nbTime").textContent === t.d.querySelector("#tTime").textContent,
      "NOW time differs from the real timer (two timers?)");
    t.click(t.d.querySelector("#tStop"));
    assert(nb(t, "#nbLive").style.display === "none", "live bar must clear on stop");
  }},
  { name: "First→Then: create via picker, render, speak on tap, persist across reload", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { label: "Banho", img: "🛁" }), seed(2, { label: "Tablet", img: "📱" })]) });
    await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#ftBtn"));
    assert(t.d.querySelector("#ftSheet").classList.contains("open"), "picker did not open");
    const items = [...t.d.querySelectorAll("#ftPickGrid .lib-card")];
    assert(items.length === 2, "picker pool wrong: " + items.length);
    t.click(items[0]); // -> first slot, auto-advance
    t.click(items[1]); // -> then slot
    t.click(t.d.querySelector("#ftSave"));
    t.click(t.d.querySelector("#editBtn"));
    const strip = t.d.querySelector("#ftStrip");
    assert(strip.style.display !== "none", "strip not rendered");
    assert(strip.textContent.includes("Primeiro") && strip.textContent.includes("Banho")
        && strip.textContent.includes("Depois") && strip.textContent.includes("Tablet"), "strip content wrong");
    t.click(strip);
    const last = t.spoken[t.spoken.length - 1];
    assert(last && last.text === "Primeiro Banho. Depois Tablet." && last.voice === "pt-BR",
      "FT speech wrong: " + JSON.stringify(last));
    // persists across reload
    const t2 = boot({ storage: t.w.localStorage.getItem("visual-routine-v2") }); await sleep(300);
    assert(t2.d.querySelector("#ftStrip").style.display !== "none", "FT lost on reload");
  }},
  { name: "First→Then: optional — removable in edit mode, absent by default", fn: async () => {
    const t = boot({ storage: STATE([seed(1)]) }); await sleep(300);
    assert(t.d.querySelector("#ftStrip").style.display === "none", "FT must be absent by default");
    // seed one, then remove
    t.w.eval && null;
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#ftBtn"));
    const it = t.d.querySelector("#ftPickGrid .lib-card");
    t.click(it); t.click(it); // same item both slots is allowed
    t.click(t.d.querySelector("#ftSave"));
    t.click(t.d.querySelector("#ftRemove"));
    assert(t.d.querySelector("#ftStrip").style.display === "none", "remove failed");
    const saved = JSON.parse(t.w.localStorage.getItem("visual-routine-v2"));
    assert(saved.firstThen === null, "removal not persisted");
  }},
  { name: "backup: new backups carry firstThen; old F1 backups (without it) import cleanly", fn: async () => {
    const t = boot({ storage: Object.assign(STATE([seed(1)]), { firstThen: { first: { label: "A", src: "emoji", img: "🛁" }, then: { label: "B", src: "emoji", img: "📱" } } }) });
    await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#backupBtn"));
    const exported = JSON.parse(await t.blob().text());
    assert(exported.data.firstThen && exported.data.firstThen.first.label === "A", "firstThen missing from backup");
    // import an F1-era backup with NO firstThen field
    const oldBackup = { format: "visual-routine-backup", version: 1, createdAt: "2026-08-01T00:00:00Z", appVersion: "phase-1",
      data: { settings: { lang: "pt" }, activities: [seed(9, { label: "Old" })], favorites: [], events: [],
        aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: [] } };
    const input = t.d.querySelector("#restoreFile");
    const file = new t.w.File([JSON.stringify(oldBackup)], "old.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    await sleep(80);
    const saved = JSON.parse(t.w.localStorage.getItem("visual-routine-v2"));
    assert(saved.activities[0].label === "Old", "old backup not imported");
    assert(saved.firstThen === null, "old backup must default firstThen to null");
    assert(t.alerts.length === 0, "old backup wrongly rejected: " + t.alerts.join("; "));
  }},
  { name: "i18n: NOW/NEXT/LATER and state chips translate PT -> EN -> SV", fn: async () => {
    const t = boot({ storage: STATE([seed(1), seed(2)]) }); await sleep(300);
    t.click(t.d.querySelector("#langBtn")); // EN
    assert(nb(t, "#nbNowTag").textContent === "NOW" && nb(t, "#nbNextTag").textContent === "NEXT", "EN tags");
    assert(t.d.querySelector("#routine .card .stchip").textContent.includes("Now"), "EN chip");
    t.click(t.d.querySelector("#langBtn")); // SV
    assert(nb(t, "#nbNowTag").textContent === "NU" && nb(t, "#nbNextTag").textContent === "SEDAN", "SV tags");
    assert(t.d.querySelector("#routine .card .stchip").textContent.includes("Nu"), "SV chip");
  }},
];
