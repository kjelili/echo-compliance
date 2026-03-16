import assert from "node:assert/strict";
import { withApiTestContext } from "./test-utils/pulse-api-test-context.js";
import { createActionGuardrailsFixtureLogs } from "./test-utils/action-guardrails-fixtures.js";

const [{ default: app }, { readLogs, writeLogs }] = await Promise.all([
  import("./server.js"),
  import("./storage.js")
]);

function patchAction(baseUrl, actionId, payload) {
  return fetch(`${baseUrl}/actions/${encodeURIComponent(actionId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

await withApiTestContext({
  app,
  readLogs,
  writeLogs,
  fixtureLogs: createActionGuardrailsFixtureLogs(),
  run: async ({ baseUrl }) => {
    const ownerRequiredResponse = await patchAction(baseUrl, "guard-owner-a1", {
      status: "closed",
      owner: "   "
    });
    assert.equal(ownerRequiredResponse.status, 400);
    const ownerRequiredBody = await ownerRequiredResponse.json();
    assert.match(ownerRequiredBody.error, /Owner is required before closing an action/);

    const criticalNoAckResponse = await patchAction(baseUrl, "guard-critical-a1", {
      status: "closed",
      owner: "Jordan"
    });
    assert.equal(criticalNoAckResponse.status, 400);
    const criticalNoAckBody = await criticalNoAckResponse.json();
    assert.match(criticalNoAckBody.error, /Critical actions must be acknowledged before closure/);

    const acknowledgeCriticalResponse = await patchAction(baseUrl, "guard-critical-a1", {
      escalationAcknowledged: true
    });
    assert.equal(acknowledgeCriticalResponse.status, 200);
    const acknowledgeCriticalBody = await acknowledgeCriticalResponse.json();
    assert.equal(acknowledgeCriticalBody.action.escalationAcknowledged, true);

    const criticalCloseResponse = await patchAction(baseUrl, "guard-critical-a1", {
      status: "closed",
      owner: "Jordan"
    });
    assert.equal(criticalCloseResponse.status, 200);
    const criticalCloseBody = await criticalCloseResponse.json();
    assert.equal(criticalCloseBody.action.status, "closed");

    const photoEvidenceResponse = await patchAction(baseUrl, "guard-photo-a1", {
      status: "closed",
      owner: "Jordan"
    });
    assert.equal(photoEvidenceResponse.status, 400);
    const photoEvidenceBody = await photoEvidenceResponse.json();
    assert.match(photoEvidenceBody.error, /Photo evidence is required before closing high-risk actions/);

    const successCloseResponse = await patchAction(baseUrl, "guard-success-a1", {
      status: "closed",
      owner: "Jordan"
    });
    assert.equal(successCloseResponse.status, 200);
    const successCloseBody = await successCloseResponse.json();
    assert.equal(successCloseBody.action.status, "closed");
    assert.equal(successCloseBody.action.owner, "Jordan");
  }
});

console.log("Actions guardrails test passed.");
