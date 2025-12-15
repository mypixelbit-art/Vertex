export async function fetchServerInfo(serverId, apiKey) {
  const res = await fetch("https://api.oxfd.re/v1/server", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "server-id": serverId,
      "server-key": apiKey
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oxford API Error ${res.status}: ${text}`);
  }

  return await res.json();
}
