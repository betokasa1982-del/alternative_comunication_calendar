"use strict";
// PHASE 2 (revised) — the routine LIST is the single visual source.
// Test intents from the original Phase 2 file are preserved; assertions were
// re-pointed from the removed AGORA/DEPOIS/MAIS TARDE panels to the list itself,
// as required by PHASE_2_REVISION §2, §23 and §34.
const { boot, sleep, assert, hhmm } = require("./helpers");

const seed = (n, extra = {}) => Object.assign({
  id: "s" + n, label: "Act" + n, minutes: 5, src: "emoji", img: "🔵", type: "timer", time: "", done: false
}, extra);
const STATE = acts => ({ settings: { lang: "pt" }, activities: acts, favorites: [], events: [],
  aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: [] });
const cards = t => [...t.d.querySelectorAll("#routine .card")];
const labels = t => cards(t).map(c => c.querySelector(".label").textContent);
const chipOf = c => c.querySelector(".stchip").textContent;
const nowCard = t => cards(t).find(c => c.classList.contains("now"));

exports.cases = [
  // ---- the list represents past / now / next / future (was: three panels) ----
  { name: "list shows the whole sequence: done stay visible, current is marked, future follows", fn: async () => {
    const acts = [seed(1, { done: true }), seed(2, { done: true }), seed(3), seed(4), seed(5), seed(6), seed(7)];
    const t = boot({ storage: STATE(acts) }); await sleep(300);
    assert(labels(t).length === 7, "all activities must stay in the list: " + labels(t).length);
    assert(cards(t)[0].classList.contains("done") && chipOf(cards(t)[0]).includes("Concluído"),
      "completed activities must remain visible as done");
    const now = nowCard(t);
    assert(now && now.querySelector(".label").textContent === "Act3", "current activity not marked in the list");
    assert(now.getAttribute("aria-current") === "step", "current state must not be color-only");
    assert(chipOf(cards(t)[3]).includes("Próximo"), "the next activity must be identifiable in the list");
  }},
  { name: "NON-DUPLICATION: the current activity is rendered exactly once", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { label: "Karaoke" }), seed(2), seed(3)]) }); await sleep(300);
    const inList = labels(t).filter(l => l === "Karaoke").length;
    assert(inList === 1, "activity appears " + inList + " times in the list");
    assert(!t.d.querySelector("#nowBlock"), "the separate NOW/NEXT/LATER panel must be gone");
    assert(t.d.querySelectorAll(".card.now").length === 1, "only one card may carry the current state");
    const occurrences = (t.d.querySelector("main").textContent.match(/Karaoke/g) || []).length;
    assert(occurrences === 1, "label duplicated in the routine screen: " + occurrences);
  }},
  { name: "completing the current activity advances the marker without reordering the list", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { type: "check" }), seed(2), seed(3)]) }); await sleep(300);
    const before = labels(t).join(",");
    t.click(nowCard(t).querySelector(".go"));
    assert(labels(t).join(",") === before, "list order must stay stable: " + labels(t).join(","));
    assert(nowCard(t).querySelector(".label").textContent === "Act2", "current marker did not advance");
    assert(cards(t)[0].classList.contains("done"), "finished activity lost its done state");
  }},
  // ---- edges ----
  { name: "edges: empty routine renders no cards and no errors", fn: async () => {
    const t = boot({ storage: STATE([]) }); await sleep(300);
    assert(cards(t).length === 0, "empty routine must render no cards");
    assert(t.errors().length === 0, "errors: " + t.errors().join("; "));
  }},
  { name: "edges: single activity — it is the current one, nothing after it", fn: async () => {
    const t = boot({ storage: STATE([seed(1)]) }); await sleep(300);
    assert(cards(t).length === 1 && nowCard(t), "single activity must be the current one");
    assert(!cards(t)[0].nextElementSibling, "nothing may follow the only activity");
  }},
  { name: "edges: all done — no card claims 'now', completed stay on screen", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { done: true }), seed(2, { type: "check" })]) }); await sleep(300);
    t.click(nowCard(t).querySelector(".go"));
    assert(!nowCard(t), "no activity may be current when all are done");
    assert(cards(t).every(c => c.classList.contains("done")), "all cards must read as done");
    assert(cards(t).length === 2, "completed activities must stay on screen");
  }},
  // ---- temporal states, inside the card ----
  { name: "states inside the card: done/now/soon/next carry symbol + word", fn: async () => {
    const soonTime = hhmm(new Date(Date.now() + 5 * 60000));
    const acts = [seed(1, { done: true }), seed(2), seed(3, { type: "clock", time: soonTime }), seed(4, { type: "check" })];
    const t = boot({ storage: STATE(acts) }); await sleep(300);
    assert(chipOf(cards(t)[0]).includes("✓") && chipOf(cards(t)[0]).includes("Concluído"), "done chip");
    assert(chipOf(cards(t)[1]).includes("▶") && chipOf(cards(t)[1]).includes("Agora"), "now chip");
    assert(chipOf(cards(t)[2]).includes("◌") && chipOf(cards(t)[2]).includes("Quase"), "almost chip");
    assert(chipOf(cards(t)[3]).includes("○") && chipOf(cards(t)[3]).includes("Próximo"), "next chip");
  }},
  { name: "'almost' is discreet: dashed state, no continuous animation anywhere", fn: async () => {
    const html = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
    assert(!/rail-pulse|dl-pulse/.test(html), "decorative pulse animations must be gone");
    assert(/\.card\.soon\{[^}]*dashed/.test(html), "almost state must be conveyed without color alone");
  }},
  { name: "no fake countdown: check/timer types carry no clock, past clock is not 'almost'", fn: async () => {
    const past = hhmm(new Date(Date.now() - 30 * 60000));
    const t = boot({ storage: STATE([seed(1), seed(2, { type: "clock", time: past }), seed(3, { type: "check" })]) });
    await sleep(300);
    assert(!chipOf(cards(t)[1]).includes("Quase"), "past clock must not read as almost");
    assert(cards(t)[2].querySelector(".sub").textContent.trim().endsWith("Próximo"), "check card must show no time");
    const live = t.d.querySelector("#cardLive");
    assert(!live || live.style.display === "none", "no timer running — no live bar");
  }},
  // ---- timer belongs to the current activity, and only there ----
  { name: "timer: one clock only — live bar lives inside the current card and clears on stop", fn: async () => {
    const t = boot({ storage: STATE([seed(1), seed(2)]) }); await sleep(300);
    t.click(nowCard(t).querySelector(".go"));
    await sleep(150);
    const live = t.d.querySelector("#cardLive");
    assert(live && live.style.display === "flex", "current card does not reflect the running timer");
    assert(nowCard(t).contains(live), "the live bar must belong to the current activity's card");
    assert(t.d.querySelector("#nbTime").textContent === t.d.querySelector("#tTime").textContent,
      "card time differs from the real timer (second clock?)");
    assert(t.d.querySelectorAll("#cardLive").length === 1, "more than one live timer bar rendered");
    t.click(t.d.querySelector("#tStop"));
    const after = t.d.querySelector("#cardLive");
    assert(!after || after.style.display === "none", "live bar must clear on stop");
  }},
  { name: "mini-timer hand-off still works after the revision", fn: async () => {
    const t = boot({ storage: STATE([seed(1), seed(2)]) }); await sleep(300);
    t.click(nowCard(t).querySelector(".go"));
    t.click(t.d.querySelector("#tTalk"));
    assert(t.d.querySelector("#view-talk").classList.contains("on"), "did not switch to Communicate");
    assert(t.d.querySelector("#miniTimer").classList.contains("show"), "dock missing");
    t.click(t.d.querySelector("#miniTimer"));
    assert(t.d.querySelector("#timer").classList.contains("open"), "restore failed");
  }},
  // ---- First -> Then: optional AND contextual ----
  { name: "First→Then: absent by default; created via picker; persists", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { label: "Banho", img: "🛁" }), seed(2, { label: "Tablet", img: "📱" })]) });
    await sleep(300);
    assert(t.d.querySelector("#ftStrip").style.display === "none", "must be absent by default");
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#ftBtn"));
    const items = [...t.d.querySelectorAll("#ftPickGrid .lib-card")];
    t.click(items[0]); t.click(items[1]);
    t.click(t.d.querySelector("#ftSave"));
    const saved = JSON.parse(t.w.localStorage.getItem("visual-routine-v2"));
    assert(saved.firstThen && saved.firstThen.first.label === "Banho" && saved.firstThen.then.label === "Tablet",
      "pair not persisted");
    const t2 = boot({ storage: t.w.localStorage.getItem("visual-routine-v2") }); await sleep(300);
    assert(t2.d.querySelector("#ftStrip").style.display !== "none",
      "pair should show while its 'first' item is the current activity");
  }},
  { name: "First→Then is contextual: hidden when its 'first' is not the current activity", fn: async () => {
    const st = Object.assign(STATE([seed(1, { label: "Café" }), seed(2, { label: "Banho", img: "🛁" }), seed(3, { label: "Tablet", img: "📱" })]),
      { firstThen: { first: { label: "Banho", src: "emoji", img: "🛁" }, then: { label: "Tablet", src: "emoji", img: "📱" } } });
    const t = boot({ storage: st }); await sleep(300);
    assert(t.d.querySelector("#ftStrip").style.display === "none", "strip must not be permanent");
    t.click(nowCard(t).querySelector(".go"));
    t.click(t.d.querySelector("#tDone"));
    const strip = t.d.querySelector("#ftStrip");
    assert(strip.style.display !== "none", "strip must appear for the transition it supports");
    assert(strip.textContent.includes("Primeiro") && strip.textContent.includes("Depois"), "strip content");
    t.click(strip);
    const last = t.spoken[t.spoken.length - 1];
    assert(last && last.text === "Primeiro Banho. Depois Tablet.", "FT speech: " + JSON.stringify(last));
  }},
  { name: "First→Then: removable, and removal is persisted", fn: async () => {
    const st = Object.assign(STATE([seed(1, { label: "Banho", img: "🛁" }), seed(2, { label: "Tablet", img: "📱" })]),
      { firstThen: { first: { label: "Banho", src: "emoji", img: "🛁" }, then: { label: "Tablet", src: "emoji", img: "📱" } } });
    const t = boot({ storage: st }); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#ftRemove"));
    assert(t.d.querySelector("#ftStrip").style.display === "none", "remove failed");
    assert(JSON.parse(t.w.localStorage.getItem("visual-routine-v2")).firstThen === null, "removal not persisted");
  }},
  // ---- storage / backup / i18n / reload ----
  { name: "backup keeps firstThen; Phase-1 backups without it still import", fn: async () => {
    const st = Object.assign(STATE([seed(1)]),
      { firstThen: { first: { label: "A", src: "emoji", img: "🛁" }, then: { label: "B", src: "emoji", img: "📱" } } });
    const t = boot({ storage: st }); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#backupBtn"));
    const exported = JSON.parse(await t.blob().text());
    assert(exported.data.firstThen && exported.data.firstThen.first.label === "A", "firstThen missing from backup");
    const oldBackup = { format: "visual-routine-backup", version: 1, createdAt: "2026-08-01T00:00:00Z", appVersion: "phase-1",
      data: { settings: { lang: "pt" }, activities: [seed(9, { label: "Old" })], favorites: [], events: [],
        aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: [] } };
    const input = t.d.querySelector("#restoreFile");
    const file = new t.w.File([JSON.stringify(oldBackup)], "old.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    await sleep(80);
    const saved = JSON.parse(t.w.localStorage.getItem("visual-routine-v2"));
    assert(saved.activities[0].label === "Old" && saved.firstThen === null, "old backup import wrong");
    assert(t.alerts.length === 0, "old backup rejected: " + t.alerts.join("; "));
  }},
  { name: "reload rebuilds the correct list and current activity", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { type: "check" }), seed(2), seed(3)]) }); await sleep(300);
    t.click(nowCard(t).querySelector(".go"));
    const t2 = boot({ storage: t.w.localStorage.getItem("visual-routine-v2") }); await sleep(300);
    assert(labels(t2).join(",") === "Act1,Act2,Act3", "list not rebuilt: " + labels(t2).join(","));
    assert(cards(t2)[0].classList.contains("done"), "done state lost on reload");
    assert(nowCard(t2).querySelector(".label").textContent === "Act2", "current activity wrong after reload");
  }},
  { name: "i18n: state words translate PT -> EN -> SV inside the list", fn: async () => {
    const t = boot({ storage: STATE([seed(1), seed(2)]) }); await sleep(300);
    t.click(t.d.querySelector("#langBtn")); // EN
    assert(chipOf(nowCard(t)).includes("Now") && chipOf(cards(t)[1]).includes("Next"), "EN chips");
    t.click(t.d.querySelector("#langBtn")); // SV
    assert(chipOf(nowCard(t)).includes("Nu") && chipOf(cards(t)[1]).includes("Nästa"), "SV chips");
  }},
];
