"use strict";
const { boot, sleep, assert, hhmm } = require("./helpers");

function makeArasaacFetch(getWindow) {
  return async (url) => {
    const s = String(url);
    if (s.includes("/search/")) return { ok: true, json: async () => [{ _id: 7 }] };
    if (s.includes("mymemory")) return { ok: true, json: async () => ({ responseData: { translatedText: "x" } }) };
    return { ok: true, blob: async () => new (getWindow().Blob)(["x"], { type: "image/png" }) };
  };
}

exports.cases = [
  { name: "timer: start -> Done -> card done -> ↺ undo", fn: async () => {
    const t = boot(); await sleep(300);
    const card = () => t.d.querySelectorAll("#routine .card")[0];
    t.click(card().querySelector(".go"));
    assert(t.d.querySelector("#timer").classList.contains("open"), "timer did not open");
    t.click(t.d.querySelector("#tDone"));
    assert(card().classList.contains("done"), "not marked done");
    assert(card().querySelector(".go").textContent.trim() === "↺", "undo affordance missing");
    t.click(card().querySelector(".go"));
    assert(!card().classList.contains("done"), "undo failed");
  }},
  { name: "mini-timer: 💬 docks the timer, opens Communicate, tap restores, Stop clears", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelectorAll("#routine .card")[0].querySelector(".go"));
    t.click(t.d.querySelector("#tTalk"));
    assert(t.d.querySelector("#view-talk").classList.contains("on"), "did not switch to Communicate");
    assert(t.d.querySelector("#miniTimer").classList.contains("show"), "dock not shown");
    t.click(t.d.querySelector("#miniTimer"));
    assert(t.d.querySelector("#timer").classList.contains("open"), "dock tap did not restore");
    t.click(t.d.querySelector("#tStop"));
    assert(!t.d.querySelector("#miniTimer").classList.contains("show"), "Stop left the dock visible");
  }},
  { name: "activity types: check = tap-to-done; clock = zoomed dayline with wait chip", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    // check type
    t.click(t.d.querySelector("#addActivityBtn"));
    t.d.querySelector("#labelInput").value = "Guardar";
    t.click([...t.d.querySelectorAll("#typeSeg button")].find(b => b.dataset.type === "check"));
    t.click(t.d.querySelector("#emojiGrid button"));
    t.click(t.d.querySelector("#saveBtn"));
    // clock type 30 min ahead
    t.click(t.d.querySelector("#addActivityBtn"));
    t.d.querySelector("#labelInput").value = "Consulta";
    t.click([...t.d.querySelectorAll("#typeSeg button")].find(b => b.dataset.type === "clock"));
    t.d.querySelector("#timeInput").value = hhmm(new Date(Date.now() + 30 * 60000));
    t.click(t.d.querySelector("#emojiGrid button"));
    t.click(t.d.querySelector("#saveBtn"));
    t.click(t.d.querySelector("#editBtn"));
    const find = n => [...t.d.querySelectorAll("#routine .card")].find(c => c.querySelector(".label").textContent === n);
    t.click(find("Guardar").querySelector(".go"));
    assert(find("Guardar").classList.contains("done"), "check type did not complete on tap");
    t.click(find("Consulta").querySelector(".go"));
    assert(t.d.querySelector("#dayline").classList.contains("open"), "dayline did not open");
    assert(t.d.querySelector("#dlWait").classList.contains("show"), "wait chip missing");
    assert(t.d.querySelector("#dlWaitLbl").textContent === "esperar", "wait word wrong");
    t.click(t.d.querySelector("#dlClose"));
  }},
  { name: "countdown calendar: every day sits in its true Monday-first weekday column", fn: async () => {
    const t = boot(); await sleep(300);
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "countdown"));
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#addEventBtn"));
    t.d.querySelector("#labelInput").value = "Trip";
    const tgt = new Date(Date.now() + 40 * 86400000);
    const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    t.d.querySelector("#dateInput").value = iso(tgt);
    t.click(t.d.querySelector("#emojiGrid button"));
    t.click(t.d.querySelector("#saveBtn"));
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#events .card .count"));
    const MO = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    let bad = 0, checked = 0;
    t.d.querySelectorAll("#dCal .month").forEach(month => {
      const [name, year] = month.querySelector(".m-title").textContent.split(" ");
      const mi = MO.indexOf(name);
      [...month.querySelectorAll(".days > *")].forEach((cell, idx) => {
        if (cell.classList.contains("pad") || cell.classList.contains("empty")) return;
        const txt = (cell.querySelector(".evn") ? cell.querySelector(".evn").textContent : cell.textContent).trim();
        const dnum = parseInt(txt, 10); if (!dnum) return;
        checked++;
        const real = (new Date(+year, mi, dnum).getDay() + 6) % 7;
        if (idx % 7 !== real) bad++;
      });
    });
    assert(checked > 30 && bad === 0, `checked ${checked}, misaligned ${bad}`);
    t.click(t.d.querySelector("#detailBack"));
  }},
  { name: "AAC: sentence speaks pt-BR (never pt-PT), SV button speaks sv-SE", fn: async () => {
    const t = boot(); await sleep(300);
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "talk"));
    const tap = label => t.click([...t.d.querySelectorAll("#board .wcard")]
      .find(c => c.querySelector(".wl").textContent === label));
    tap("eu"); tap("quero"); tap("água");
    assert(t.d.querySelectorAll("#strip .chip").length === 3, "strip did not build");
    t.click(t.d.querySelector("#sayBtn"));
    let last = t.spoken[t.spoken.length - 1];
    assert(last.text === "eu quero água" && last.voice === "pt-BR", "PT confirm wrong: " + JSON.stringify(last));
    t.click(t.d.querySelector("#transBtn"));
    last = t.spoken[t.spoken.length - 1];
    assert(last.text === "jag vill ha vatten" && last.voice === "sv-SE", "SV output wrong: " + JSON.stringify(last));
  }},
  { name: "favorites: save-to-library, preview, confirm adds to routine", fn: async () => {
    const t = boot(); await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#addActivityBtn"));
    t.d.querySelector("#labelInput").value = "Escovar";
    t.click(t.d.querySelector("#emojiGrid button"));
    t.d.querySelector("#favChk").checked = true;
    t.click(t.d.querySelector("#saveBtn"));
    const before = t.d.querySelectorAll("#routine .card").length;
    t.click(t.d.querySelector("#openLibraryBtn"));
    assert(t.d.querySelectorAll("#libGrid .lib-card").length === 1, "favorite not in library");
    t.click(t.d.querySelector("#libGrid .lib-card"));
    assert(t.d.querySelector("#favPreview").classList.contains("open"), "preview did not open");
    t.click(t.d.querySelector("#fpConfirm"));
    assert(t.d.querySelectorAll("#routine .card").length === before + 1, "confirm did not add");
  }},
  { name: "core pictograms fetch at boot and get applied to the board", fn: async () => {
    let W = null;
    const t = boot({ fetchImpl: makeArasaacFetch(() => W) }); W = t.w;
    await sleep(2200);
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "talk"));
    await sleep(400);
    assert(t.d.querySelectorAll("#board .wcard .wp img").length > 0, "no pictograms applied after boot fetch");
    assert(t.errors().length === 0, "errors: " + t.errors().join("; "));
  }},
];
