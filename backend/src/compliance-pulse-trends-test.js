import assert from "node:assert/strict";
import { createTrendFixtureLogs } from "./test-utils/compliance-pulse-fixtures.js";
import { withPulseApiTestContext } from "./test-utils/pulse-api-test-context.js";

const [{ default: app }, { readLogs, writeLogs }] = await Promise.all([
  import("./server.js"),
  import("./storage.js")
]);

await withPulseApiTestContext({
  app,
  readLogs,
  writeLogs,
  fixtureLogs: createTrendFixtureLogs(),
  run: async ({ baseUrl }) => {
    const trendUpResponse = await fetch(`${baseUrl}/sites/${encodeURIComponent("Trend Up Site")}/compliance-pulse`);
    assert.equal(trendUpResponse.status, 200);
    const trendUpPulse = await trendUpResponse.json();
    assert.equal(trendUpPulse.riskMomentum?.trend, "up");
    assert.ok(
      (trendUpPulse.riskMomentum?.recentMentions ?? 0) > (trendUpPulse.riskMomentum?.previousMentions ?? 0)
    );

    const trendDownResponse = await fetch(`${baseUrl}/sites/${encodeURIComponent("Trend Down Site")}/compliance-pulse`);
    assert.equal(trendDownResponse.status, 200);
    const trendDownPulse = await trendDownResponse.json();
    assert.equal(trendDownPulse.riskMomentum?.trend, "down");
    assert.ok((trendDownPulse.riskMomentum?.recentMentions ?? 0) < (trendDownPulse.riskMomentum?.previousMentions ?? 0));

    const trendStableResponse = await fetch(
      `${baseUrl}/sites/${encodeURIComponent("Trend Stable Site")}/compliance-pulse`
    );
    assert.equal(trendStableResponse.status, 200);
    const trendStablePulse = await trendStableResponse.json();
    assert.equal(trendStablePulse.riskMomentum?.trend, "stable");
    assert.equal(trendStablePulse.riskMomentum?.recentMentions, trendStablePulse.riskMomentum?.previousMentions);
  }
});

console.log("Compliance pulse trends test passed.");
