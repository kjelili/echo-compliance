import assert from "node:assert/strict";
import { createCoreFixtureLogs } from "./test-utils/compliance-pulse-fixtures.js";
import { withPulseApiTestContext } from "./test-utils/pulse-api-test-context.js";

const [{ default: app }, { readLogs, writeLogs }] = await Promise.all([
  import("./server.js"),
  import("./storage.js")
]);

await withPulseApiTestContext({
  app,
  readLogs,
  writeLogs,
  fixtureLogs: createCoreFixtureLogs(),
  run: async ({ baseUrl }) => {
    const pulseResponse = await fetch(`${baseUrl}/sites/${encodeURIComponent("Pulse Test Site")}/compliance-pulse`);
    assert.equal(pulseResponse.status, 200, "Expected compliance pulse endpoint to return 200.");

    const pulse = await pulseResponse.json();
    assert.equal(pulse.siteName, "Pulse Test Site");
    assert.ok(typeof pulse.score === "number" && pulse.score >= 0 && pulse.score <= 100);
    assert.ok(["A", "B", "C", "D", "E"].includes(pulse.grade));
    assert.ok((pulse.metrics?.criticalPending ?? 0) >= 1, "Expected at least one critical pending action.");
    assert.ok((pulse.metrics?.dueIn48Hours ?? 0) >= 1, "Expected at least one action due in 48 hours.");
    assert.ok(
      (pulse.metrics?.evidenceGapHighPriority ?? 0) >= 1,
      "Expected high-priority evidence gap to be detected."
    );
    assert.ok(Array.isArray(pulse.attentionZones) && pulse.attentionZones.length > 0);
    assert.ok(Array.isArray(pulse.recommendedFocus) && pulse.recommendedFocus.length > 0);
    assert.match(pulse.briefingText, /Compliance Pulse \| Pulse Test Site/);

    const missingSiteResponse = await fetch(
      `${baseUrl}/sites/${encodeURIComponent("Unknown Pulse Site")}/compliance-pulse`
    );
    assert.equal(missingSiteResponse.status, 404, "Expected unknown site compliance pulse request to return 404.");
  }
});

console.log("Compliance pulse core test passed.");
