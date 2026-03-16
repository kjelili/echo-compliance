import { isoDate, isoDateTime } from "./compliance-pulse-fixtures.js";

export function createActionGuardrailsFixtureLogs() {
  return [
    {
      id: "guard-owner-log",
      createdAt: isoDateTime(0),
      siteName: "Guardrail Site",
      foreman: "Jordan",
      updateText: "Owner validation scenario.",
      attachments: [],
      summary: "Owner must be present before closure.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Guardrail Site",
        reportPriority: "Medium",
        executiveSummary: "Owner must be present before closure.",
        progressPoints: [],
        riskWatchlist: [],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: [],
        photoCount: 1,
        complianceNotes: "Owner check."
      },
      actionItems: [
        {
          id: "guard-owner-a1",
          description: "Set owner before closure",
          owner: "Jordan",
          dueDate: isoDate(2),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "guard-critical-log",
      createdAt: isoDateTime(-2),
      siteName: "Guardrail Site",
      foreman: "Jordan",
      updateText: "Critical acknowledgment scenario.",
      attachments: [],
      summary: "Critical actions require acknowledgment before closure.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Guardrail Site",
        reportPriority: "High",
        executiveSummary: "Critical actions require acknowledgment before closure.",
        progressPoints: [],
        riskWatchlist: ["Scaffold issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["Scaffold issue"],
        photoCount: 2,
        complianceNotes: "Acknowledgment check."
      },
      actionItems: [
        {
          id: "guard-critical-a1",
          description: "Acknowledge before critical closure",
          owner: "Jordan",
          dueDate: isoDate(-4),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "guard-photo-log",
      createdAt: isoDateTime(-1),
      siteName: "Guardrail Site",
      foreman: "Jordan",
      updateText: "Photo evidence scenario.",
      attachments: [],
      summary: "Photo evidence is required for non-normal risk closure.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Guardrail Site",
        reportPriority: "Medium",
        executiveSummary: "Photo evidence is required for non-normal risk closure.",
        progressPoints: [],
        riskWatchlist: ["Permit issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["Permit issue"],
        photoCount: 0,
        complianceNotes: "Photo evidence check."
      },
      actionItems: [
        {
          id: "guard-photo-a1",
          description: "Cannot close high-risk action without photos",
          owner: "Jordan",
          dueDate: isoDate(-1),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "guard-success-log",
      createdAt: isoDateTime(0),
      siteName: "Guardrail Site",
      foreman: "Jordan",
      updateText: "Successful closure scenario.",
      attachments: [],
      summary: "Closure succeeds with valid owner and normal reminder.",
      tags: ["progress"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Guardrail Site",
        reportPriority: "Low",
        executiveSummary: "Closure succeeds with valid owner and normal reminder.",
        progressPoints: [],
        riskWatchlist: [],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: [],
        photoCount: 0,
        complianceNotes: "Success path."
      },
      actionItems: [
        {
          id: "guard-success-a1",
          description: "Valid closure should succeed",
          owner: "Jordan",
          dueDate: isoDate(3),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    }
  ];
}
