const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

function stripTrailingSlash(value) {
  return (value || "").replace(/\/+$/, "");
}

function getDerivedVercelApiBase() {
  if (typeof window === "undefined") {
    return "";
  }

  const host = window.location.hostname;
  if (!host.endsWith(".vercel.app")) {
    return "";
  }

  const hostParts = host.split(".");
  if (hostParts.length < 3) {
    return "";
  }

  const currentSubdomain = hostParts[0];
  const fallbackSubdomain = currentSubdomain.replace(/-frontend$/, "");
  if (!fallbackSubdomain || fallbackSubdomain === currentSubdomain) {
    return "";
  }

  return `https://${fallbackSubdomain}.vercel.app/api`;
}

function getApiBases() {
  const bases = [DEFAULT_API_BASE];
  if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE) {
    const fallback = getDerivedVercelApiBase();
    if (fallback) {
      bases.push(fallback);
    }
  }

  const normalized = [];
  for (const base of bases) {
    const clean = stripTrailingSlash(base);
    if (clean && !normalized.includes(clean)) {
      normalized.push(clean);
    }
  }

  return normalized;
}

async function readErrorText(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await response.json();
      if (body?.error) {
        return body.error;
      }
      return JSON.stringify(body);
    } catch {
      return "Request failed";
    }
  }

  const text = await response.text();
  return text || "Request failed";
}

async function fetchWithApiFallback(path, options = {}) {
  const apiBases = getApiBases();
  let lastError = "Request failed";

  for (let index = 0; index < apiBases.length; index += 1) {
    const base = apiBases[index];
    const response = await fetch(`${base}${path}`, options);
    if (response.ok) {
      return response;
    }

    const errorText = await readErrorText(response);
    const isPrimaryCall = index === 0;
    const hasFallback = apiBases.length > 1;
    const isVercelNotFound = response.status === 404 && /NOT_FOUND/i.test(errorText);

    if (isPrimaryCall && hasFallback && isVercelNotFound) {
      lastError = "Primary API endpoint not found; trying fallback.";
      continue;
    }

    lastError = errorText;
    break;
  }

  throw new Error(lastError);
}

export async function createLog(payload) {
  const formData = new FormData();
  formData.append("siteName", payload.siteName);
  formData.append("foreman", payload.foreman);
  formData.append("updateText", payload.updateText);

  for (const file of payload.photos ?? []) {
    formData.append("photos", file);
  }

  const response = await fetchWithApiFallback("/logs", {
    method: "POST",
    body: formData
  });
  return response.json();
}

export async function fetchLogs(query = "") {
  const response = await fetchWithApiFallback(`/logs?search=${encodeURIComponent(query)}`);
  return response.json();
}

export async function exportPdf(logId) {
  const response = await fetchWithApiFallback(`/logs/${logId}/export-pdf`);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `echo-compliance-${logId}.pdf`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function fetchEmailSummary(logId) {
  const response = await fetchWithApiFallback(`/logs/${logId}/email-summary`);
  return response.json();
}

export async function fetchDailyBrief(logId) {
  const response = await fetchWithApiFallback(`/logs/${logId}/daily-brief`);
  return response.json();
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
  const response = await fetchWithApiFallback(`/actions${suffix}`);
  return response.json();
}

export async function updateAction(actionId, payload) {
  const response = await fetchWithApiFallback(`/actions/${actionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function acknowledgeCriticalActions(siteName) {
  const response = await fetchWithApiFallback("/actions/acknowledge-critical", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ siteName })
  });
  return response.json();
}

export async function fetchHandover(siteName) {
  const response = await fetchWithApiFallback(`/sites/${encodeURIComponent(siteName)}/handover`);
  return response.json();
}

export async function fetchToolboxTalk(siteName) {
  const response = await fetchWithApiFallback(`/sites/${encodeURIComponent(siteName)}/toolbox-talk`);
  return response.json();
}

export async function fetchDailyDigest(siteName) {
  const response = await fetchWithApiFallback(`/sites/${encodeURIComponent(siteName)}/daily-digest`);
  return response.json();
}

export async function fetchCompliancePulse(siteName) {
  const response = await fetchWithApiFallback(`/sites/${encodeURIComponent(siteName)}/compliance-pulse`);
  return response.json();
}

export async function fetchInsights() {
  const response = await fetchWithApiFallback("/insights");
  return response.json();
}
