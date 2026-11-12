const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hash=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x};
const fmt=b=>!b?'—':b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?Math.round(b/1e6)+' MB':Math.max(1,Math.round(b/1e3))+' KB';
const hd=(h,k)=>{for(const x in(h||{}))if(x.toLowerCase()===k)return h[x];return''};
const P=()=>(window.Capacitor&&Capacitor.Plugins)||{};
const BLOCK=/(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com)$/i;
const DIR='EXTERNAL',play='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
let L=[],cur=null,busy=false;
try{L=JSON.parse(localStorage.getItem('vl')||'[]')}catch(e){}
const save=()=>{try{localStorage.setItem('vl',JSON.stringify(L))}catch(e){}};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.k);toast.k=setTimeout(()=>t.classList.remove('on'),3200)}
function row(d){return `<div class="it"><div class="th" style="--h:${d.h}">${play}</div><div class="mt"><b>${esc(d.name)}</b><span>${esc(d.host)} · ${fmt(d.size)}</span><em>${new Date(d.ts).toLocaleDateString('ar')}</em></div><div class="ac"><button data-a="p" data-i="${d.id}">▶</button><button data-a="s" data-i="${d.id}">↗</button><button data-a="d" data-i="${d.id}">×</button></div></div>`}
function draw(){const e='<p class="empty">لا توجد ملفات محفوظة بعد</p>';$('#list').innerHTML=L.slice(0,3).map(row).join('')||e;$('#lib').innerHTML=L.map(row).join('')||e}
async function onAct(e){
const b=e.target.closest('button[data-a]');if(!b)return;
const d=L.find(x=>x.id==b.dataset.i);if(!d)return;
if(b.dataset.a==='d'){try{await P().Filesystem.deleteFile({path:d.path,directory:DIR})}catch(x){}L=L.filter(x=>x.id!==d.id);save();draw();toast('تم الحذف')}
else if(b.dataset.a==='p'){const m=document.createElement(/audio/.test(d.type)?'audio':'video');m.controls=true;m.autoplay=true;m.playsInline=true;m.src=Capacitor.convertFileSrc(d.uri);$('#pm').replaceChildren(m);$('#pl').showModal()}
else{try{await P().Share.share({title:d.name,files:[d.uri]})}catch(x){}}}
$('#list').onclick=onAct;$('#lib').onclick=onAct;
$('#pl').addEventListener('close',()=>{const m=$('#pm').firstChild;if(m)m.pause();$('#pm').replaceChildren()});
$('#cl').onclick=()=>$('#pl').close();
$('#paste').onclick=async()=>{try{$('#url').value=(await P().Clipboard.read()).value||''}catch(e){toast('الصق الرابط يدوياً في الحقل')}};
async function notifyPerm(){try{const N=P().LocalNotifications,p=await N.checkPermissions();if(p.display!=='granted')await N.requestPermissions()}catch(e){}}
async function notify(name){try{const N=P().LocalNotifications;await N.schedule({notifications:[{id:Date.now()%2147483647,title:'VIDORA',body:'اكتمل تنزيل '+name,schedule:{at:new Date(Date.now()+300)}}]})}catch(e){}}
$('#an').onclick=async()=>{
if(busy)return;
const u=$('#url').value.trim();let x;
try{x=new URL(u);if(!/^https?:$/.test(x.protocol)||!x.hostname.includes('.'))throw 0}catch(e){toast('أدخل رابطاً صحيحاً يبدأ بـ https://');$('#url').focus();return}
if(BLOCK.test(x.hostname)){toast('هذه المنصة لا تسمح بالتنزيل عبر روابط صفحاتها. استخدم رابطاً مباشراً لملف مسموح بتنزيله');return}
busy=true;$('#portal').classList.add('scan');$('#an span').textContent='جارٍ تحليل الرابط…';
let f='',type='',size=0,ok=true;
try{f=decodeURIComponent(x.pathname.split('/').pop()||'')}catch(e){}
try{const r=await P().CapacitorHttp.request({url:u,method:'HEAD'});type=hd(r.headers,'content-type');size=+hd(r.headers,'content-length')||0;ok=r.status<400||r.status===405}catch(e){ok=false}
busy=false;$('#portal').classList.remove('scan');$('#an span').textContent='تحليل الرابط';
if(!ok){toast('تعذّر الوصول إلى الملف. تحقق من الرابط');return}
if(/text\/html/i.test(type)){toast('هذا رابط صفحة وليس ملف فيديو مباشراً');return}
const ext=((f.match(/\.(\w{2,4})$/)||[])[1]||(type.split('/')[1]||'').split(';')[0]||'').toLowerCase();
const host=x.hostname.replace(/^www\./,'');
cur={u,name:f||('video'+(ext?'.'+ext:'')),type,size,host,h:hash(u)%360};
$('#rt').textContent=cur.name;$('#rs').textContent=host;$('#rth').style.setProperty('--h',cur.h);
$('#if').textContent=(ext||'—').toUpperCase();$('#is').textContent=fmt(size);
$('#ik').textContent=/audio|mp3|m4a|wav|ogg/i.test(type+ext)?'صوت':'فيديو';
$('#res').classList.add('on');$('#dl').disabled=false;$('#res').scrollIntoView({behavior:'smooth',block:'center'})};
$('#dl').onclick=async()=>{
if(!cur||busy)return;busy=true;$('#dl').disabled=true;
const c=cur,path='VIDORA/'+Date.now()+'_'+c.name.replace(/[^\w.\-]+/g,'_'),F=P().Filesystem;
let hl;
try{
hl=await F.addListener('progress',e=>{if(e.url!==c.u)return;const p=e.contentLength>0?Math.min(99,e.bytes/e.contentLength*100):0;$('#dl').style.setProperty('--p',p+'%');$('#dl span').textContent=e.contentLength>0?'جارٍ التنزيل '+Math.floor(p)+'%':'تم تنزيل '+fmt(e.bytes)});
await F.downloadFile({url:c.u,path,directory:DIR,recursive:true,progress:true});
const st=await F.stat({path,directory:DIR}),{uri}=await F.getUri({path,directory:DIR});
L.unshift({id:Date.now(),name:c.name,type:c.type,size:st.size,host:c.host,h:c.h,ts:Date.now(),path,uri});save();draw();
$('#dl').style.setProperty('--p','100%');toast('تم التنزيل وحُفظ في مكتبتك');notify(c.name);
}catch(e){toast('تعذّر التنزيل. تحقق من الرابط أو الاتصال')}
finally{try{hl&&hl.remove()}catch(x){}busy=false;setTimeout(()=>{$('#dl').disabled=false;$('#dl').style.setProperty('--p','0%');$('#dl span').textContent='ابدأ التنزيل'},800)}};
function show(t){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+t));document.querySelectorAll('.bar button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));scrollTo(0,0)}
document.querySelectorAll('.bar button').forEach(b=>b.onclick=()=>show(b.dataset.t));
$('#all').onclick=()=>show('lib');
function theme(m){const r=document.documentElement;m==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',m);document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m))}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{theme(b.dataset.m);try{localStorage.setItem('vt',b.dataset.m)}catch(e){}});
let tm='auto';try{tm=localStorage.getItem('vt')||'auto'}catch(e){}theme(tm);
try{P().StatusBar.setBackgroundColor({color:'#0a0a12'});P().StatusBar.setStyle({style:'DARK'})}catch(e){}
$('#use').textContent='إجمالي الملفات: '+L.length;
notifyPerm();draw();
