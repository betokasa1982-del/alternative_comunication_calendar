"use strict";
const { boot, sleep, assert } = require("./helpers");

exports.cases = [
  { name: "four pillars exist in order (PT labels by default)", fn: async () => {
    const t = boot(); await sleep(300);
    const tabs = [...t.d.querySelectorAll(".tabs button")];
    assert(tabs.length === 4, "expected 4 tabs, got " + tabs.length);
    const order = tabs.map(b => b.dataset.tab).join(",");
    assert(order === "routine,talk,countdown,help", "tab order: " + order);
    const labels = tabs.map(b => b.querySelector("span:last-child").textContent);
    assert(labels.join("|") === "Rotina|Comunicar|Preparar|Ajuda", "PT labels: " + labels.join("|"));
    assert(t.errors().length === 0, "load errors: " + t.errors().join("; "));
  }},
  { name: "each pillar opens with one tap; active tab has .on AND aria-current", fn: async () => {
    const t = boot(); await sleep(300);
    for (const tab of ["talk", "countdown", "help", "routine"]) {
      const b = [...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === tab);
      t.click(b);
      assert(t.d.querySelector("#view-" + tab).classList.contains("on"), tab + " view did not open");
      assert(b.classList.contains("on") && b.getAttribute("aria-current") === "page",
        tab + " active state must not rely on color only");
    }
  }},
  { name: "switching tabs does not destroy state (seed activities survive)", fn: async () => {
    const t = boot(); await sleep(300);
    const before = t.d.querySelectorAll("#routine .card").length;
    for (const tab of ["talk", "countdown", "help", "routine"])
      t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === tab));
    const after = t.d.querySelectorAll("#routine .card").length;
    assert(before > 0 && before === after, `cards ${before} -> ${after}`);
  }},
  { name: "Need Help card speaks the phrase with the pt-BR voice", fn: async () => {
    const t = boot(); await sleep(300);
    t.click([...t.d.querySelectorAll(".tabs button")].find(x => x.dataset.tab === "help"));
    t.click(t.d.querySelector("#helpCard"));
    const last = t.spoken[t.spoken.length - 1];
    assert(last && last.text === "Preciso de ajuda", "spoke: " + JSON.stringify(last));
    assert(last.lang === "pt-BR" && last.voice === "pt-BR", "voice/lang: " + JSON.stringify(last));
  }},
  { name: "new navigation is translated (PT -> EN -> SV) incl. help card", fn: async () => {
    const t = boot(); await sleep(300);
    const lbl = () => [...t.d.querySelectorAll(".tabs button span:last-child")].map(x => x.textContent).join("|");
    t.click(t.d.querySelector("#langBtn")); // EN
    assert(lbl() === "Routine|Communicate|Prepare|Help", "EN labels: " + lbl());
    assert(t.d.querySelector("#hcLabel").textContent === "I need help", "EN help card");
    t.click(t.d.querySelector("#langBtn")); // SV
    assert(lbl() === "Rutin|Kommunicera|Förbereda|Hjälp", "SV labels: " + lbl());
    assert(t.d.querySelector("#hcLabel").textContent === "Jag behöver hjälp", "SV help card");
  }},
];
