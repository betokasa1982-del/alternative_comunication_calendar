"use strict";
const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const vc = new VirtualConsole(); vc.on("jsdomError", () => {}); // silence "not implemented" navigation noise
const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function boot(opts = {}) {
  const spoken = [], alerts = [], confirms = [];
  let capturedBlob = null;
  const dom = new JSDOM(HTML, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.com/", virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
      w.AudioContext = function(){ return { createOscillator: () => ({ connect(){}, start(){}, stop(){}, frequency:{} }),
        createGain: () => ({ connect(){}, gain:{ setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} } }),
        destination:{}, currentTime:0 }; };
      w.URL.createObjectURL = (b) => { capturedBlob = b; return "blob:test"; };
      w.SpeechSynthesisUtterance = function(t){ this.text = t; };
      w.speechSynthesis = { cancel(){}, onvoiceschanged:null,
        getVoices: () => opts.voices || [{lang:"pt-PT"},{lang:"pt-BR"},{lang:"sv-SE"},{lang:"en-US"}],
        speak: u => spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.lang }) };
      Object.defineProperty(w.navigator, "wakeLock", { value: { request: async () => ({ addEventListener(){}, release(){} }) } });
      w.fetch = opts.fetchImpl || (async () => ({ ok: false }));
      w.alert = m => alerts.push(String(m));
      w.confirm = m => { confirms.push(String(m)); return opts.confirmResult !== false; };
      if (opts.storage) { try { w.localStorage.setItem("visual-routine-v2",
        typeof opts.storage === "string" ? opts.storage : JSON.stringify(opts.storage)); } catch (e) {} }
      w.onerror = (m, s, l, c, e) => { (w.__errors = w.__errors || []).push(((e && e.stack) || m).split("\n")[0]); };
    }
  });
  const w = dom.window, d = w.document;
  const click = el => el.dispatchEvent(new w.Event("click", { bubbles: true }));
  return { dom, w, d, click, spoken, alerts, confirms,
    errors: () => w.__errors || [], blob: () => capturedBlob };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
const pad = n => String(n).padStart(2, "0");
const hhmm = date => pad(date.getHours()) + ":" + pad(date.getMinutes());
module.exports = { boot, sleep, assert, hhmm };
