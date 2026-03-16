process.env.VERCEL = "1";

export function isoDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

export function isoDateTime(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

export function createCoreFixtureLogs() {
  return [
    {
      id: "pulse-log-1",
      createdAt: isoDateTime(-1),
      siteName: "Pulse Test Site",
      foreman: "Alex",
      updateText: "Scaffold checks pending; electrical cable routing delayed.",
      attachments: [],
      summary: "Scaffold and cable risks need closure checks.",
      tags: ["safety", "delay"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Pulse Test Site",
        reportPriority: "High",
        executiveSummary: "Scaffold and cable risks need closure checks.",
        progressPoints: ["Inspections started"],
        riskWatchlist: ["Scaffold edge protection gap", "Electrical cable routing risk"],
        recommendedActions: ["Complete scaffold edge reinspection"],
        handoverNotes: ["Night shift to verify control barriers"],
        keyActivities: ["Inspection prep"],
        potentialRisks: ["Scaffold edge protection gap", "Electrical cable routing risk"],
        photoCount: 0,
        complianceNotes: "Evidence capture incomplete."
      },
      actionItems: [
        {
          id: "pulse-log-1-a1",
          description: "Close scaffold control gap before work at height resumes",
          owner: "Alex",
          dueDate: isoDate(-4),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        },
        {
          id: "pulse-log-1-a2",
          description: "Verify electrical isolation permit and cable route",
          owner: "Alex",
          dueDate: isoDate(1),
          status: "open",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "pulse-log-2",
      createdAt: isoDateTime(-2),
      siteName: "Pulse Test Site",
      foreman: "Alex",
      updateText: "Lifting plan reviewed, scaffold punch list still open.",
      attachments: [{ filename: "img.jpg", storedAs: "img", mimetype: "image/jpeg", size: 1111 }],
      summary: "Lifting plan reviewed with residual scaffold actions.",
      tags: ["progress", "safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Pulse Test Site",
        reportPriority: "Medium",
        executiveSummary: "Lifting plan reviewed with residual scaffold actions.",
        progressPoints: ["Lifting plan reviewed"],
        riskWatchlist: ["Scaffold edge protection gap"],
        recommendedActions: ["Complete scaffold punch list"],
        handoverNotes: ["Confirm barriers before shift start"],
        keyActivities: ["Lifting prep"],
        potentialRisks: ["Scaffold edge protection gap"],
        photoCount: 1,
        complianceNotes: "Controls partly verified."
      },
      actionItems: [
        {
          id: "pulse-log-2-a1",
          description: "Finalize scaffold punch list and sign off",
          owner: "Alex",
          dueDate: isoDate(2),
          status: "in_progress",
          escalationAcknowledged: false,
          acknowledgedAt: null
        }
      ]
    },
    {
      id: "other-site-log-1",
      createdAt: isoDateTime(-1),
      siteName: "Other Site",
      foreman: "Jo",
      updateText: "Routine update.",
      attachments: [],
      summary: "Routine update.",
      tags: ["general"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Other Site",
        reportPriority: "Low",
        executiveSummary: "Routine update.",
        progressPoints: [],
        riskWatchlist: [],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: [],
        photoCount: 0,
        complianceNotes: "No risks."
      },
      actionItems: []
    }
  ];
}

export function createTrendFixtureLogs() {
  return [
    {
      id: "trend-up-1",
      createdAt: isoDateTime(-2),
      siteName: "Trend Up Site",
      foreman: "Sam",
      updateText: "Recent spike in risks.",
      attachments: [],
      summary: "Recent risk spike observed.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Up Site",
        reportPriority: "Medium",
        executiveSummary: "Recent risk spike observed.",
        progressPoints: [],
        riskWatchlist: ["scaffold issue", "electrical hazard", "lifting risk"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["scaffold issue", "electrical hazard", "lifting risk"],
        photoCount: 0,
        complianceNotes: "Watchlist increased."
      },
      actionItems: []
    },
    {
      id: "trend-up-2",
      createdAt: isoDateTime(-9),
      siteName: "Trend Up Site",
      foreman: "Sam",
      updateText: "Earlier period had fewer risks.",
      attachments: [],
      summary: "Earlier risk level lower.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Up Site",
        reportPriority: "Low",
        executiveSummary: "Earlier risk level lower.",
        progressPoints: [],
        riskWatchlist: ["scaffold issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["scaffold issue"],
        photoCount: 0,
        complianceNotes: "Baseline period."
      },
      actionItems: []
    },
    {
      id: "trend-down-1",
      createdAt: isoDateTime(-2),
      siteName: "Trend Down Site",
      foreman: "Rae",
      updateText: "Recent period improved.",
      attachments: [],
      summary: "Recent risk mentions decreased.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Down Site",
        reportPriority: "Low",
        executiveSummary: "Recent risk mentions decreased.",
        progressPoints: [],
        riskWatchlist: ["housekeeping issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["housekeeping issue"],
        photoCount: 0,
        complianceNotes: "Improving trend."
      },
      actionItems: []
    },
    {
      id: "trend-down-2",
      createdAt: isoDateTime(-10),
      siteName: "Trend Down Site",
      foreman: "Rae",
      updateText: "Previous period had many risks.",
      attachments: [],
      summary: "Previous risk mentions were higher.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Down Site",
        reportPriority: "High",
        executiveSummary: "Previous risk mentions were higher.",
        progressPoints: [],
        riskWatchlist: ["scaffold issue", "electrical hazard", "lifting risk"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["scaffold issue", "electrical hazard", "lifting risk"],
        photoCount: 0,
        complianceNotes: "Historic pressure."
      },
      actionItems: []
    },
    {
      id: "trend-stable-1",
      createdAt: isoDateTime(-3),
      siteName: "Trend Stable Site",
      foreman: "Kim",
      updateText: "Recent period baseline.",
      attachments: [],
      summary: "Risk mentions unchanged.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Stable Site",
        reportPriority: "Low",
        executiveSummary: "Risk mentions unchanged.",
        progressPoints: [],
        riskWatchlist: ["permit control issue", "access route issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["permit control issue", "access route issue"],
        photoCount: 0,
        complianceNotes: "Stable trend."
      },
      actionItems: []
    },
    {
      id: "trend-stable-2",
      createdAt: isoDateTime(-11),
      siteName: "Trend Stable Site",
      foreman: "Kim",
      updateText: "Previous period baseline.",
      attachments: [],
      summary: "Risk mentions unchanged.",
      tags: ["safety"],
      structured: {
        reportHeadline: "Daily Compliance Brief - Trend Stable Site",
        reportPriority: "Low",
        executiveSummary: "Risk mentions unchanged.",
        progressPoints: [],
        riskWatchlist: ["permit control issue", "access route issue"],
        recommendedActions: [],
        handoverNotes: [],
        keyActivities: [],
        potentialRisks: ["permit control issue", "access route issue"],
        photoCount: 0,
        complianceNotes: "Stable trend."
      },
      actionItems: []
    }
  ];
}
