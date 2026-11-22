const projects = [
  {id:'open-thoughts',name:'Open Thoughts',title:'A place to see<br>how you think.',summary:'A personal desktop workspace for connecting projects, notes, and the ideas between them.',tag:'Desktop app / Personal knowledge',paper:'#d6e4d9',dark:'#183d3b',wash:'#b5cec1',accent:'#377665',symbol:'✳',
    featureTitle:'See the connections.<br>Keep the context.',feature:'Move between the projects you work on and the notes that explain them. Connections give each idea a place in the bigger picture.',items:[['Projects','A home for the work as it develops.'],['Notes','The thinking behind the work.'],['Connections','Follow an idea into another project.']],
    demoTitle:'Follow an idea',demoText:'Try a small, illustrative connection explorer. Select a topic to see a related thread.',decisions:[['Desktop first','Bring personal streams into one workspace.'],['Keep the context','Connections should help explain why two things belong together.'],['Choose what to share','A public project story is a deliberate selection.']]},
  {id:'know-your-vote',name:'Know Your Vote',title:'Your ballot.<br>A clearer view.',summary:'A nonpartisan Florida voter guide that brings races, candidate information, and voting logistics together.',tag:'Web app / Civic information',paper:'#e0e4f0',dark:'#263963',wash:'#b9c6df',accent:'#4b68a0',symbol:'◉',
    featureTitle:'Go from an address<br>to the whole ballot.',feature:'Explore the races that matter to a voter, then move deeper into candidate coverage and the practical details of voting.',items:[['Find your races','Start with the area where you vote.'],['Compare candidates','Read information side by side.'],['Plan your vote','Keep deadlines and logistics within reach.']],
    demoTitle:'Explore a sample ballot',demoText:'An illustrative ballot with fictional races. Select a race to see how the information could unfold.',decisions:[['Address over ZIP','Voting districts need more precision than postal boundaries.'],['Show sources','Make the information traceable to its origin.'],['Keep the task clear','Help people understand a ballot and plan their vote.']]},
  {id:'portfolio',name:'Portfolio',title:'One person.<br>Two ways of seeing.',summary:'Photography and software, brought together through light, structure, and the work itself.',tag:'Personal site / Photography & software',paper:'#eadcc5',dark:'#463726',wash:'#d1bda0',accent:'#9c6536',symbol:'◐',
    featureTitle:'Explore across.<br>Look deeper below.',feature:'Move sideways to another project. Stay with a project and scroll downward through its features, images, and decisions.',items:[['Art','Photographs given space to be seen.'],['Tech','Projects explained through their details.'],['One identity','Warm and cool halves of the same portrait.']],
    demoTitle:'Two halves, one frame',demoText:'Try the warm and cool views in this small visual sample.',decisions:[['Give the work room','A large active project carries the page.'],['Two directions','Horizontal movement changes projects; vertical movement explores them.'],['Keep your place','Each project remembers the section you were reading.']]}
];
const mode = new URLSearchParams(location.search).get('view') === 'rail' ? 'rail' : 'panels';
document.body.dataset.view = mode;
document.querySelector(`[data-mode="${mode}"]`).setAttribute('aria-current','page');
document.title = `${mode === 'panels' ? 'A · Project panels' : 'B · Project shelf'} · JASON`;
const track = document.querySelector('#track');
const shelf = document.querySelector('#shelf');
const sectionLabels = ['Overview','Features','Try it','Decisions'];
const style = p => `--paper:${p.paper};--dark:${p.dark};--wash:${p.wash};--accent:${p.accent}`;
function visual(p) {
  if(p.id === 'open-thoughts') return `<div class="thought-map"><svg viewBox="0 0 300 300" aria-hidden="true"><g stroke="#377665" stroke-width="1" opacity=".4"><path d="M150 150 54 60M150 150 252 87M150 150 57 249M150 150 243 246M54 60 252 87M57 249 243 246"/></g></svg><span class="node center">Open Thoughts</span><span class="node one">Projects</span><span class="node two">Notes</span><span class="node three">Ideas</span><span class="node four">Public work</span></div>`;
  if(p.id === 'know-your-vote') return `<div class="ballot"><strong>Your ballot,<br>at a glance.</strong><div class="ballot-row selected"><span class="ballot-dot"></span>Local races</div><div class="ballot-row"><span class="ballot-dot"></span>Candidate coverage</div><div class="ballot-row"><span class="ballot-dot"></span>Voting information</div></div>`;
  return `<div class="diptych-art"><span>Art</span><span>Tech</span></div>`;
}
track.innerHTML = projects.map((p,i)=>`<article class="project" style="${style(p)}" data-project="${i}" aria-label="${p.name}"><header class="project-header"><span class="project-name">${p.name}</span><span class="section-name">Overview</span></header><div class="project-scroll" tabindex="0" aria-label="${p.name} sections">
<section class="chapter" data-section="0"><div class="intro-layout"><div><span class="project-tag">${p.tag}</span><h1>${p.title}</h1><p>${p.summary}</p><div class="scroll-cue"><span>↓</span>Scroll within this project</div></div><div class="visual" role="img" aria-label="Illustrative ${p.name} concept">${visual(p)}<span class="visual-caption">Visual concept</span></div></div></section>
<section class="chapter" data-section="1"><p class="caption">Features</p><h2>${p.featureTitle}</h2><div class="feature-surface"><div><p>${p.feature}</p><div class="feature-note"><h3>The detail is the story.</h3><p>Keep scrolling here to explore ${p.name}. The neighboring projects stay where they are.</p></div></div><div class="example-list">${p.items.map(([a,b])=>`<div>${a}<small>${b}</small></div>`).join('')}</div></div></section>
<section class="chapter" data-section="2"><p class="caption">See it working</p><h2>${p.demoTitle}</h2><p>${p.demoText}</p><button class="open-demo" data-demo="${i}">Open interactive sample <span aria-hidden="true">↗</span></button><div class="feature-note"><h3>A preview inside the story</h3><p>The full demo opens separately, so exploring it does not move you out of this project.</p></div></section>
<section class="chapter" data-section="3"><p class="caption">Decisions</p><h2>Why it works<br>this way.</h2><ul class="decision-list">${p.decisions.map(([a,b])=>`<li><strong>${a}</strong><span>${b}</span></li>`).join('')}</ul><button class="end-link" data-switch="${(i+1)%projects.length}">Explore ${projects[(i+1)%projects.length].name} →</button></section>
</div></article>`).join('');
shelf.innerHTML = projects.map((p,i)=>`<button style="${style(p)}" data-switch="${i}" aria-label="Show ${p.name}"><span class="swatch" aria-hidden="true">${p.symbol}</span><span>${p.name}</span></button>`).join('');
document.querySelector('#sections').innerHTML = sectionLabels.map((name,i)=>`<button data-jump="${i}">${name}</button>`).join('');
const panels = [...document.querySelectorAll('.project')];
let active = 0;
const positions = projects.map(()=>0);
let frame;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function updateSections() {
 const panel=panels[active];const scroller=panel.querySelector('.project-scroll');
 const chapters=[...panel.querySelectorAll('.chapter')];
 const section=chapters.reduce((best,el,i)=>Math.abs(el.offsetTop-scroller.scrollTop-54)<Math.abs(chapters[best].offsetTop-scroller.scrollTop-54)?i:best,0);
 panel.querySelector('.section-name').textContent=sectionLabels[section];
 document.querySelectorAll('[data-jump]').forEach((el,i)=>el.setAttribute('aria-current',String(i===section)));
}
function activate(index) {
 if(index!==active){positions[active]=panels[active].querySelector('.project-scroll').scrollTop;panels[index].querySelector('.project-scroll').scrollTo({top:positions[index],behavior:'instant'});}
 active=index;
 panels.forEach((panel,i)=>{panel.toggleAttribute('data-active',i===index);panel.querySelector('.project-scroll').tabIndex=i===index?0:-1;panel.inert=i!==index;});
 document.querySelectorAll('#shelf button').forEach((el,i)=>el.setAttribute('aria-current',String(i===index)));
 document.querySelector('#position').textContent=`${index+1} / ${projects.length}`;
 document.querySelector('#current-project').textContent=projects[index].name;
 document.querySelector('#previous').disabled=index===0;
 document.querySelector('#next').disabled=index===projects.length-1;
 updateSections();
}
function go(index,behavior=reduced.matches?'instant':'smooth') {
 index=Math.max(0,Math.min(projects.length-1,index));
 const panel=panels[index];
 track.scrollTo({left:panel.offsetLeft-track.offsetLeft-(track.clientWidth-panel.offsetWidth)/2,behavior});
 activate(index);
}
track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
 const center=track.getBoundingClientRect().left+track.clientWidth/2;
 const index=panels.reduce((best,el,i)=>Math.abs(el.getBoundingClientRect().left+el.clientWidth/2-center)<Math.abs(panels[best].getBoundingClientRect().left+panels[best].clientWidth/2-center)?i:best,0);
 if(index!==active)activate(index);
});},{passive:true});
// Native horizontal scrolling handles trackpads. Vertical wheel motion stays inside its project.
track.addEventListener('wheel',event=>{if(Math.abs(event.deltaX)>Math.abs(event.deltaY)&&!event.ctrlKey){event.preventDefault();track.scrollLeft+=event.deltaX;}},{passive:false});
panels.forEach(panel=>panel.querySelector('.project-scroll').addEventListener('scroll',()=>{if(panel===panels[active])updateSections();},{passive:true}));
track.addEventListener('click',event=>{const index=panels.findIndex(panel=>{const r=panel.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right;});if(index!==-1&&index!==active)go(index);});
document.addEventListener('click',event=>{
 const target=event.target.closest('button');if(!target)return;
 if(target.dataset.switch!==undefined)go(Number(target.dataset.switch));
 if(target.dataset.jump!==undefined){const s=panels[active].querySelector('.project-scroll');const chapter=s.querySelector(`[data-section="${target.dataset.jump}"]`);s.scrollTo({top:chapter.offsetTop-54,behavior:reduced.matches?'instant':'smooth'});}
 if(target.dataset.demo!==undefined)openDemo(Number(target.dataset.demo));
});
document.querySelector('#previous').onclick=()=>go(active-1);
document.querySelector('#next').onclick=()=>go(active+1);
document.addEventListener('keydown',event=>{if(dialog.open||event.altKey||event.metaKey||event.ctrlKey)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();go(active+(event.key==='ArrowRight'?1:-1));}});
// A deliberate horizontal swipe switches projects; vertical touch motion remains native.
let touch;
track.addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY,index:active};},{passive:true});
track.addEventListener('touchmove',e=>{if(!touch||e.touches.length!==1)return;const dx=e.touches[0].clientX-touch.x,dy=e.touches[0].clientY-touch.y;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5)e.preventDefault();},{passive:false});
track.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)go(touch.index+(dx<0?1:-1));touch=null;},{passive:true});
track.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
const dialog=document.querySelector('#demo-dialog');
function openDemo(index){const p=projects[index];document.querySelector('#demo-heading').textContent=p.demoTitle;document.querySelector('#demo-description').textContent=p.demoText;const body=document.querySelector('#demo-body');
 if(index===0){body.innerHTML='<button data-topic="Projects">Projects</button><button data-topic="Notes">Notes</button><button data-topic="Public work">Public work</button><output aria-live="polite">Select a topic to follow a connection.</output>';body.querySelectorAll('button').forEach(button=>button.onclick=()=>{body.querySelector('output').textContent=({Projects:'Portfolio → Project stories → Open Thoughts',Notes:'A design decision → A project note → A related idea','Public work':'An approved story → A project page → A visitor exploring it'})[button.dataset.topic];});}
 else if(index===1){body.innerHTML='<button>City council</button><button>School board</button><output aria-live="polite">Choose a fictional race.</output>';body.querySelectorAll('button').forEach(button=>button.onclick=()=>{body.querySelector('output').textContent=button.textContent==='City council'?'City council · Sample candidates: Alex Rivera and Morgan Lee. Explore their priorities side by side.':'School board · Sample candidates: Sam Taylor and Jordan Ellis. Read their approaches to local education.';});}
 else{body.innerHTML='<div class="mini-preview"><span>Art</span><span>Tech</span></div><button>Swap the halves</button>';body.querySelector('button').onclick=()=>{const preview=body.querySelector('.mini-preview');preview.style.flexDirection=preview.style.flexDirection==='row-reverse'?'row':'row-reverse';};}
 dialog.showModal();}
document.querySelector('.close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
window.addEventListener('resize',()=>go(active,'instant'));
const initial=projects.findIndex(p=>`#${p.id}`===location.hash);go(initial<0?0:initial,'instant');
