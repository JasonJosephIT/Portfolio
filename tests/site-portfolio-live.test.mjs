import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { buildSite } from "./helpers.mjs";
import { legacyPortfolio } from "../standards/portfolio.mjs";

let chromium;
try { ({chromium} = createRequire(process.env.PLAYWRIGHT_FROM ?? new URL("../package.json", import.meta.url))("playwright")); }
catch(e) { if(process.env.PLAYWRIGHT_FROM) throw e; console.warn("portfolio-live browser checks skipped: Playwright unavailable"); }
const browserTest = chromium ? test : test.skip;
const cloud = "https://open-thoughts-enrichment.slothdev-joseph.workers.dev";
let browser, preview, base;
before(async()=>{
  if(!chromium)return;
  const out = buildSite();
  const port = 4900 + Math.floor(Math.random()*300);
  base = "http://127.0.0.1:"+port;
  preview=spawn("node",["node_modules/astro/bin/astro.mjs","preview","--outDir",out,"--port",String(port),"--host","127.0.0.1","--ignore-lock"],{detached:true,stdio:"ignore"});
  for(let i=0;i<100;i++) {if(await fetch(base).then(r=>r.ok,()=>false))break;await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch().catch(e=>{
    if(!/Executable doesn't exist/.test(e.message))throw e;
    const cache=join(homedir(),"Library/Caches/ms-playwright");
    const dir=readdirSync(cache).filter(d=>d.startsWith("chromium_headless_shell-")).sort().at(-1);
    return chromium.launch({executablePath:join(cache,dir,"chrome-headless-shell-mac-arm64/chrome-headless-shell")});
  });
});
after(async()=>{await browser?.close();if(preview)process.kill(-preview.pid);});
const fakeStream = `window.__streams=[];
window.WebSocket=class {
 static OPEN=1;
 constructor(){this.readyState=1;window.__streams.push(this);setTimeout(()=>this.onopen?.({}),0)}
 send(value){if(value==="ping")this.onmessage?.({data:"pong"})}
 close(){this.readyState=3;this.onclose?.({})}
};`;
function record(text="I built the sorter.") {
 const r={slug:"alpha-tool",name:"Alpha Tool",summary:"A sorter.",approved_at:"2026-10-19T00:00:00Z"};
 r.portfolio=legacyPortfolio(r);
 r.portfolio.sections.role_scope={fields:{ownership:text,team:"Solo project",timeline:"October 2026"},status:"reviewed",source_refs:["author:alpha-tool"],missing_fields:[]};
 return r;
}
async function open(){
 const page=await browser.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(fakeStream);
 let current=record(),code=200;
 await page.route(cloud+"/v1/records/alpha-tool",route=>route.fulfill({status:code,headers:{"content-type":"application/json","access-control-allow-origin":"*"},body:JSON.stringify(current)}));
 await page.goto(base+"/tech/alpha-tool");
 await page.waitForSelector('[data-live-enrichment="connected"]');
 return {page,errors,set:(r,status=200)=>{current=r;code=status},emit:version=>page.evaluate(v=>window.__streams.at(-1).onmessage({data:JSON.stringify({type:"snapshot",version:v})}),version)};
}
browserTest("a cloud notification updates the visible case study; withdrawn records hide and can return",async()=>{
 const c=await open();
 const ownership=c.page.locator('[data-section-key="role_scope"] [data-field-key="ownership"] dd');
 assert.equal(await ownership.innerText(),"I built the sorter.");
 c.set(record("I built the live UI."));
 await c.emit("v2");
 await ownership.filter({hasText:"I built the live UI."}).waitFor();
 c.set({},404);await c.emit("v3");
 await c.page.getByText("This case study is no longer available.").waitFor();
 assert.equal(await c.page.locator('[data-section-key="role_scope"]').isVisible(),false);
 c.set(record("Restored approved case study."));await c.emit("v4");
 await ownership.filter({hasText:"Restored approved case study."}).waitFor();
 assert.equal(await c.page.locator('[data-section-key="role_scope"]').isVisible(),true);
 assert.deepEqual(c.errors,[]);
 await c.page.close();
});
browserTest("live values stay plain text, draft updates are ignored, and the mobile page stays within the viewport",async()=>{
 const c=await open();
 c.set(record('<img src=x onerror="alert(1)">'));
 await c.emit("plain-text");
 await c.page.getByText('<img src=x onerror="alert(1)">',{exact:true}).waitFor();
 assert.equal(await c.page.locator("[data-portfolio] img").count(),0);
 const draft=record("UNREVIEWED LIVE CHANGE");draft.portfolio.sections.role_scope.status="draft";
 c.set(draft);await c.emit("draft");
 await c.page.waitForTimeout(150);
 assert.equal(await c.page.getByText("UNREVIEWED LIVE CHANGE").count(),0);
 await c.page.setViewportSize({width:390,height:844});
 assert.equal(await c.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.equal(await c.page.locator("[data-section-key]").count(),8);
 assert.deepEqual(c.errors,[]);
 await c.page.close();
});
