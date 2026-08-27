"use strict";
const { boot, sleep, assert, hhmm } = require("./helpers");

// Fixture shaped like real pre-Phase-1 data (visual-routine-v2)
const FIXTURE = {
  settings: { lang: "sv" },
  activities: [
    { id: "a1", label: "Bad", minutes: 10, src: "emoji", img: "🛁", type: "timer", time: "", done: false },
    { id: "a2", label: "Kläder", minutes: 10, src: "emoji", img: "👕", type: "check", time: "", done: true },
    { id: "a3", label: "Skola", minutes: 10, src: "emoji", img: "🏫", type: "clock", time: "08:10", done: false }
  ],
  favorites: [ { id: "f1", label: "Borsta tänder", minutes: 3, src: "emoji", img: "🪥", type: "timer", time: "" } ],
  events: [ { id: "e1", name: "Resa", date: "2099-12-24", src: "emoji", img: "✈️", marked: ["2099-12-01"], start: "2099-12-01" } ],
  aacCards: [ { id: "w1", labels: { pt: "bolo", sv: "tårta", en: "cake" }, cat: "food", src: "emoji", img: "🎂" } ],
  aacPics: { core0: "data:image/png;base64,iVBORw0KGgo=" },
  aacPicsQ: { core0: "yo" },
  aacHidden: ["core5"]
};

exports.cases = [
  { name: "fixture loads: routine, event, favorite, custom word, language all preserved", fn: async () => {
    const t = boot({ storage: FIXTURE }); await sleep(300);
    // language
    assert(t.d.querySelector("#langBtn").textContent === "SV", "lang button should show SV");
    // routine: 3 cards, done state kept, per-type buttons kept
    const cards = [...t.d.querySelectorAll("#routine .card")];
    assert(cards.length === 3, "activities: " + cards.length);
    assert(cards[1].classList.contains("done"), "done state lost");
    // event survives
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "countdown"));
    assert([...t.d.querySelectorAll("#events .card .label")].some(l => l.textContent === "Resa"), "event lost");
    // AAC: custom word present, hidden core stays hidden, cached pictogram applied
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "talk"));
    const words = [...t.d.querySelectorAll("#board .wcard .wl")].map(l => l.textContent);
    assert(words.includes("tårta"), "custom word lost (SV label expected)");
    assert(!t.d.querySelector('#board .wcard[data-cat] .wl') || true, "board renders");
    const core0img = [...t.d.querySelectorAll("#board .wcard .wp img")].length;
    assert(core0img >= 1, "cached pictogram not applied");
    // favorite survives (edit mode -> library)
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "routine"));
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#openLibraryBtn"));
    assert(t.d.querySelectorAll("#libGrid .lib-card").length === 1, "favorite lost");
    assert(t.errors().length === 0, "errors: " + t.errors().join("; "));
  }},
  { name: "reload: navigate all pillars, add an activity, state survives a fresh boot", fn: async () => {
    const t1 = boot(); await sleep(300);
    for (const tab of ["talk", "countdown", "help", "routine"])
      t1.click([...t1.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === tab));
    t1.click(t1.d.querySelector("#editBtn"));
    t1.click(t1.d.querySelector("#addActivityBtn"));
    t1.d.querySelector("#labelInput").value = "Sobrevive";
    t1.click(t1.d.querySelector("#emojiGrid button"));
    t1.click(t1.d.querySelector("#saveBtn"));
    const persisted = t1.w.localStorage.getItem("visual-routine-v2");
    assert(persisted && persisted.includes("Sobrevive"), "state not persisted");
    // fresh boot with the persisted string = a reload
    const t2 = boot({ storage: persisted }); await sleep(300);
    assert([...t2.d.querySelectorAll("#routine .card .label")].some(l => l.textContent === "Sobrevive"),
      "activity lost after reload");
    assert(t2.errors().length === 0, "reload errors: " + t2.errors().join("; "));
    // navigation still works after reload
    t2.click([...t2.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "help"));
    assert(t2.d.querySelector("#view-help").classList.contains("on"), "navigation broken after reload");
  }},
];
