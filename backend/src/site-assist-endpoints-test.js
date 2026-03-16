import assert from "node:assert/strict";
import { withApiTestContext } from "./test-utils/pulse-api-test-context.js";
import { createSiteAssistFixtureLogs } from "./test-utils/site-assist-fixtures.js";

const [{ default: app }, { readLogs, writeLogs }] = await Promise.all([
  import("./server.js"),
  import("./storage.js")
]);

await withApiTestContext({
  app,
  readLogs,
  writeLogs,
  fixtureLogs: createSiteAssistFixtureLogs(),
  run: async ({ baseUrl }) => {
    const encodedSiteName = encodeURIComponent("Assist Test Site");

    const handoverResponse = await fetch(`${baseUrl}/sites/${encodedSiteName}/handover`);
    assert.equal(handoverResponse.status, 200, "Expected handover endpoint to return 200.");
    const handover = await handoverResponse.json();
    assert.equal(handover.siteName, "Assist Test Site");
    assert.equal(handover.openActions.length, 1);
    assert.equal(handover.escalatedActions, 1);
    assert.ok(handover.riskWatchlist.includes("scaffold issue"));
    assert.match(handover.handoverText, /Shift handover for Assist Test Site/);

    const toolboxResponse = await fetch(`${baseUrl}/sites/${encodedSiteName}/toolbox-talk`);
    assert.equal(toolboxResponse.status, 200, "Expected toolbox endpoint to return 200.");
    const toolbox = await toolboxResponse.json();
    assert.match(toolbox.title, /Toolbox Talk - Assist Test Site/);
    assert.ok(Array.isArray(toolbox.topics) && toolbox.topics.length > 0);
    assert.ok(toolbox.topics.includes("safety"));
    assert.match(toolbox.talkTrack, /Today's talk focuses on/i);
    assert.ok(Array.isArray(toolbox.checklist) && toolbox.checklist.length >= 4);

    const digestResponse = await fetch(`${baseUrl}/sites/${encodedSiteName}/daily-digest`);
    assert.equal(digestResponse.status, 200, "Expected daily digest endpoint to return 200.");
    const digest = await digestResponse.json();
    assert.equal(digest.siteName, "Assist Test Site");
    assert.equal(digest.stats.logsToday, 1);
    assert.equal(digest.stats.openActions, 1);
    assert.equal(digest.stats.criticalEscalations, 1);
    assert.equal(digest.stats.highPriorityReports, 1);
    assert.ok(digest.recurringRisks.some((risk) => risk.includes("scaffold issue")));
    assert.match(digest.digestText, /Daily Digest \| Assist Test Site/);

    const missingSiteHandoverResponse = await fetch(
      `${baseUrl}/sites/${encodeURIComponent("Missing Assist Site")}/handover`
    );
    assert.equal(missingSiteHandoverResponse.status, 404);
  }
});

console.log("Site assist endpoints test passed.");
