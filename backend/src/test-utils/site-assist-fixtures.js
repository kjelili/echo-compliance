import { isoDate, isoDateTime } from "./compliance-pulse-fixtures.js";

export function createSiteAssistFixtureLogs() {
  return [
    {
      id: "assist-log-1",
      createdAt: isoDateTime(0),
      siteName: "Assist Test Site",
      foreman: "Taylor",
      updateText: "Scaffold controls pending and weather delays expected.",
      attachments: [],
      summary: "High-priority scaffold checks remain open.",
      tags: ["safety", "delay"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Assist Test Site",
        reportPriority: "High",
        executiveSummary: "High-priority scaffold checks remain open.",
        progressPoints: ["Inspection planning in progress"],
        riskWatchlist: ["Scaffold issue", "Weather delay"],
        recommendedActions: ["Close scaffold controls before handover"],
        handoverNotes: ["Escalate unresolved scaffold controls"],
        keyActivities: ["Control checks"],
        potentialRisks: ["Scaffold issue", "Weather delay"],
        photoCount: 0,
        complianceNotes: "Evidence still required."
      },
      actionItems: [
        {
          id: "assist-log-1-a1",
          description: "Close scaffold issue controls before shift handover",
          owner: "Taylor",
          dueDate: isoDate(-4),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "assist-log-2",
      createdAt: isoDateTime(-1),
      siteName: "Assist Test Site",
      foreman: "Taylor",
      updateText: "Lifting prep complete, scaffold still under review.",
      attachments: [{ filename: "proof.jpg", storedAs: "proof", mimetype: "image/jpeg", size: 1024 }],
      summary: "General progress with one closed follow-up.",
      tags: ["safety", "progress"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Assist Test Site",
        reportPriority: "Medium",
        executiveSummary: "General progress with one closed follow-up.",
        progressPoints: ["Lifting prep complete"],
        riskWatchlist: ["Scaffold issue"],
        recommendedActions: ["Confirm scaffold sign-off"],
        handoverNotes: ["Carry scaffold check to next shift if unresolved"],
        keyActivities: ["Lifting prep"],
        potentialRisks: ["Scaffold issue"],
        photoCount: 1,
        complianceNotes: "Supporting evidence available."
      },
      actionItems: [
        {
          id: "assist-log-2-a1",
          description: "Confirm scaffold sign-off and archive evidence",
          owner: "Taylor",
          dueDate: isoDate(1),
          status: "closed",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "assist-other-site",
      createdAt: isoDateTime(0),
      siteName: "Other Assist Site",
      foreman: "Morgan",
      updateText: "Routine checks complete.",
      attachments: [],
      summary: "No notable concerns.",
      tags: ["general"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Other Assist Site",
        reportPriority: "Low",
        executiveSummary: "No notable concerns.",
        progressPoints: [],
        riskWatchlist: [],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: [],
        photoCount: 0,
        complianceNotes: "Routine operations."
      },
      actionItems: []
    }
  ];
}
