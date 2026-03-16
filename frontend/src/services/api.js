const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return response.json();
}

export async function createLog(payload) {
  const formData = new FormData();
  formData.append("siteName", payload.siteName);
  formData.append("foreman", payload.foreman);
  formData.append("updateText", payload.updateText);

  for (const file of payload.photos ?? []) {
    formData.append("photos", file);
  }

  const response = await fetch(`${API_BASE}/logs`, {
    method: "POST",
    body: formData
  });
  return handleResponse(response);
}

export async function fetchLogs(query = "") {
  const response = await fetch(`${API_BASE}/logs?search=${encodeURIComponent(query)}`);
  return handleResponse(response);
}

export async function exportPdf(logId) {
  const response = await fetch(`${API_BASE}/logs/${logId}/export-pdf`);
  if (!response.ok) {
    throw new Error("Could not export PDF");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `echo-compliance-${logId}.pdf`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function fetchEmailSummary(logId) {
  const response = await fetch(`${API_BASE}/logs/${logId}/email-summary`);
  return handleResponse(response);
}

export async function fetchDailyBrief(logId) {
  const response = await fetch(`${API_BASE}/logs/${logId}/daily-brief`);
  return handleResponse(response);
}

export async function fetchActions(params = {}) {
  const query = new URLSearchParams();
  if (params.siteName) {
    query.set("siteName", params.siteName);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.overdueOnly) {
    query.set("overdueOnly", "true");
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE}/actions${suffix}`);
  return handleResponse(response);
}

export async function updateAction(actionId, payload) {
  const response = await fetch(`${API_BASE}/actions/${actionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function acknowledgeCriticalActions(siteName) {
  const response = await fetch(`${API_BASE}/actions/acknowledge-critical`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ siteName })
  });
  return handleResponse(response);
}

export async function fetchHandover(siteName) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteName)}/handover`);
  return handleResponse(response);
}

export async function fetchToolboxTalk(siteName) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteName)}/toolbox-talk`);
  return handleResponse(response);
}

export async function fetchDailyDigest(siteName) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteName)}/daily-digest`);
  return handleResponse(response);
}

export async function fetchCompliancePulse(siteName) {
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteName)}/compliance-pulse`);
  return handleResponse(response);
}

export async function fetchInsights() {
  const response = await fetch(`${API_BASE}/insights`);
  return handleResponse(response);
}
