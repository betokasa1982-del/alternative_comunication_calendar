"use strict";
// PHASE 2 — CLOCK CIRCULAR INDICATOR
// The clock card carries ONE circular temporal indicator (same visual language
// as the timer disc), never a horizontal bar. Spec §23.
const { boot, sleep, assert, hhmm } = require("./helpers");

const seed = (n, extra = {}) => Object.assign({
  id: "s" + n, label: "Act" + n, minutes: 5, src: "emoji", img: "🔵", type: "timer", time: "", done: false
}, extra);
const STATE = acts => ({ settings: { lang: "pt" }, activities: acts, favorites: [], events: [],
  aacCards: [], aacPics: {}, aacPicsQ: {}, aacHidden: [] });
const cards = t => [...t.d.querySelectorAll("#routine .card")];
const byLabel = (t, n) => cards(t).find(c => c.querySelector(".label").textContent === n);
const pctOf = ring => parseFloat(ring.style.getPropertyValue("--pct"));

exports.cases = [
  { name: "clock card renders a circular indicator, the time text, and the state — no bar", fn: async () => {
    const at = hhmm(new Date(Date.now() + 45 * 60000));
    const t = boot({ storage: STATE([seed(1, { label: "Karaoke", type: "clock", time: at })]) });
    await sleep(300);
    const card = byLabel(t, "Karaoke");
    const ring = card.querySelector(".clockring");
    assert(ring, "no circular indicator on the clock card");
    assert(ring.querySelector(".cr-center").textContent === at, "the scheduled time must stay readable: " + at);
    assert(card.querySelector(".sub").textContent.includes("Agora") || card.querySelector(".stchip"), "state must stay visible");
    assert(!card.querySelector(".card-live"), "a clock card must not carry the horizontal timer bar");
    assert(card.querySelectorAll(".clockring").length === 1, "only one temporal indicator per card");
  }},
  { name: "ring uses the same conic-gradient language as the timer disc", fn: async () => {
    const html = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
    const discRule = /\.disc\{[^}]*conic-gradient\(var\(--now\) calc\(var\(--pct\)\*1%\)/.test(html);
    const ringRule = /\.clockring\{[^}]*conic-gradient\(var\(--now\) calc\(var\(--pct\)\*1%\)/.test(html);
    assert(discRule, "timer disc rule changed unexpectedly");
    assert(ringRule, "clock ring must reuse the timer's circular language");
  }},
  { name: "PRÓXIMO: far-away event -> discreet, low fill", fn: async () => {
    const far = hhmm(new Date(Date.now() + 180 * 60000)); // beyond the approach window
    const near = hhmm(new Date(Date.now() + 60 * 60000)); // inside it, half way
    const t = boot({ storage: STATE([seed(1, { label: "Far", type: "clock", time: far }),
                                     seed(2, { label: "Mid", type: "clock", time: near })]) });
    await sleep(300);
    const farRing = byLabel(t, "Far").querySelector(".clockring");
    const midRing = byLabel(t, "Mid").querySelector(".clockring");
    assert(pctOf(farRing) === 0, "outside the approach window the ring stays empty: " + pctOf(farRing));
    assert(farRing.classList.contains("next"), "far event must read as next");
    assert(pctOf(midRing) > 40 && pctOf(midRing) < 60, "60 min out should be about half: " + pctOf(midRing));
    assert(midRing.classList.contains("next"), "60 min out is not 'almost' yet");
  }},
  { name: "QUASE: inside SOON_MIN the ring is fuller and marked, state text stays", fn: async () => {
    const soon = hhmm(new Date(Date.now() + 5 * 60000));
    const t = boot({ storage: STATE([seed(1), seed(2, { label: "Consulta", type: "clock", time: soon })]) });
    await sleep(300);
    const card = byLabel(t, "Consulta");
    const ring = card.querySelector(".clockring");
    assert(ring.classList.contains("soon"), "almost state missing on the ring");
    assert(pctOf(ring) > 90, "5 min out should be nearly full: " + pctOf(ring));
    assert(card.querySelector(".stchip").textContent.includes("Quase"), "textual state must remain");
  }},
  { name: "AGORA: time reached -> ring complete, state says Agora", fn: async () => {
    const now = hhmm(new Date());
    const t = boot({ storage: STATE([seed(1, { label: "Escola", type: "clock", time: now })]) });
    await sleep(300);
    const card = byLabel(t, "Escola");
    const ring = card.querySelector(".clockring");
    assert(pctOf(ring) === 100 && ring.classList.contains("arrived"), "arrival not shown: " + ring.className);
    assert(card.querySelector(".stchip").textContent.includes("Agora"), "AGORA text is mandatory");
  }},
  { name: "CONCLUÍDO: ring stops representing progress", fn: async () => {
    const soon = hhmm(new Date(Date.now() + 5 * 60000));
    const t = boot({ storage: STATE([seed(1, { label: "Feito", type: "clock", time: soon, done: true })]) });
    await sleep(300);
    const ring = byLabel(t, "Feito").querySelector(".clockring");
    assert(ring.classList.contains("done"), "done ring state missing");
    assert(ring.querySelector(".cr-center").textContent === "✓", "done ring must not show a countdown");
  }},
  { name: "clock activity without a time gets no fake ring", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { label: "SemHora", type: "clock", time: "" })]) });
    await sleep(300);
    assert(!byLabel(t, "SemHora").querySelector(".clockring"), "no ring may be invented without a time");
  }},
  { name: "timer cards are untouched: bar inside the card, disc in the overlay, no ring", fn: async () => {
    const t = boot({ storage: STATE([seed(1, { label: "Banho" }), seed(2)]) }); await sleep(300);
    const card = byLabel(t, "Banho");
    assert(!card.querySelector(".clockring"), "timer cards must not get a clock ring");
    t.click(card.querySelector(".go"));
    await sleep(150);
    assert(t.d.querySelector("#timer").classList.contains("open"), "timer overlay broken");
    assert(parseFloat(t.d.querySelector("#disc").style.getPropertyValue("--pct")) > 0, "timer disc not updating");
    const live = t.d.querySelector("#cardLive");
    assert(live && live.style.display === "flex", "timer card lost its live bar");
    t.click(t.d.querySelector("#tStop"));
  }},
  { name: "day-line still opens from a clock card and keeps its zoom", fn: async () => {
    const at = hhmm(new Date(Date.now() + 30 * 60000));
    const t = boot({ storage: STATE([seed(1, { label: "Dra", type: "clock", time: at })]) });
    await sleep(300);
    t.click(byLabel(t, "Dra").querySelector(".go"));
    assert(t.d.querySelector("#dayline").classList.contains("open"), "day-line did not open");
    assert(t.d.querySelector("#dlEndL").innerHTML !== "☀️", "approach zoom lost");
    assert(t.d.querySelector("#dlWait").classList.contains("show"), "wait chip lost");
  }},
  { name: "data format and backup unchanged by the ring", fn: async () => {
    const at = hhmm(new Date(Date.now() + 30 * 60000));
    const t = boot({ storage: STATE([seed(1, { label: "Dra", type: "clock", time: at })]) });
    await sleep(300);
    t.click(t.d.querySelector("#editBtn"));
    t.click(t.d.querySelector("#backupBtn"));
    const exported = JSON.parse(await t.blob().text());
    const act = exported.data.activities[0];
    assert(act.type === "clock" && act.time === at, "activity shape changed");
    assert(!("duration" in act) && !("pct" in act), "no invented fields may be persisted");
  }},
];
