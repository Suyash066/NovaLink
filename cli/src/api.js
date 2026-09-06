const { loadConfig } = require("./config");

function apiUrl() {
  // Defaults to the deployed backend so `npm install -g nova-link-cli`
  // works immediately for anyone, with no setup — override with
  // NOVA_LINK_API_URL if you're pointing at a different instance (e.g. local dev).
  return process.env.NOVA_LINK_API_URL || loadConfig()?.apiUrl || "https://backend-lmtu.onrender.com";
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
