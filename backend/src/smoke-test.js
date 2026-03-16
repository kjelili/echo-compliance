import assert from "node:assert/strict";
import { structureDailyLog } from "./summarizer.js";

const result = structureDailyLog({
  siteName: "Canary Wharf",
  foreman: "Ife",
  updateText: "Foundation works complete. Delay from weather this afternoon. Safety risk near scaffold.",
  attachments: [{ filename: "img.jpg" }]
});

assert.equal(typeof result.summary, "string");
assert.ok(result.tags.includes("progress"));
assert.ok(result.tags.includes("delay"));
assert.ok(result.tags.includes("safety"));
assert.equal(result.structured.photoCount, 1);
assert.ok(Array.isArray(result.actionTemplates));
assert.ok(result.actionTemplates.length > 0);
assert.equal(result.actionTemplates[0].status, "open");

console.log("Smoke test passed.");
