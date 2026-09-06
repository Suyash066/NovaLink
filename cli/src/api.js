const { loadConfig } = require("./config");

function apiUrl() {
  return process.env.NOVA_LINK_API_URL || loadConfig()?.apiUrl || "http://localhost:4000";
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const cfg = loadConfig();
    if (!cfg?.accessToken) {
      throw new Error("Not logged in. Run `nova-link login` first.");
    }
    headers.Authorization = `Bearer ${cfg.accessToken}`;
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

module.exports = { request, apiUrl };
