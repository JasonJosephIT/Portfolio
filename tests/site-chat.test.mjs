import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { buildSite, page } from "./helpers.mjs";

const NOTICE = "This is an AI assistant. It answers only from published work on this site. Chats are stored for 90 days. Don't share personal information.";
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ");

test("with no PUBLIC_CHAT_URL the panel is only a contact link", () => {
  const html = page(buildSite(undefined, { PUBLIC_CHAT_URL: "" }), "tech/index.html");
  const panel = html.slice(html.indexOf('id="chat"'));
  assert.ok(panel.includes('href="/#about-heading"'), "contact link");
  assert.ok(!html.includes('id="chat-form"'), "no chat form");
  assert.ok(!text(html).includes(NOTICE), "no notice");
});

test("with PUBLIC_CHAT_URL the built Tech pages carry the notice", () => {
  const out = buildSite(undefined, { PUBLIC_CHAT_URL: "http://127.0.0.1:9/chat" });
  for (const p of ["tech/index.html", "tech/alpha-tool/index.html"]) assert.ok(text(page(out, p)).includes(NOTICE), p);
});

// ---- Browser checks: Playwright against `astro preview`, the chat Worker replaced by a local stub server and
// Turnstile by a fake window.turnstile.
const calls = []; // request bodies the stub received
let reply = () => [200, { answer: "Alpha Tool sorts files.", citations: [{ title: "Alpha Tool", url: "/tech/alpha-tool" }], session: "abc123.1999999999999.ff" }];
const stub = createServer((req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") return res.end();
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    calls.push(JSON.parse(body));
    const r = reply();
    if (r === "drop") return req.socket.destroy();
    res.writeHead(r[0], { "content-type": "application/json" }).end(JSON.stringify(r[1]));
  });
});

const FAKE_TURNSTILE = `window.turnstile = { n: 0,
  render(el, o) { this.o = o; setTimeout(() => o.callback("tok" + ++this.n)); return "w1"; },
  reset() { setTimeout(() => this.o.callback("tok" + ++this.n)); } };`;

let preview, browser, base, cfHits = 0;
before(async () => {
  await new Promise((r) => stub.listen(0, "127.0.0.1", r));
  const out = buildSite(undefined, { PUBLIC_CHAT_URL: `http://127.0.0.1:${stub.address().port}/chat`, PUBLIC_TURNSTILE_SITEKEY: "test-key" });
  const port = 4400 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  preview = spawn("node", ["node_modules/astro/bin/astro.mjs", "preview", "--outDir", out, "--port", String(port), "--host", "127.0.0.1", "--ignore-lock"], { detached: true, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    if (await fetch(base).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  if (preview) process.kill(-preview.pid);
  stub.close();
});

async function open(path = "/tech", turnstile = FAKE_TURNSTILE) {
  const page = await browser.newPage();
  await page.route("https://challenges.cloudflare.com/**", (route) => (cfHits++, route.abort()));
  await page.addInitScript(turnstile);
  await page.goto(base + path);
  return page;
}
const ask = async (page, q) => {
  await page.fill("#chat-q", q);
  await page.press("#chat-q", "Enter");
};

test("a question gets an answer with a citation link; no chat request on load", async () => {
  calls.length = 0;
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await page.waitForTimeout(300);
  assert.equal(calls.length, 0, "no chat request on load or open");
  assert.ok(await page.isVisible("#chat-notice"));

  await ask(page, "What is Alpha Tool?");
  const link = page.locator("#chat-log a", { hasText: "Alpha Tool" });
  await link.waitFor();
  assert.equal(await link.getAttribute("href"), "/tech/alpha-tool");
  assert.ok(await page.locator("#chat-log").innerText().then((t) => t.includes("Alpha Tool sorts files.")));
  assert.deepEqual(calls[0], { message: "What is Alpha Tool?", history: [], turnstileToken: "tok1" });
  assert.equal(await page.isVisible("#chat-notice"), false, "notice gone after first send");
  assert.equal((await page.innerText("#chat-id")).replace(/\s+/g, " ").trim(), "Your chat id: abc123. To have it deleted, send it via the contact page.");

  await ask(page, "And then?");
  await page.locator("#chat-log > li").nth(3).waitFor();
  assert.equal(calls[1].session, "abc123.1999999999999.ff");
  assert.equal(calls[1].turnstileToken, undefined);
  assert.deepEqual(calls[1].history.map((t) => t.role), ["user", "assistant"]);
  assert.equal(cfHits, 0, "no real Turnstile call");
  await page.close();
});

test("an answer is plain text, never HTML", async () => {
  reply = () => [200, { answer: "<img src=x onerror=alert(1)>", citations: [{ title: "x", url: "javascript:alert(1)" }] }];
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await ask(page, "hi");
  await page.locator("#chat-log > li").nth(1).waitFor();
  assert.equal(await page.locator("#chat-log img").count(), 0);
  assert.equal(await page.locator("#chat-log a").count(), 0, "javascript: citation dropped");
  assert.ok((await page.innerText("#chat-log")).includes("<img src=x onerror=alert(1)>"));
  await page.close();
});

test("a 403 re-runs Turnstile once and retries", async () => {
  calls.length = 0;
  let n = 0;
  reply = () => (n++ ? [200, { answer: "ok", citations: [] }] : [403, { error: "verify" }]);
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await ask(page, "hi");
  await page.locator("#chat-log > li").nth(1).waitFor();
  assert.deepEqual(calls.map((c) => c.turnstileToken), ["tok1", "tok2"]);
  await page.close();
});

for (const [name, r] of [["503 off", () => [503, { off: true }]], ["network error", () => "drop"]]) {
  test(`${name}: the panel says unavailable with a contact link; navigation still works`, async () => {
    reply = r;
    const page = await open();
    await page.click("button[popovertarget=chat]");
    await ask(page, "hi");
    await page.locator("#chat-down").waitFor();
    assert.ok((await page.innerText("#chat-down")).includes("Chat is unavailable right now."));
    assert.equal(await page.locator("#chat-down a").getAttribute("href"), "/#about-heading");
    await page.keyboard.press("Escape");
    await page.click("nav >> text=Art");
    await page.waitForURL(base + "/art");
    await page.close();
  });
}

test("429 asks to wait", async () => {
  reply = () => [429, { error: "slow down" }];
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await ask(page, "hi");
  await page.locator("#chat-status", { hasText: "Too many questions; wait a minute." }).waitFor();
  await page.close();
});

test("the input refuses a 501st character", async () => {
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await page.fill("#chat-q", "a".repeat(500));
  await page.press("#chat-q", "End");
  await page.keyboard.type("b");
  assert.equal((await page.inputValue("#chat-q")).length, 500);
  await page.close();
});

test("keyboard only: open, type, send, read the answer, close", async () => {
  reply = () => [200, { answer: "Keyboard answer.", citations: [{ title: "Alpha Tool", url: "/tech/alpha-tool" }] }];
  const page = await open();
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("popovertarget") ?? document.activeElement?.id);
  for (let i = 0; i < 80 && (await focused()) !== "chat"; i++) await page.keyboard.press("Tab");
  assert.equal(await focused(), "chat", "chat button reachable by Tab");
  await page.keyboard.press("Enter");
  assert.equal(await focused(), "chat-q", "input focused on open");
  await page.keyboard.type("What is Alpha Tool?");
  await page.keyboard.press("Enter");
  await page.locator("#chat-log", { hasText: "Keyboard answer." }).waitFor();
  assert.equal(await focused(), "chat-q", "focus back in the input to read on or ask again");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.getElementById("chat").matches(":popover-open")), false);
  await page.close();
});

for (const [name, fake] of [
  ["never calls back", `window.CHAT_TS_MS = 300; window.turnstile = { render() { return "w1"; }, reset() {} };`],
  ["render throws", `window.turnstile = { render() { throw new Error("boom"); }, reset() {} };`],
  ["fires timeout-callback", `window.turnstile = { render(el, o) { setTimeout(() => o["timeout-callback"]()); return "w1"; }, reset() {} };`],
]) {
  test(`Turnstile ${name}: unavailable, and Send works again`, async () => {
    calls.length = 0;
    const page = await open("/tech", fake);
    await page.click("button[popovertarget=chat]");
    await ask(page, "hi");
    await page.locator("#chat-down").waitFor();
    assert.equal(await page.isDisabled("#chat-form button[type=submit]"), false);
    assert.equal(calls.length, 0, "no chat request without a token");
    await page.close();
  });
}

test("a malformed citation is skipped; the answer and good citations still show", async () => {
  reply = () => [200, { answer: "Still here.", citations: [null, { title: 5, url: "/x" }, { title: "bad", url: "http://[" }, { title: "obj", url: {} }, { title: "Good", url: "/tech/alpha-tool" }] }];
  const page = await open();
  await page.click("button[popovertarget=chat]");
  await ask(page, "hi");
  await page.locator("#chat-log", { hasText: "Still here." }).waitFor();
  assert.deepEqual(await page.locator("#chat-log a").allInnerTexts(), ["Good"]);
  assert.equal(await page.isVisible("#chat-down"), false);
  await page.close();
});
