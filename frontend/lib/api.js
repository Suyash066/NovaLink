const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with ${res.status}`);
  }
  return data;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  listProjects: () => request("/projects"),
  getProject: (projectId) => request(`/projects/${projectId}`),
  createProject: (payload) => request("/projects", { method: "POST", body: payload }),
  listChannels: (projectId) => request(`/projects/${projectId}/channels`),
  createChannel: (projectId, payload) =>
    request(`/projects/${projectId}/channels`, { method: "POST", body: payload }),
  listMembers: (projectId) => request(`/projects/${projectId}/members`),
  setMemberRole: (projectId, payload) =>
    request(`/projects/${projectId}/members`, { method: "PATCH", body: payload }),
  getRepoFiles: (projectId) => request(`/projects/${projectId}/commits/latest/files`),
  getRepoFile: (projectId, path) =>
    request(`/projects/${projectId}/commits/latest/file?path=${encodeURIComponent(path)}`),
  updateRepoFile: (projectId, payload) =>
    request(`/projects/${projectId}/commits/latest/file`, { method: "PUT", body: payload }),
  getChannelHistory: (channelId) => request(`/channels/${channelId}/messages`),
  requestAiSuggestion: (payload) => request("/ai/suggest", { method: "POST", body: payload }),
};

export { getToken, API_URL };
