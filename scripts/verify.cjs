/* Real-browser smoke test. Run with the repository served on port 8000. */
const { chromium }=require('playwright');
const fs=require('fs');
(async()=>{
  fs.mkdirSync('artifacts',{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[],checks={};page.on('console',m=>{if(m.type()==='error')errors.push(`console ${m.location().url}: ${m.text()}`)});page.on('pageerror',e=>errors.push(`page: ${e.stack||e.message}`));
  const shot=async name=>{if(process.env.DW_SHOTS==='0')return;await page.screenshot({path:`artifacts/${name}.png`,timeout:60000});console.log('screenshot',name)};
  await page.goto(process.env.DW_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});await page.waitForSelector('#title:not([hidden])',{timeout:60000});await page.waitForTimeout(1000);await shot('01-title');
  checks.boot=await page.evaluate(()=>({mode:__dw.mode,webgl:__dw.renderer.getContext().getParameter(__dw.renderer.getContext().VERSION)}));
  await page.click('[data-act="new"]');await page.click('#go');await page.waitForTimeout(1800);if(process.env.DW_FAST)await page.evaluate(()=>__dw.applyQuality('low'));await shot('02-gameplay');
  for(let i=0;i<3;i++){await page.keyboard.press('KeyC');await page.waitForTimeout(100)}
  await page.mouse.click(720,450);await page.waitForTimeout(400);checks.pointerLocked=await page.evaluate(()=>document.pointerLockElement===document.querySelector('#c'));
  const yaw=await page.evaluate(()=>__dw.cam.tyaw);await page.mouse.move(790,470);await page.waitForTimeout(250);checks.mouseLook=await page.evaluate(y=>Math.abs(__dw.cam.tyaw-y)>.01,yaw);
  await page.mouse.wheel(0,-260);await page.waitForTimeout(500);checks.zoom=await page.evaluate(()=>__dw.cam.zoom);await shot('03-first-person-focus');
  // Debug positioning only frames the doorway; movement and interaction below use real keys.
  await page.evaluate(()=>{Object.assign(__dw.pl,{l:1,x:-.55,z:.9});__dw.cam.yaw=__dw.cam.tyaw=0;__dw.cam.pitch=__dw.cam.tpitch=0});await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__keyEvents=[];document.addEventListener('keydown',e=>__keyEvents.push([e.key,e.code,e.target.tagName]))});await page.keyboard.down('w');await page.waitForTimeout(400);checks.duringMove=await page.evaluate(()=>({keys:__dw.keys,z:__dw.pl.z,door:__dw.raft.house.doorOpen}));await page.waitForFunction(()=>__dw.pl.z<.3,undefined,{timeout:20000}).catch(()=>{});await page.keyboard.up('w');await page.waitForTimeout(250);checks.interiorPosition=await page.evaluate(()=>({x:__dw.pl.x,z:__dw.pl.z,level:__dw.pl.l,door:__dw.raft.house.doorOpen,lock:__dw.pl.lock,speed:__dw.pl.speed,mode:__dw.mode,walkable:__dw.raft.walkable(-.55,.2,1),keys:__dw.keys,events:window.__keyEvents,modal:__dw.modal,active:document.activeElement?.tagName}));console.log('MOVE',JSON.stringify(checks.duringMove),JSON.stringify(checks.interiorPosition));await shot('04-interior');
  await page.evaluate(()=>{Object.assign(__dw.pl,{l:1,x:-.55,z:.9});__dw.give({wood:120,scrap:80,plastic:80,fiber:60},true)});await page.waitForTimeout(350);await page.keyboard.press('KeyE');await page.waitForTimeout(350);checks.upgradeModal=await page.locator('#buyHouse').count();await shot('05-cabin-upgrades');
  if(checks.upgradeModal){await page.click('#buyHouse');await page.waitForTimeout(500)}checks.houseLevel=await page.evaluate(()=>__dw.st.houseLv);await shot('06-upgrade-owned');
  checks.render=await page.evaluate(()=>({calls:__dw.renderer.info.render.calls,triangles:__dw.renderer.info.render.triangles,geometries:__dw.renderer.info.memory.geometries,textures:__dw.renderer.info.memory.textures}));
  console.log('CHECKS',JSON.stringify(checks,null,2));console.log('ERRORS',JSON.stringify(errors,null,2));await browser.close();
  if(errors.length||!checks.pointerLocked||!checks.mouseLook||checks.zoom<=1||checks.houseLevel!==1||checks.interiorPosition.z>=.35)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
