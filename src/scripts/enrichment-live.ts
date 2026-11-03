import { portfolioError, publicUrl, standard } from "../../standards/portfolio.mjs";

export function connectPortfolio(element: HTMLElement) {
  const base = element.dataset.cloudBase?.replace(/\/$/, "");
  const slug = element.dataset.projectSlug;
  if (!base || !slug) return;
  try { const u = new URL(base); if (u.protocol !== "https:") return; } catch { return; }
  let closed = false, hasLive = false, version = "", socket: WebSocket | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  let backoff = 1000, generation = 0;
  const render = (portfolio: any) => {
    for (const definition of standard.sections) {
      const parent = element.querySelector(`[data-section-key="${definition.key}"] [data-section-fields]`);
      if (!parent) continue;
      const nodes = Object.entries(definition.fields).map(([key, label]) => {
        const value = portfolio.sections[definition.key].fields[key];
        const row = document.createElement("div"); row.className = "grid gap-2"; row.dataset.fieldKey = key;
        const dt = document.createElement("dt"); dt.className = "label"; dt.textContent = String(label);
        const dd = document.createElement("dd"); dd.className = "text-[1.03rem] leading-relaxed whitespace-pre-line";
        const link = (definition.key === "links" && key === "resources") || (definition.key === "overview" && key === "demo_or_image");
        if (link && value.trim()) {
          for (const url of value.split("\n").map((v: string) => v.trim()).filter(publicUrl)) {
            const a = document.createElement("a"); a.href = url; a.textContent = url; a.className = "text-link block break-all"; a.target = "_blank"; a.rel = "noopener noreferrer"; dd.append(a);
          }
        } else if (value.trim()) dd.textContent = value;
        else { const missing = document.createElement("span"); missing.className = "text-muted-text"; missing.textContent = "Not yet documented."; dd.append(missing); }
        row.append(dt, dd); return row;
      });
      parent.replaceChildren(...nodes);
    }
  };
  const refresh = async () => {
    const request = ++generation;
    try {
      const r = await fetch(`${base}/v1/records/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (closed || request !== generation) return;
      if (r.status === 404) {
        if (hasLive) {
          element.querySelectorAll<HTMLElement>("section").forEach((s) => { s.hidden = true; });
          if (!element.querySelector("[data-unavailable]")) {
            const message = document.createElement("p"); message.dataset.unavailable = "true"; message.textContent = "This case study is no longer available."; element.prepend(message);
          }
        }
        return;
      }
      if (!r.ok) return;
      const record = await r.json();
      if (closed || request !== generation || record.slug !== slug || typeof record.approved_at !== "string" || portfolioError(record.portfolio)) return;
      hasLive = true;
      element.querySelector("[data-unavailable]")?.remove();
      element.querySelectorAll<HTMLElement>("section").forEach((s) => { s.hidden = false; });
      render(record.portfolio);
      element.dataset.liveEnrichment = "connected";
    } catch { /* The reviewed bundle remains readable offline. */ }
  };
  const connect = () => {
    if (closed) return;
    socket = new WebSocket(base.replace("https://", "wss://") + "/v1/stream");
    socket.onopen = () => { backoff = 1000; };
    socket.onmessage = ({ data }) => {
      if (data === "pong") return;
      try {
        const event = JSON.parse(data);
        if ((event.type === "ready" || event.type === "snapshot") && event.version !== version) {
          version = event.version; void refresh();
        }
      } catch { /* Ignore messages outside the versioned notification protocol. */ }
    };
    socket.onclose = () => { if (!closed) { retry = setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000); } };
    socket.onerror = () => socket?.close();
  };
  const heartbeat = setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send("ping"); }, 25000);
  const online = () => { version = ""; void refresh(); };
  const visible = () => { if (document.visibilityState === "visible") online(); };
  window.addEventListener("online", online);
  document.addEventListener("visibilitychange", visible);
  window.addEventListener("pagehide", () => {
    closed = true; clearInterval(heartbeat); clearTimeout(retry); socket?.close();
    window.removeEventListener("online", online); document.removeEventListener("visibilitychange", visible);
  }, { once: true });
  void refresh(); connect();
}
