"use strict";
const fs = require("fs"), path = require("path");
const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".test.js")).sort();
(async () => {
  let total = 0, passed = 0, failed = 0;
  for (const f of files) {
    console.log("\n" + f);
    const { cases } = require(path.join(__dirname, f));
    for (const c of cases) {
      total++;
      try { await c.fn(); passed++; console.log("  ✓ " + c.name); }
      catch (e) { failed++; console.log("  ✗ " + c.name + "\n      " + e.message); }
    }
  }
  console.log(`\nTotal: ${total}  Passed: ${passed}  Failed: ${failed}  Skipped: 0`);
  process.exit(failed ? 1 : 0);
})();
