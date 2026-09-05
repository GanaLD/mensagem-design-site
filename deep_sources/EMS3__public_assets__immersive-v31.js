(()=>{
'use strict';
const VERSION='3.1-r2.2-stage7';
const OWNER_MAP=Object.freeze({runtime:'experience.runtime',scroll:'experience.scroll',webgl:'experience.webgl',camera:'experience.camera',postfx:'experience.postfx',quality:'experience.quality',sections:'experience.sections'});
const DEFAULTS=Object.freeze({enabled:true,visual_proof:true,debug:false,quality:'auto',intensity:1,glb_asset_id:'studio-orbit-dish',fallback:true});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const lerp=(a,b,t)=>a+(b-a)*t;
const mix3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
function deepMerge(base,input){const out={...base};Object.entries(input&&typeof input==='object'?input:{}).forEach(([k,v])=>{out[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&base[k]&&typeof base[k]==='object')?deepMerge(base[k],v):v;});return out;}
function config(){return deepMerge(DEFAULTS,window.__STUDIOFRAME_IMMERSIVE_CONFIG__||window.__PB_PREVIEW_DATA__?.site_builder?.immersive||window.__PB_PUBLIC_DATA__?.site_builder?.immersive||{});}
function assetUrl(relative=''){const raw=String(relative||'').replace(/^\/+/, '').replace(/^assets\//,'');const configured=String(window.__PB_ASSET_BASE__||'');const base=configured?(configured.endsWith('/')?configured:`${configured}/`):(location.protocol==='file:'?'./':(location.pathname==='/site'||location.pathname.startsWith('/site/')?'/site/':'/'));return new URL(`assets/${raw}`,new URL(base,location.href)).href;}
class CapabilityDetector{
 constructor(){const canvas=document.createElement('canvas');let webgl2=false,webgl=false;try{webgl2=Boolean(canvas.getContext('webgl2'));webgl=webgl2||Boolean(canvas.getContext('webgl'));}catch(_){webgl=false;}this.report={webgl,webgl2,reducedMotion:Boolean(document.documentElement.dataset.sfForceReducedMotion==='true'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),coarsePointer:Boolean(window.matchMedia?.('(pointer: coarse)').matches),viewTransitions:'startViewTransition' in document};}
}
class ViewportManager{
 constructor(){this.state=this.read();this.abort=new AbortController();addEventListener('resize',()=>{this.state=this.read();},{passive:true,signal:this.abort.signal});}
 read(){const w=Math.max(1,innerWidth||document.documentElement.clientWidth||1),h=Math.max(1,innerHeight||document.documentElement.clientHeight||1);return{width:w,height:h,dpr:devicePixelRatio||1,kind:w<=700?'mobile':w<=1024?'tablet':'desktop'};}
 destroy(){this.abort.abort();}
}
class QualityManager{
 constructor(capabilities,viewport,requested='auto'){this.requested=requested;this.samples=[];this.cooldown=0;this.current=this.initial(capabilities,viewport);}
 initial(c,v){if(!c.webgl)return'FALLBACK';if(this.requested&&this.requested!=='auto')return String(this.requested).toUpperCase();if(c.reducedMotion)return'LOW';if(v.kind==='mobile')return'MEDIUM';return'HIGH';}
 observe(deltaMs){if(this.current==='FALLBACK'||this.requested!=='auto')return;this.samples.push(deltaMs);if(this.samples.length>120)this.samples.shift();if(this.cooldown>0){this.cooldown--;return;}if(this.samples.length<90)return;const avg=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;if(avg>28&&this.current==='HIGH'){this.current='MEDIUM';this.cooldown=180;}else if(avg>34&&this.current==='MEDIUM'){this.current='LOW';this.cooldown=180;}}
 pixelRatio(v){if(this.current==='HIGH')return Math.min(v.dpr,1.5);if(this.current==='MEDIUM')return Math.min(v.dpr,1.25);return 1;}
}
class SectionRegistry{
 constructor(root=document){this.root=root;this.sections=[];this.measure();}
 measure(){const nodes=[...this.root.querySelectorAll('[data-experience-section]')];this.sections=nodes.map((el,index)=>({el,id:String(el.dataset.experienceSection||el.id||`section-${index}`),scene:String(el.dataset.experienceScene||'artifact'),camera:String(el.dataset.experienceCamera||'hero-camera'),post:String(el.dataset.experiencePost||'hero'),index,start:0,end:1,height:1,progress:0}));this.refreshRanges();return this.sections;}
 refreshRanges(){const sy=scrollY||0;this.sections.forEach(row=>{const r=row.el.getBoundingClientRect();row.start=r.top+sy;row.height=Math.max(1,r.height);row.end=row.start+row.height;});}
 active(scrollCenter){if(!this.sections.length)return null;let chosen=this.sections[0],best=Infinity;for(const row of this.sections){const d=scrollCenter<row.start?row.start-scrollCenter:scrollCenter>row.end?scrollCenter-row.end:0;if(d<best){best=d;chosen=row;}}return chosen;}
}
class ScrollOrchestrator{
 constructor(registry,viewport){this.registry=registry;this.viewport=viewport;this.globalProgress=0;this.active=null;this.dirty=true;this.abort=new AbortController();this.observer=new MutationObserver(()=>this.invalidate());this.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});addEventListener('resize',()=>this.invalidate(),{passive:true,signal:this.abort.signal});document.fonts?.ready?.then(()=>this.invalidate()).catch(()=>{});}
 invalidate(){this.dirty=true;}
 update(){if(this.dirty){this.registry.measure();this.dirty=false;}const max=Math.max(1,document.documentElement.scrollHeight-this.viewport.state.height);this.globalProgress=clamp((scrollY||0)/max);const center=(scrollY||0)+this.viewport.state.height*.5;const active=this.registry.active(center);if(active){const local=clamp((center-active.start)/Math.max(active.height,1));active.progress=local;this.active=active;}return this.active;}
 destroy(){this.abort.abort();this.observer.disconnect();}
}
class Interaction3D{
 constructor(capabilities){this.pointer={x:0,y:0};this.abort=new AbortController();if(!capabilities.reducedMotion)addEventListener('pointermove',e=>{this.pointer.x=clamp(e.clientX/Math.max(1,innerWidth),0,1)*2-1;this.pointer.y=(clamp(e.clientY/Math.max(1,innerHeight),0,1)*2-1)*-1;},{passive:true,signal:this.abort.signal});}
 destroy(){this.abort.abort();}
}
const TRACKS={
 'hero-camera':[[0,[0,.45,6.4],[0,0,0],38],[.45,[1.05,.15,4.6],[.15,0,0],34],[1,[-.6,.7,3.25],[0,.05,0],31]],
 'manifesto-camera':[[0,[-.6,.7,3.25],[0,.05,0],31],[.55,[1.7,.55,4.2],[0,0,0],36],[1,[0,1.25,5.4],[0,.2,0],40]],
 'capabilities-camera':[[0,[0,1.25,5.4],[0,.2,0],40],[.5,[-1.8,.2,4.8],[0,0,0],37],[1,[1.5,-.25,4.3],[0,0,0],34]],
 'projects-camera':[[0,[1.5,-.25,4.3],[0,0,0],34],[.5,[0,.1,5.9],[0,0,0],42],[1,[-1.3,.4,5],[0,0,0],38]],
 'media-camera':[[0,[-1.3,.4,5],[0,0,0],38],[1,[1.9,.7,6.2],[0,0,0],43]],
 'forms-camera':[[0,[1.9,.7,6.2],[0,0,0],43],[1,[2.6,.35,6.8],[0,0,0],44]],
 'footer-camera':[[0,[0,.3,4.4],[0,0,0],35],[1,[0,2.2,7.2],[0,.2,0],46]]
};
function sample(track,p){const aTrack=track||TRACKS['hero-camera'];if(p<=aTrack[0][0])return{a:aTrack[0],b:aTrack[0],t:0};for(let i=1;i<aTrack.length;i++){if(p<=aTrack[i][0]){const a=aTrack[i-1],b=aTrack[i],t=clamp((p-a[0])/Math.max(.0001,b[0]-a[0]));return{a,b,t:t*t*(3-2*t)};}}const z=aTrack.at(-1);return{a:z,b:z,t:0};}
class CameraDirector{
 constructor(THREE){this.THREE=THREE;this.camera=new THREE.PerspectiveCamera(38,1,.1,100);this.target=new THREE.Vector3();this.camera.position.set(0,.45,6.4);this.activeTrack='hero-camera';}
 resize(v){this.camera.aspect=v.width/Math.max(1,v.height);this.camera.updateProjectionMatrix();}
 update(trackId,progress,pointer,viewport,reduced){this.activeTrack=TRACKS[trackId]?trackId:'hero-camera';const {a,b,t}=sample(TRACKS[this.activeTrack],progress);const pos=mix3(a[1],b[1],t),look=mix3(a[2],b[2],t),scale=reduced?0:(viewport.kind==='mobile'?0.04:0.13);pos[0]+=pointer.x*scale;pos[1]+=pointer.y*scale*.55;look[0]+=pointer.x*scale*.25;look[1]+=pointer.y*scale*.18;this.camera.position.set(...pos);this.target.set(...look);this.camera.fov=lerp(a[3],b[3],t);this.camera.updateProjectionMatrix();this.camera.lookAt(this.target);}
}
const PROFILES={hero:{bg:0x0d0906,fog:.055,exposure:1.18,accent:0xdc5000,ambient:1.5,rim:4.2},void:{bg:0x100904,fog:.075,exposure:1.08,accent:0xffedd7,ambient:1.1,rim:3.2},capabilities:{bg:0x0c120e,fog:.048,exposure:1.2,accent:0x72f2a5,ambient:1.6,rim:4.8},projects:{bg:0x080a0c,fog:.065,exposure:1.12,accent:0x9b7cff,ambient:1.25,rim:4.1},media:{bg:0x0d0d12,fog:.08,exposure:1,accent:0xff8c42,ambient:1.05,rim:3.4},forms:{bg:0x07110d,fog:.05,exposure:1.15,accent:0x72f2a5,ambient:1.4,rim:4},footer:{bg:0x050607,fog:.09,exposure:.92,accent:0xffedd7,ambient:.9,rim:2.8}};
class RendererManager{
 constructor(THREE,canvas,quality,viewport){this.THREE=THREE;this.canvas=canvas;this.quality=quality;this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(quality.pixelRatio(viewport.state));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.resize(viewport.state);}
 resize(v){this.renderer.setPixelRatio(this.quality.pixelRatio(v));this.renderer.setSize(v.width,v.height,false);}
 render(scene,camera){this.renderer.render(scene,camera);}
 destroy(){this.renderer.dispose();}
}
class SceneManager{
 constructor(THREE){this.THREE=THREE;this.scene=new THREE.Scene();this.artifact=new THREE.Group();this.scene.add(this.artifact);this.ambient=new THREE.HemisphereLight(0xffedd7,0x100904,1.4);this.rim=new THREE.DirectionalLight(0xdc5000,4);this.rim.position.set(3,4,5);this.scene.add(this.ambient,this.rim);this.parts=[];this.makePack();}
 makePack(){const T=this.THREE,colors=[0x72f2a5,0x9b7cff,0xff8c42,0x49d8ff,0xff6fae,0xffedd7],geos=[new T.BoxGeometry(1,1,1),new T.SphereGeometry(.62,24,18),new T.OctahedronGeometry(.72,0),new T.ConeGeometry(.58,1.15,24),new T.TorusGeometry(.55,.2,18,40),new T.TorusKnotGeometry(.5,.16,90,16)];geos.forEach((g,i)=>{const m=new T.MeshStandardMaterial({color:colors[i],roughness:.34,metalness:.18,transparent:true,opacity:.96});const mesh=new T.Mesh(g,m);mesh.position.set((i%3-1)*1.35,(Math.floor(i/3)-.5)*1.45,(i%2?-.45:.35));mesh.userData.base=mesh.position.clone();mesh.userData.phase=i*.73;this.artifact.add(mesh);this.parts.push(mesh);});const points=new T.BufferGeometry();const vertices=[];for(let i=0;i<180;i++){const a=i*.618*6.283,r=2.3+(i%11)*.045;vertices.push(Math.cos(a)*r,(Math.sin(a*1.7))*1.5,(Math.sin(a))*r*.35);}points.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const material=new T.PointsMaterial({size:.025,color:0xffedd7,transparent:true,opacity:.45});this.stars=new T.Points(points,material);this.scene.add(this.stars);}
 update(section,progress,time,intensity=1,reduced=false){const id=String(section||'hero'),p=clamp(progress),explode=id==='capabilities'?(1.15+p*1.35):id==='projects'?(0.6+p*0.35):(id==='media'||id==='showcases')?0.35:(id==='forms'||id==='quote'||id==='briefing')?0.25:(0.25+p*0.3);const focus=id==='forms'||id==='quote'||id==='briefing';this.parts.forEach((mesh,i)=>{const base=mesh.userData.base,dir=base.clone().normalize();const e=explode*intensity;mesh.position.copy(base).addScaledVector(dir,e);mesh.position.x+=(focus?-1.2:0);mesh.rotation.x=(reduced?0:.08*Math.sin(time*.00035+mesh.userData.phase))+p*(i%2?.7:-.4);mesh.rotation.y=(reduced?0:.08*Math.cos(time*.00028+mesh.userData.phase))+p*(i%2?-.55:.8);mesh.scale.setScalar(.9+Math.sin((p+i*.17)*Math.PI)*.14);});this.artifact.position.z=lerp(.2,-.7,p);this.artifact.rotation.z=lerp(-.08,.1,p);this.artifact.scale.setScalar(lerp(.92,1.08,p));if(this.stars)this.stars.rotation.y=reduced?0:time*.000025;}
 destroy(){this.scene.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>m.dispose?.());});}
}
class PostFXManager{
 constructor(THREE,scene,renderer,ambient,rim){this.THREE=THREE;this.scene=scene;this.renderer=renderer;this.ambient=ambient;this.rim=rim;this.current='hero';}
 update(profileId){this.current=PROFILES[profileId]?profileId:'hero';const p=PROFILES[this.current],T=this.THREE;this.scene.background=new T.Color(p.bg);this.scene.fog=new T.FogExp2(p.bg,p.fog);this.renderer.renderer.toneMappingExposure=p.exposure;this.ambient.intensity=p.ambient;this.rim.intensity=p.rim;this.rim.color.setHex(p.accent);}
}
class FallbackVisual{
 constructor(canvas){this.canvas=canvas;this.node=document.createElement('div');this.node.className='sf-immersive-fallback-pack';this.node.setAttribute('aria-hidden','true');this.node.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';canvas.insertAdjacentElement('afterend',this.node);}
 update(section,p){this.node.dataset.section=section||'hero';this.node.style.setProperty('--sf-imm-p',String(clamp(p)));}
 destroy(){this.node.remove();}
}
class ExperienceEngine{
 constructor(root,frameLoop){this.root=root;this.frameLoop=frameLoop;this.cfg=config();this.capabilities=new CapabilityDetector().report;this.viewport=new ViewportManager();this.registry=new SectionRegistry(root);this.scroll=new ScrollOrchestrator(this.registry,this.viewport);this.interaction=new Interaction3D(this.capabilities);this.quality=new QualityManager(this.capabilities,this.viewport.state,String(this.cfg.quality||'auto').toLowerCase());this.canvas=root.getElementById('experience-canvas');this.abort=new AbortController();this.unsubscribe=null;this.lastW=0;this.lastH=0;this.renderer=null;this.scene=null;this.camera=null;this.post=null;this.fallback=null;this.ready=false;}
 async mount(){if(!this.canvas||!this.cfg.enabled)return this;this.canvas.dataset.owner=OWNER_MAP.webgl;this.canvas.dataset.runtime=VERSION;this.root.documentElement.dataset.immersiveV31='mounting';if(this.capabilities.webgl){try{const url=window.__STUDIOFRAME_IMMERSIVE_THREE_URL__||assetUrl('motion/vendor/three/three.module.min.js');const THREE=await import(url);this.renderer=new RendererManager(THREE,this.canvas,this.quality,this.viewport);this.scene=new SceneManager(THREE);this.camera=new CameraDirector(THREE);this.post=new PostFXManager(THREE,this.scene.scene,this.renderer,this.scene.ambient,this.scene.rim);this.root.documentElement.dataset.immersiveRenderer='webgl';}catch(error){console.warn('[StudioFrame][ImmersiveV31] WebGL runtime fallback',error);this.capabilities.webgl=false;this.quality.current='FALLBACK';}}
 if(!this.renderer){this.canvas.hidden=true;this.fallback=new FallbackVisual(this.canvas);this.root.documentElement.dataset.immersiveRenderer='fallback';}
 const frame=({time,delta})=>this.update(time,delta);this.unsubscribe=this.frameLoop.subscribe(frame);this.ready=true;this.root.body.classList.add('sf-immersive-v31');this.root.documentElement.dataset.immersiveV31='active';this.root.documentElement.dataset.immersiveOneScrollClock='1';this.update(performance.now(),.016);return this;}
 update(time,delta){const active=this.scroll.update();if(!active)return;const p=active.progress;const v=this.viewport.state;if(v.width!==this.lastW||v.height!==this.lastH){this.lastW=v.width;this.lastH=v.height;this.renderer?.resize(v);this.camera?.resize(v);}this.quality.observe((Number(delta)||0)*1000);const reduced=this.capabilities.reducedMotion||this.quality.current==='LOW';if(this.renderer&&this.scene&&this.camera&&this.post){this.camera.update(active.camera,p,this.interaction.pointer,v,reduced);this.scene.update(active.id,p,time,Number(this.cfg.intensity||1),reduced);this.post.update(active.post);this.renderer.render(this.scene.scene,this.camera.camera);}else this.fallback?.update(active.id,p);this.registry.sections.forEach(s=>{const on=s===active;s.el.classList.toggle('is-immersive-active',on);s.el.style.setProperty('--immersive-section-progress',on?String(p):'0');});const de=this.root.documentElement;de.dataset.immersiveSection=active.id;de.dataset.immersiveCamera=active.camera;de.dataset.immersivePost=active.post;de.dataset.immersiveQuality=this.quality.current;de.style.setProperty('--immersive-global-progress',String(this.scroll.globalProgress));de.style.setProperty('--immersive-section-progress',String(p));}
 snapshot(){const a=this.scroll.active;return{version:VERSION,mounted:this.ready,owners:OWNER_MAP,frameSubscribers:Number(this.frameLoop.count?.()||0),scrollClocks:1,section:a?.id||'',sectionProgress:Number(a?.progress||0),globalProgress:Number(this.scroll.globalProgress||0),camera:a?.camera||'',post:a?.post||'',quality:this.quality.current,webgl:Boolean(this.renderer),fallback:Boolean(this.fallback),reducedMotion:this.capabilities.reducedMotion,sections:this.registry.sections.map(s=>s.id)};}
 destroy(){this.unsubscribe?.();this.unsubscribe=null;this.abort.abort();this.scroll.destroy();this.viewport.destroy();this.interaction.destroy();this.renderer?.destroy();this.scene?.destroy();this.fallback?.destroy();this.root.body.classList.remove('sf-immersive-v31');this.root.documentElement.dataset.immersiveV31='inactive';}
}
class AppKernel{
 constructor(root=document){this.root=root;this.frameLoop=window.__STUDIOFRAME_R22_FRAME_LOOP__;if(!this.frameLoop)throw new Error('Shared FrameLoop unavailable');this.experience=null;}
 async mount(){this.experience=new ExperienceEngine(this.root,this.frameLoop);await this.experience.mount();return this;}
 destroy(){this.experience?.destroy();this.experience=null;}
 snapshot(){return this.experience?.snapshot()||{version:VERSION,mounted:false};}
}
let kernel=null;
async function mount(){if(kernel){kernel.destroy();kernel=null;}const cfg=config();if(!cfg.enabled){document.documentElement.dataset.immersiveV31='disabled';return null;}kernel=new AppKernel(document);await kernel.mount();return kernel;}
function destroy(){kernel?.destroy();kernel=null;}
window.StudioFrameImmersiveV31=Object.freeze({version:VERSION,owners:OWNER_MAP,mount,destroy,refresh:mount,snapshot:()=>kernel?.snapshot()||{version:VERSION,mounted:false},config:()=>JSON.parse(JSON.stringify(config()))});
})();
