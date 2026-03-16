# API Reference

Base URL: `http://localhost:4000/api`

## `GET /health`
Health check endpoint.

### Response
```json
{ "status": "ok" }
```

## `GET /logs?search=<term>&page=<n>&pageSize=<n>`
Returns all logs or filtered logs.

### Query Params
- `search` (optional)
- `page` (optional, default `1`)
- `pageSize` (optional, default `20`, max `100`)

### Response
```json
{
  "logs": [
    {
      "id": "uuid",
      "siteName": "Canary Wharf",
      "foreman": "Ife",
      "summary": "Foundation works complete...",
      "tags": ["progress", "delay"],
      "structured": {
        "reportHeadline": "Daily Compliance Brief - Canary Wharf",
        "reportPriority": "High",
        "executiveSummary": "Foundation works complete...",
        "riskWatchlist": ["risk near scaffold"],
        "recommendedActions": ["Reinspect scaffold zones..."],
        "photoCount": 1
      },
      "actionItems": [
        {
          "id": "uuid-a1",
          "description": "Reinspect scaffold zones...",
          "owner": "Ife",
          "dueDate": "2026-03-16",
          "status": "open",
          "reminderLevel": "normal"
        }
      ],
      "createdAt": "ISO_DATE"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

## `POST /logs`
Creates a new log.

### Form Fields
- `siteName` (string, required)
- `foreman` (string, required)
- `updateText` (string, required)
- `photos` (file[], optional, max 6)

### Response
```json
{
  "log": {
    "id": "uuid",
    "siteName": "Site A",
    "foreman": "Foreman Name",
    "summary": "Generated summary"
  }
}
```

## `GET /logs/:id/export-pdf`
Downloads a PDF file for a single log.

## `GET /logs/:id/email-summary`
Returns email-ready subject/body content for a single log.

### Response
```json
{
  "subject": "Daily Site Report - Site A - 3/14/2026",
  "body": "Site: Site A\nForeman: ..."
}
```

## `GET /logs/:id/daily-brief`
Returns concise handover-ready brief text.

### Response
```json
{
  "brief": "Daily Brief | Site A | 3/15/2026\nForeman: John | Priority: High\n..."
}
```

## `GET /actions?siteName=<name>&status=<status>&overdueOnly=true&page=<n>&pageSize=<n>`
Returns action items across logs (optionally filtered).

### Query Params
- `siteName` (optional)
- `status` (optional): `open`, `in_progress`, `closed`
- `overdueOnly` (optional): `true` or `false`
- `page` (optional, default `1`)
- `pageSize` (optional, default `25`, max `100`)

### Response
```json
{
  "actions": [
    {
      "id": "uuid-a1",
      "description": "Review blocker causes...",
      "owner": "John",
      "dueDate": "2026-03-16",
      "status": "open",
      "overdue": false,
      "overdueDays": 0,
      "reminderLevel": "normal",
      "escalationAcknowledged": false,
      "acknowledgedAt": null,
      "logId": "uuid",
      "siteName": "Newcastle Park",
      "reportPriority": "Medium"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 17,
    "totalPages": 1
  }
}
```

## `PATCH /actions/:id`
Updates a single action item.

### JSON Body (any subset)
- `status` (`open` | `in_progress` | `closed`)
- `owner` (string)
- `dueDate` (`YYYY-MM-DD`)
- `escalationAcknowledged` (`true` | `false`)

### Close-out guardrails
- Closing requires a non-empty owner.
- Closing a critical action requires prior escalation acknowledgment.
- Closing non-normal risk actions requires photo evidence on the parent log.

### Response
```json
{
  "action": {
    "id": "uuid-a1",
    "description": "Review blocker causes...",
    "owner": "John",
    "dueDate": "2026-03-16",
    "status": "closed",
    "reminderLevel": "normal"
  }
}
```

## `POST /actions/acknowledge-critical`
Bulk-acknowledges all unacknowledged critical escalations (optionally scoped to one site).

### JSON Body
- `siteName` (optional string)

### Response
```json
{
  "updatedCount": 3
}
```

## `GET /sites/:siteName/handover`
Returns a generated handover package for a specific site.

## `GET /sites/:siteName/toolbox-talk`
Returns toolbox talk draft topics, talk track, and checklist for a specific site.

## `GET /sites/:siteName/daily-digest`
Returns a daily site digest summary with action escalation statistics.

### Response
```json
{
  "siteName": "Newcastle Park",
  "generatedAt": "ISO_DATE",
  "stats": {
    "logsToday": 2,
    "openActions": 5,
    "criticalEscalations": 1,
    "highPriorityReports": 1
  },
  "recurringRisks": ["delay in transformer delivery (2)"],
  "digestText": "Daily Digest | Newcastle Park | 3/15/2026\n..."
}
```

## `GET /sites/:siteName/compliance-pulse`
Returns predictive compliance-readiness analytics for one site, including SLA pressure, evidence gaps, and risk momentum.

### Response
```json
{
  "siteName": "Newcastle Park",
  "generatedAt": "ISO_DATE",
  "score": 74,
  "grade": "B",
  "metrics": {
    "openActions": 9,
    "overdueOpen": 2,
    "criticalPending": 1,
    "dueIn48Hours": 3,
    "evidenceGapHighPriority": 1,
    "recentClosed": 4
  },
  "riskMomentum": {
    "trend": "up",
    "recentMentions": 7,
    "previousMentions": 4,
    "delta": 3
  },
  "attentionZones": [
    { "zone": "working-at-height", "count": 2 }
  ],
  "recommendedFocus": [
    "Resolve 1 critical escalations before next shift."
  ],
  "briefingText": "Compliance Pulse | Newcastle Park | ..."
}
```

## `GET /insights`
Returns recurring risks/tags and evidence gaps.
