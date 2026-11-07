(()=>{'use strict';
if(window.MDMA_LIVE_INITIALIZED) return;
window.MDMA_LIVE_INITIALIZED=true;

const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(v,n=3000)=>String(v??'').slice(0,n);
const val=k=>{
  const el=document.getElementById(k)||document.querySelector(`[data-field="${k}"]`);
  if(el && String(el.value??'').trim()) return String(el.value).trim();
  try{
    const saved=JSON.parse(localStorage.getItem('mdma022-variabilidad-v1')||'{}');
    return String(saved[k]??'').trim();
  }catch(e){return '';}
};
const STAGES=['explora','problema','hipotesis','pregunta','mediacion','cierre'];
const stageNames={explora:'Observaciones',problema:'Problematización',hipotesis:'Hipótesis',pregunta:'Pregunta',mediacion:'Mediación',cierre:'Cierre'};
const ALL_DATA_KEYS=[
  'grupo','curso',
  'o1','o2','q1','q2',
  'unidad','variable','limite','fuenteContexto','fuenteComposicion','fuenteRegistro','fuenteMuestreo',
  'h1tipo','h1','h1m','h1p','h1e','h1d',
  'h2tipo','h2','h2m','h2p','h2e','h2d',
  'contraste','noAfirmar',
  'pregunta','poblacion','periodo','variables','alcance','datos','representacion','limitacionP','civica',
  'respuestaInicial','m1q','m1r','m1f','m2q','m2r','m2f','m3q','m3r','m3f','m4q','m4r','m4f','sesgo','indicador',
  'ticket1','ticket2','ticket3'
];
let auth=null, db=null, uid='',room='',role='',owner=false,unsubRoom=null,unsubTeams=null,teamDocs=[],demo=false,lastSelected=[],active=true,sseSource=null,ntfySource=null,ntfyRoomSource=null,pollTimer=null,bcChannel=null;
const firebaseReady=Boolean(window.MDMA_FIREBASE_CONFIG?.apiKey && window.firebase);
const isLocalServer=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:';
const API_BASE=(location.protocol==='http:'||location.protocol==='https:')?'':'http://localhost:3456';
const NTFY_PREFIX='https://ntfy.sh/mdma022_ucsc_2026_';

const style=document.createElement('style');style.textContent=`
.livecard{border:2px solid #2a929d;background:#eef8f7}.liveheading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.liveresponse{padding:15px;border:1px solid #d3e5e5;background:#fff;border-radius:12px;margin:10px 0}.liveresponse h3{margin:0 0 6px}.livebadge{display:inline-block;padding:4px 8px;background:#d5ebeb;border-radius:999px;color:#155665;font-size:11px;font-weight:800}.livegood{color:#15724b;font-weight:800}.livewarn{color:#99552b;font-weight:800}.livegrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.livecompare{border:2px solid #3a8996;background:#f8fcfb;border-radius:12px;padding:15px;min-height:120px;overflow-wrap:anywhere}.livecard .small{line-height:1.6}.livesticky{position:sticky;top:0;z-index:12;padding:10px 14px;background:#e3f2f0;display:none;border-bottom:1px solid #aad1d0}.livesticky.visible{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.liveactions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.liveactions input{max-width:220px}.livenote{border-left:3px solid #3c8994;padding:8px 12px;background:#eaf6f5;font-size:13px}.livecounter{font-size:28px;font-weight:900;color:#176a75}.livephase{border:1px solid #c6dddb;padding:10px 12px;border-radius:9px;background:#fff;font-size:13px}.livephase strong{color:#086b77}.livebox{max-height:360px;overflow-y:auto}.livechoice{display:flex;align-items:start;gap:8px;padding:8px;border-bottom:1px solid #e5eeee;font-size:12px}.livedemo{background:#fff2df;color:#975619;padding:7px 10px;border-radius:6px;font-weight:800;font-size:12px}.livecode{font-size:24px;letter-spacing:3px;font-weight:900;font-family:ui-monospace,monospace;color:#154b5b}.livechoice input{width:auto}.livecard .btn:disabled{opacity:.45;cursor:not-allowed}.liveroomlist{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.livesec{background:#fff;border:1px solid #d5e6e6;border-radius:9px;padding:10px 12px;margin:8px 0;font-size:13px}.livesec h4{margin:0 0 6px;color:#0e5a65;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
@media(max-width:760px){.livegrid{grid-template-columns:1fr}.livecode{font-size:18px}}
`;document.head.appendChild(style);

const sticky=document.createElement('div');sticky.className='livesticky';sticky.id='liveSticky';sticky.innerHTML='<span id="liveStickyLabel"></span> <button type="button" class="btn smallbtn" id="liveCopyLink">Copiar enlace para estudiantes</button> <button type="button" class="btn smallbtn" id="liveGoLab">Ir a Etapa 1</button> <button type="button" class="btn smallbtn" id="liveGoBoard">Ver Tablero Docente</button> <button type="button" class="btn smallbtn" id="liveDisconnect">Salir de la sala</button>';
document.querySelector('.content').prepend(sticky);

const intro=document.querySelector('#page-intro .btnrow');
const start=document.createElement('section');start.className='card livecard';start.id='liveConnection';start.innerHTML=`
 <div class="liveheading"><span class="livebadge">NUEVO · colaboración en línea</span><h3 style="margin:0">Sala compartida para la videoclase</h3></div>
 <p>Los grupos pueden publicar sus producciones desde sus propios computadores y el docente las recibe automáticamente en tiempo real. El tablero permite seleccionar dos equipos, comparar sus hipótesis y proyectar preguntas para el plenario.</p>
 <div id="liveModeLabel" class="livenote"></div>
 <div class="livegrid" style="margin-top:12px">
  <div>
   <label class="label" for="liveCodeInput">Código de sala</label>
   <input id="liveCodeInput" type="text" placeholder="Ej. AJLKP2" maxlength="12" autocomplete="off">
   <div class="liveactions" style="margin-top:9px">
    <button class="btn primary" type="button" id="liveJoin">Entrar como equipo →</button>
    <button class="btn" type="button" id="liveJoinTeacher">Entrar como docente</button>
   </div>
   <div id="liveActiveRooms" class="liveroomlist small"></div>
  </div>
  <div>
   <label class="label">Para el docente</label>
   <p class="small">Crea una sala nueva o entra a una sala existente para proyectar y comparar las respuestas de los equipos en tiempo real.</p>
   <button class="btn primary" id="liveCreate" type="button">Crear sala docente</button>
   <button class="btn" id="liveDemo" type="button" style="margin-left:6px">Probar demostración</button>
  </div>
 </div>
 <p id="liveStatus" role="status" class="small" style="margin:14px 0 0"></p>
`;intro.parentElement.insertBefore(start,intro);

const teacherCard=document.createElement('div');teacherCard.className='card livecard';teacherCard.id='teacherLiveCard';teacherCard.innerHTML=`
<div class="liveheading"><span class="livebadge">EN VIVO</span><h3 style="margin:0">Tablero colectivo de razonamiento</h3><span id="liveTeacherState" class="small"></span></div>
<p class="small">Cada equipo publica desde las etapas del laboratorio. Selecciona dos respuestas para compararlas en el plenario o revisa abajo todas las entregas completas.</p>
<div class="livegrid"><div class="card flat" style="margin:0"><div class="small">Equipos recibidos</div><div id="liveCount" class="livecounter">0</div><label class="label" for="liveFilter">Filtrar lista por última etapa publicada</label><select id="liveFilter"><option value="all">Todas las etapas</option><option value="explora">1 · Observaciones (Exploración)</option><option value="problema">2 · Problematización</option><option value="hipotesis">3 · Hipótesis</option><option value="pregunta">4 · Preguntas</option><option value="mediacion">5 · Mediación</option><option value="cierre">6 · Cierre</option></select><div id="liveFeed" class="livebox"></div></div>
<div class="card flat" style="margin:0"><h3>Selección y conducción</h3><div id="liveSelectedNote" class="small">Selecciona hasta dos equipos.</div><div class="liveactions" style="margin-top:12px"><button id="liveClearSelection" class="btn" type="button">Limpiar contraste</button><button id="liveExport" class="btn" type="button">Exportar CSV</button><label class="btn primary" style="margin:0;cursor:pointer">📂 Cargar .JSON de grupos<input id="liveQuickImportJson" type="file" accept=".json,application/json" multiple style="display:none"></label></div><label class="label" for="liveFocus">Consigna compartida</label><select id="liveFocus"><option value="explora">Observar</option><option value="problema">Problematizar</option><option value="hipotesis">Contrastar hipótesis</option><option value="pregunta">Refinar pregunta</option><option value="mediacion">Diseñar mediación</option></select><button class="btn primary" id="livePublishFocus" type="button" style="margin-top:9px">Publicar foco</button><div id="liveFocusDisplay" class="livephase" style="margin-top:12px"></div><label class="livechoice"><input type="checkbox" id="liveActive" checked> Sala abierta para entregas</label></div></div>
<h3 style="margin:20px 0 5px">Contraste público de producciones (2 equipos seleccionados)</h3><div class="livegrid"><div id="liveCompareA" class="livecompare">Elige un equipo</div><div id="liveCompareB" class="livecompare">Elige otro equipo</div></div>
<h3 style="margin:22px 0 8px">Todas las respuestas recibidas de los grupos (en vivo)</h3>
<div id="liveAllTeamsGrid" class="livegrid"></div>
<p class="livenote" style="margin-top:15px"><strong>Pregunta para el grupo:</strong> ¿Qué evidencia discriminaría entre estas explicaciones? ¿Qué pregunta docente ayudaría a reconocer que el gráfico inicial no basta?</p>
`;
$('page-docente').insertBefore(teacherCard,$('page-docente').children[2]||null);

const studentCard=document.createElement('div');studentCard.className='card livecard';studentCard.id='liveStudentPublish';studentCard.innerHTML=`<div class="liveheading"><span class="livebadge">ENVÍO EN VIVO</span><h3 style="margin:0">Compartir avance del equipo</h3></div><p class="small">Publica cuando tu equipo quiera someter sus ideas a discusión. No se envía lo que escribes hasta pulsar el botón.</p><div id="liveStudentFocus" class="livephase"></div><div class="liveactions" style="margin-top:14px"><button type="button" class="btn primary" id="livePublish">Publicar el avance</button><span id="livePublishStatus" class="small"></span></div>`;
$('page-cierre').insertBefore(studentCard,$('page-cierre').querySelector('.footer-nav'));
STAGES.slice(0,5).forEach(s=>{let sec=$('page-'+s);let p=document.createElement('div');p.className='card livecard';p.innerHTML=`<div class="liveheading"><span class="livebadge">PUESTA EN COMÚN</span><strong>Comparte tu avance con el docente</strong></div><p class="small">Pulsa el botón para enviar todas tus respuestas de esta etapa al tablero del profesor.</p><div class="liveactions"><button type="button" class="btn primary liveStepSend" data-stage="${s}">Publicar ${stageNames[s].toLowerCase()}</button><span class="small liveStepStatus" data-status-stage="${s}"></span></div>`;sec.insertBefore(p,sec.querySelector('.footer-nav'));});

function setStatus(s,bad=false){$('liveStatus').textContent=s;$('liveStatus').className=bad?'livewarn':'livegood'}
function setStepStatus(s,bad=false){
  $('livePublishStatus').textContent=s;
  $('livePublishStatus').className=bad?'livewarn':'livegood';
  document.querySelectorAll('.liveStepStatus').forEach(el=>{
    el.textContent=s;
    el.className='small liveStepStatus '+(bad?'livewarn':'livegood');
  });
}
function label(){
  if(!room){$('liveSticky').classList.remove('visible');return}
  $('liveSticky').classList.add('visible');
  $('liveStickyLabel').innerHTML=`<strong>${safe(demo?'Demostración local':'Sala '+room)}</strong> · ${safe(role==='teacher'?'Vista Docente':'Equipo ('+(val('grupo')||'sin nombre')+')')} ${demo?'<span class="livedemo">DEMO</span>':'<span class="livegood">● Conectado en línea</span>'}`;
}

function configMessage(){
  $('liveJoin').disabled=false;
  $('liveCreate').disabled=false;
  if(firebaseReady){
    $('liveModeLabel').innerHTML='<strong>Modo compartido activo (Firebase).</strong> Crea una sala como docente o únete con un código como equipo.';
    setStatus('Listo para conectar en tiempo real.');
  } else {
    $('liveModeLabel').innerHTML='<strong>Sincronización en línea activa.</strong> Funciona entre distintos computadores por Internet con solo ingresar el mismo <strong>Código de sala</strong> (ej. <code>AJLKP2</code>) y pulsar <strong>Entrar como equipo →</strong>.';
    setStatus('Listo para recibir y enviar respuestas en tiempo real.');
    loadActiveRooms();
  }
}

let availableRooms=[];
async function loadActiveRooms(){
  if(firebaseReady) return;
  try{
    pollCloudRelayHistory(room||'');
    if(!isLocalServer) return;
    const r=await fetch(`${API_BASE}/api/rooms`);
    if(!r.ok) return;
    const data=await r.json();
    availableRooms=Array.isArray(data.rooms)?data.rooms:[];
    if(Array.isArray(data.teams) && data.teams.length){
      applyServerState({exists:true,room:{focus:'explora',selected:lastSelected,active:true},teams:data.teams});
    }
    renderActiveRoomsBox();
  }catch(e){}
}

function renderActiveRoomsBox(){
  const box=$('liveActiveRooms');
  if(!box) return;
  if(availableRooms.length){
    if(!$('liveCodeInput').value.trim()){
      $('liveCodeInput').value=availableRooms[0].code;
    }
    if(!room && isLocalServer){
      room=availableRooms[0].code;
      owner=true;
      role='teacher';
      attach();
    }
    box.innerHTML='<span>Salas recientes (clic para entrar):</span> '+availableRooms.slice(0,5).map(rm=>`<button type="button" class="btn smallbtn" data-quick-room="${safe(rm.code)}"><strong>${safe(rm.code)}</strong></button>`).join('');
    box.querySelectorAll('[data-quick-room]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        $('liveCodeInput').value=btn.dataset.quickRoom;
        joinRoom('student');
      });
    });
  }
}

configMessage();

function initSdk(){if(!firebaseReady)throw Error('Falta configurar Firebase');if(!firebase.apps.length)firebase.initializeApp(window.MDMA_FIREBASE_CONFIG);auth=firebase.auth();db=firebase.firestore();}
async function getUid(){
  if(firebaseReady){
    initSdk();
    if(auth.currentUser){uid=auth.currentUser.uid;return uid;}
    const res=await auth.signInAnonymously();
    uid=res.user.uid;
    return uid;
  }
  try{
    let saved=localStorage.getItem('mdma022_uid');
    if(!saved){
      const a=new Uint8Array(8);
      crypto.getRandomValues(a);
      saved='u_'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
      localStorage.setItem('mdma022_uid',saved);
    }
    uid=saved;
    return uid;
  }catch(e){
    if(!uid) uid='u_'+Math.random().toString(36).slice(2,12);
    return uid;
  }
}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';const a=new Uint8Array(6);crypto.getRandomValues(a);a.forEach(v=>out+=chars[v%chars.length]);return out;}
function roomRef(){return db.collection('sessions').doc(room)}
function stopWatchers(){
  unsubRoom?.();unsubTeams?.();unsubRoom=unsubTeams=null;
  if(sseSource){try{sseSource.close()}catch(e){}sseSource=null;}
  if(ntfySource){try{ntfySource.close()}catch(e){}ntfySource=null;}
  if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
  if(bcChannel){try{bcChannel.close()}catch(e){}bcChannel=null;}
}
function exitRoom(){stopWatchers();room='';role='';owner=false;teamDocs=[];demo=false;lastSelected=[];label();render();setStatus('Saliste de la sala. Tu trabajo escrito permanece en este navegador.');loadActiveRooms();}

function saveLocalRoomFallback(rm, meta, teams){
  try{
    const store=JSON.parse(localStorage.getItem('mdma022_local_rooms')||'{}');
    store[rm]={room:meta,teams:teams||store[rm]?.teams||[]};
    localStorage.setItem('mdma022_local_rooms',JSON.stringify(store));
  }catch(e){}
}
function getLocalRoomFallback(rm){
  try{
    const store=JSON.parse(localStorage.getItem('mdma022_local_rooms')||'{}');
    return store[rm]||null;
  }catch(e){return null;}
}

function ntfyTopicUrl(rm){
  return `${NTFY_PREFIX}${String(rm||'').toLowerCase()}`;
}

async function publishCloudRelay(rm, payload){
  try{
    let messages = [payload];
    if(payload && payload.kind==='team' && payload.team){
      const cleanTeam = {};
      for(const [k,v] of Object.entries(payload.team)){
        if(v !== undefined && v !== null && String(v).trim() !== '') cleanTeam[k] = v;
      }
      const single = {kind:'team', room:rm, team:cleanTeam};
      const rawJson = JSON.stringify(single);
      if(rawJson.length > 3200){
        const baseKeys = ['id','uid','grupo','curso','sala','stage','updatedAt'];
        const part1 = {}, part2 = {};
        baseKeys.forEach(k=>{ if(cleanTeam[k]!==undefined) { part1[k]=cleanTeam[k]; part2[k]=cleanTeam[k]; } });
        const otherKeys = Object.keys(cleanTeam).filter(k=>!baseKeys.includes(k));
        const half = Math.ceil(otherKeys.length / 2);
        otherKeys.slice(0, half).forEach(k=>{ part1[k]=cleanTeam[k]; });
        otherKeys.slice(half).forEach(k=>{ part2[k]=cleanTeam[k]; });
        messages = [
          {kind:'team', room:rm, team:part1},
          {kind:'team', room:rm, team:part2}
        ];
      } else {
        messages = [single];
      }
    }
    for(const msg of messages){
      const bodyStr = JSON.stringify(msg);
      await Promise.allSettled([
        fetch(ntfyTopicUrl(rm), { method: 'POST', body: bodyStr }),
        fetch(ntfyTopicUrl('ALL'), { method: 'POST', body: bodyStr })
      ]);
    }
  }catch(e){}
}

function mergeIncomingTeam(team){
  if(!team || !team.id) return;
  const idx=teamDocs.findIndex(x=>x.id===team.id || (x.grupo && team.grupo && x.grupo.toLowerCase()===team.grupo.toLowerCase()));
  if(idx>=0){
    const merged={...teamDocs[idx]};
    for(const [k,v] of Object.entries(team)){
      if(v!==undefined && String(v).trim()!=='') merged[k]=v;
    }
    teamDocs[idx]=merged;
  } else {
    teamDocs.push(team);
  }
  teamDocs.sort((a,b)=>String(a.grupo||'').localeCompare(String(b.grupo||''),'es'));
  const targetRoom = room || team.sala || 'AJLKP2';
  const loc=getLocalRoomFallback(targetRoom)||{room:{ownerUid:uid,focus:$('liveFocus').value||'explora',selected:lastSelected,active},teams:[]};
  saveLocalRoomFallback(targetRoom,loc.room,teamDocs);
  if(isLocalServer){
    fetch(`${API_BASE}/api/rooms/${targetRoom}/teams/${encodeURIComponent(team.id)}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(team)
    }).catch(()=>{});
  }
  render();
}

function handleRelayMessage(rawText){
  try{
    const outer=JSON.parse(rawText);
    if(!outer || outer.event!=='message' || !outer.message) return;
    const msg=JSON.parse(outer.message);
    if(!msg) return;
    if(msg.kind==='team' && msg.team){
      mergeIncomingTeam(msg.team);
    } else if(msg.kind==='room' && msg.meta && msg.room===room){
      if(typeof msg.meta.focus==='string') $('liveFocus').value=msg.meta.focus;
      if(Array.isArray(msg.meta.selected)) lastSelected=msg.meta.selected;
      if(typeof msg.meta.active==='boolean'){
        active=msg.meta.active;
        $('liveActive').checked=active;
      }
      render();
    }
  }catch(e){}
}

async function pollCloudRelayHistory(rm){
  try{
    const codes = Array.from(new Set(['ALL', 'AJLKP2', '826UGW', 'PZE4U6', 'V9V2LW', ...(availableRooms.map(x=>x.code)), rm].filter(Boolean)));
    for(const code of codes){
      const tUrl = ntfyTopicUrl(code);
      const r=await fetch(`${tUrl}/json?poll=1&since=12h`);
      if(r.ok){
        const text=await r.text();
        text.split('\n').filter(Boolean).forEach(line=>handleRelayMessage(line));
      }
    }
  }catch(e){}
}

window.MDMA_importToLive=function(respObj){
  if(!respObj || typeof respObj!=='object') return;
  const g=String(respObj.grupo||'Grupo importado').trim();
  const slug=g.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24)||'grupo';
  const stage=respObj.pregunta?'pregunta':(respObj.h1||respObj.h2)?'hipotesis':(respObj.unidad||respObj.limite||respObj.fuenteContexto)?'problema':'explora';
  const row={...respObj,id:'json_'+slug,uid:'json_'+slug,grupo:g,stage,updatedAt:new Date().toISOString()};
  mergeIncomingTeam(row);
};

async function createRoom(){
  try{
    setStatus('Creando sala…');
    await getUid();
    room=randomCode();
    const initialMeta={ownerUid:uid,createdAt:new Date().toISOString(),title:'MDMA 022 · Fuentes de variabilidad',focus:'explora',selected:[],active:true};
    if(firebaseReady){
      const snap=await roomRef().get();
      if(snap.exists){room=randomCode()}
      await roomRef().set({...initialMeta,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    } else {
      saveLocalRoomFallback(room,initialMeta,[]);
      if(isLocalServer){
        fetch(`${API_BASE}/api/rooms/${room}`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(initialMeta)
        }).catch(()=>{});
      }
      publishCloudRelay(room,{kind:'room',room,meta:initialMeta});
    }
    role='teacher';owner=true;demo=false;
    $('liveCodeInput').value=room;
    try{localStorage.setItem('mdma022_last_room',room)}catch(e){}
    attach();
    loadActiveRooms();
    setStatus('✓ Sala docente creada: '+room+'. Comparte este código con tus estudiantes.');
    goTeacher();
  }catch(e){
    room='';
    setStatus('No se pudo crear la sala: '+e.message,true);
  }
}

async function joinRoom(mode='student'){
  let rawInput=$('liveCodeInput').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!rawInput && availableRooms.length){
    rawInput=availableRooms[0].code;
    $('liveCodeInput').value=rawInput;
  }
  if(rawInput.length<3){
    setStatus('Introduce un código de sala (por ejemplo, AJLKP2) o crea una sala nueva.',true);
    $('liveCodeInput').focus();
    return;
  }
  const code=rawInput.slice(0,12);
  try{
    setStatus('Conectando a la sala '+code+'…');
    await getUid();
    room=code;
    demo=false;
    if(firebaseReady){
      const s=await roomRef().get();
      if(!s.exists)throw Error('No existe esa sala');
      owner=(mode==='teacher') || (s.data().ownerUid===uid && mode!=='student');
      role=mode==='teacher'?'teacher':'student';
      if(!s.data().active&&!owner)throw Error('Esta sala está cerrada');
    } else {
      let loadedFromLocal = false;
      if(isLocalServer){
        try{
          const r=await fetch(`${API_BASE}/api/rooms/${room}`);
          if(r.ok){
            const data=await r.json();
            owner=true;
            role=mode==='teacher'?'teacher':'student';
            applyServerState(data);
            loadedFromLocal=true;
          }
        }catch(netErr){}
      }
      if(!loadedFromLocal){
        let loc=getLocalRoomFallback(room);
        if(!loc){
          loc={room:{ownerUid:uid,createdAt:new Date().toISOString(),title:'MDMA 022 · Fuentes de variabilidad',focus:'explora',selected:[],active:true},teams:[]};
          saveLocalRoomFallback(room,loc.room,loc.teams);
        }
        owner=true;
        role=mode==='teacher'?'teacher':'student';
        applyServerState({exists:true,room:loc.room,teams:loc.teams});
      }
    }
    try{localStorage.setItem('mdma022_last_room',room)}catch(e){}
    attach();
    if(mode==='teacher'){
      setStatus('✓ Conectado como docente a la sala '+room+'.');
      goTeacher();
    } else {
      if(!val('grupo') && $('grupo')){
        const nombre=prompt('Conectado a la sala '+room+'. ¿Cuál es el nombre o número de tu grupo? (Ej. Grupo 1):','');
        if(nombre && nombre.trim()){
          $('grupo').value=nombre.trim();
          $('grupo').dispatchEvent(new Event('input',{bubbles:true}));
        }
      }
      label();
      setStatus('✓ Equipo conectado a la sala '+room+'. Redirigiendo a la Etapa 1…');
      document.querySelector('[data-page="explora"]')?.click();
      // Si el grupo ya tenía respuestas escritas localmente, enviarlas automáticamente
      if(val('grupo') && (val('o1') || val('unidad') || val('limite') || val('h1'))){
        const inferredStage = val('h1') ? 'hipotesis' : (val('unidad')||val('limite')||val('fuenteContexto')) ? 'problema' : 'explora';
        publish(inferredStage, true);
      }
    }
  }catch(e){
    room='';
    setStatus('No se pudo entrar: '+e.message,true);
  }
}

function goTeacher(){
  role='teacher';owner=true;label();render();
  $('teacherMode').click();
}

function applyServerState(data){
  if(!data || !data.exists){
    return;
  }
  const obj=data.room||{};
  active=obj.active!==false;
  if(Array.isArray(obj.selected) && obj.selected.length){
    lastSelected=obj.selected;
  }
  $('liveFocus').value=obj.focus||'explora';
  $('liveActive').checked=active;
  if(Array.isArray(data.teams)){
    data.teams.forEach(t=>{
      const idx=teamDocs.findIndex(x=>x.id===t.id || (x.grupo && t.grupo && x.grupo.toLowerCase()===t.grupo.toLowerCase()));
      if(idx>=0){
        const merged={...teamDocs[idx]};
        for(const [k,v] of Object.entries(t)){
          if(v!==undefined && String(v).trim()!=='') merged[k]=v;
        }
        teamDocs[idx]=merged;
      } else {
        teamDocs.push(t);
      }
    });
    teamDocs.sort((a,b)=>String(a.grupo||'').localeCompare(String(b.grupo||''),'es'));
  }
  if(!lastSelected.length && teamDocs.length){
    lastSelected=teamDocs.slice(0,2).map(t=>t.id);
  }
  saveLocalRoomFallback(room,obj,teamDocs);
  render();
}

function attach(){
  label();
  stopWatchers();
  if(firebaseReady){
    unsubRoom=roomRef().onSnapshot(s=>{
      if(!s.exists){setStatus('La sala ya no existe.',true);exitRoom();return}
      const obj=s.data();
      active=obj.active;
      lastSelected=Array.isArray(obj.selected)?obj.selected:[];
      $('liveFocus').value=obj.focus||'explora';
      $('liveActive').checked=active;
      render();
    },e=>setStatus('Error en sala: '+e.message,true));
    unsubTeams=roomRef().collection('teams').onSnapshot(s=>{
      teamDocs=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.grupo.localeCompare(b.grupo,'es'));
      render();
    },e=>setStatus('Error en equipos: '+e.message,true));
  } else {
    const currentRoom=room;
    if(window.BroadcastChannel){
      try{
        bcChannel=new BroadcastChannel('mdma022_room_'+currentRoom);
        bcChannel.onmessage=ev=>{
          if(ev.data && ev.data.room){
            applyServerState({exists:true,room:ev.data.room,teams:ev.data.teams});
          }
        };
      }catch(e){}
    }
    pollCloudRelayHistory(currentRoom);
    if(window.EventSource){
      try{
        ntfySource=new EventSource(`${ntfyTopicUrl('ALL')}/sse?since=12h`);
        ntfySource.onmessage=ev=>handleRelayMessage(ev.data);
      }catch(e){}
      if(!isLocalServer && currentRoom && currentRoom!=='ALL'){
        try{
          sseSource=new EventSource(`${ntfyTopicUrl(currentRoom)}/sse?since=12h`);
          sseSource.onmessage=ev=>handleRelayMessage(ev.data);
        }catch(e){}
      }
    }
    const fetchPoll=async()=>{
      if(!room || room!==currentRoom || demo) return;
      if(isLocalServer){
        try{
          const r=await fetch(`${API_BASE}/api/rooms/${currentRoom}`);
          if(r.ok){
            const d=await r.json();
            applyServerState(d);
            return;
          }
        }catch(e){}
      }
      const loc=getLocalRoomFallback(currentRoom);
      if(loc) applyServerState({exists:true,room:loc.room,teams:loc.teams});
    };
    fetchPoll();
    if(isLocalServer && window.EventSource){
      try{
        sseSource=new EventSource(`${API_BASE}/api/rooms/${currentRoom}/stream`);
        sseSource.onmessage=ev=>{
          try{
            const d=JSON.parse(ev.data);
            applyServerState(d);
          }catch(e){}
        };
      }catch(e){}
    }
    pollTimer=setInterval(()=>{
      fetchPoll();
      pollCloudRelayHistory(currentRoom);
    }, 4000);
  }
}

function liveData(stage){
  let raw={stage,uid};
  ALL_DATA_KEYS.forEach(k=>{
    raw[k]=short(val(k), k==='grupo'?90:3000);
  });
  if(!raw.grupo) raw.grupo='Equipo sin nombre';
  return raw;
}

async function publish(stage, silent=false){
  if(!room){
    if(availableRooms.length){
      $('liveCodeInput').value=availableRooms[0].code;
      await joinRoom('student');
    } else if(!silent) {
      const entered=prompt('No estás conectado a una sala aún. Ingresa el código de sala de 6 caracteres (ej. AJLKP2):','');
      if(!entered || !entered.trim()){
        setStepStatus('Entra primero a una sala en la pestaña Inicio.',true);
        document.querySelector('[data-page="intro"]')?.click();
        return;
      }
      $('liveCodeInput').value=entered.trim().toUpperCase();
      await joinRoom('student');
    }
    if(!room) return;
  }
  if(!val('grupo')){
    if(silent) return;
    const g=prompt('Ingresa el nombre o número de tu grupo para publicar (ej. Grupo 1):','');
    if(!g || !g.trim()){
      setStepStatus('Identifica antes tu equipo.',true);
      return;
    }
    if($('grupo')){
      $('grupo').value=g.trim();
      $('grupo').dispatchEvent(new Event('input',{bubbles:true}));
      label();
    }
  }
  const data=liveData(stage);
  try{
    if(demo){
      const idx=teamDocs.findIndex(x=>x.id==='demo-real');
      let row={...data,id:'demo-real',updatedAt:new Date()};
      if(idx>=0)teamDocs[idx]=row;else teamDocs.push(row);
      render();
    } else if(firebaseReady){
      if(!active)throw Error('La sala está cerrada');
      await roomRef().collection('teams').doc(uid).set({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    } else {
      if(!active)throw Error('La sala está cerrada');
      const teamSlug = data.grupo.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24) || 'equipo';
      const teamDocId = `${uid}_${teamSlug}`;
      const row={...data,id:teamDocId,uid:teamDocId,sala:room,updatedAt:new Date().toISOString()};
      mergeIncomingTeam(row);
      publishCloudRelay(room,{kind:'team',room,team:row});
      if(isLocalServer){
        fetch(`${API_BASE}/api/rooms/${room}/teams/${encodeURIComponent(teamDocId)}`,{
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(row)
        }).catch(()=>{});
      }
      if(bcChannel){
        const loc=getLocalRoomFallback(room);
        if(loc){try{bcChannel.postMessage({room:loc.room,teams:teamDocs})}catch(e){}}
      }
    }
    if(!silent){
      setStepStatus('✓ Avance enviado en vivo a la sala '+room+' ('+stageNames[stage]+').');
      if(typeof window.MDMA_livePublished==='function')window.MDMA_livePublished();
    }
  }catch(e){
    if(!silent) setStepStatus('No se publicó: '+e.message,true);
  }
}

// Auto-sincronizar cambios mientras el estudiante escribe si ya tiene grupo asignado
let autoSyncTimer=null;
document.querySelectorAll('[data-field]').forEach(el=>{
  el.addEventListener('input',()=>{
    if(!val('grupo') || role==='teacher') return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer=setTimeout(()=>{
      if(!room && availableRooms.length) room=availableRooms[0].code;
      if(room){
        const st = val('h1') ? 'hipotesis' : (val('unidad')||val('limite')||val('fuenteContexto')) ? 'problema' : 'explora';
        publish(st, true);
      }
    }, 1500);
  });
});

function summary(d){
  const hasProblema = d.unidad || d.variable || d.limite || d.fuenteContexto || d.fuenteComposicion || d.fuenteRegistro || d.fuenteMuestreo;
  const hasHipotesis = d.h1 || d.h2 || d.contraste;
  const hasPregunta = d.pregunta || d.variables || d.datos;
  const hasMediacion = d.respuestaInicial || d.m1q || d.m2q || d.m3q || d.m4q || d.sesgo;
  return `
  <div><span class="livebadge">${safe(stageNames[d.stage]||'Avance')}</span> <b>${safe(d.grupo)}</b><span class="small"> · ${safe(d.curso||'')} ${d.sala?'· Sala '+safe(d.sala):''}</span></div>
  <div class="livesec">
    <h4>1 · Exploración (Observaciones y preguntas iniciales)</h4>
    <p style="margin:4px 0"><b>Hecho 1:</b> ${safe(d.o1||'—')}</p>
    <p style="margin:4px 0"><b>Hecho 2:</b> ${safe(d.o2||'—')}</p>
    ${(d.q1||d.q2)?`<p style="margin:4px 0"><b>Preguntas abiertas:</b> ${safe(d.q1||'')} ${d.q2?' / '+safe(d.q2):''}</p>`:''}
  </div>
  <div class="livesec">
    <h4>2 · Problematización (Niveles y fuentes de variabilidad)</h4>
    ${hasProblema?`
      <p style="margin:4px 0"><b>Unidad:</b> ${safe(d.unidad||'—')} · <b>Variable:</b> ${safe(d.variable||'—')}</p>
      <p style="margin:4px 0"><b>Límite inferencial:</b> ${safe(d.limite||'—')}</p>
      <p style="margin:4px 0"><b>Contexto:</b> ${safe(d.fuenteContexto||'—')}</p>
      <p style="margin:4px 0"><b>Composición:</b> ${safe(d.fuenteComposicion||'—')}</p>
      <p style="margin:4px 0"><b>Registro:</b> ${safe(d.fuenteRegistro||'—')}</p>
      <p style="margin:4px 0"><b>Muestreo:</b> ${safe(d.fuenteMuestreo||'—')}</p>
    `:`<p class="small" style="margin:4px 0;color:#8a5a36">El grupo pulsó publicar en esta etapa; cuando escriban o actualicen los campos de Problematización aparecerán aquí automáticamente.</p>`}
  </div>
  ${hasHipotesis?`<div class="livesec">
    <h4>3 · Hipótesis rivales</h4>
    <p style="margin:4px 0"><b>H1 (${safe(d.h1tipo||'—')}):</b> ${safe(d.h1||'—')} <i>(Predicción: ${safe(d.h1p||'—')} | Refutación: ${safe(d.h1e||'—')})</i></p>
    <p style="margin:4px 0"><b>H2 (${safe(d.h2tipo||'—')}):</b> ${safe(d.h2||'—')} <i>(Predicción: ${safe(d.h2p||'—')} | Refutación: ${safe(d.h2e||'—')})</i></p>
    <p style="margin:4px 0"><b>Contraste:</b> ${safe(d.contraste||'—')}</p>
  </div>`:''}
  ${hasPregunta?`<div class="livesec">
    <h4>4 · Pregunta investigable</h4>
    <p style="margin:4px 0"><b>Pregunta:</b> ${safe(d.pregunta||'—')}</p>
    <p style="margin:4px 0"><b>Variables / Datos:</b> ${safe(d.variables||'—')} · ${safe(d.datos||'—')}</p>
  </div>`:''}
  ${hasMediacion?`<div class="livesec">
    <h4>5 · Mediación docente</h4>
    <p style="margin:4px 0"><b>Intervenciones:</b> ${safe(d.m1q||'')} / ${safe(d.m2q||'')} / ${safe(d.m3q||'')} / ${safe(d.m4q||'')}</p>
    <p style="margin:4px 0"><b>Ante sesgo:</b> ${safe(d.sesgo||'—')}</p>
  </div>`:''}
  `;
}

function render(){
  label();
  if(typeof window.MDMA_syncLiveTeams==='function'&&teamDocs.length)window.MDMA_syncLiveTeams(teamDocs);
  $('liveCount').textContent=teamDocs.length;
  $('liveTeacherState').innerHTML=demo?'<span class="livedemo">Datos ilustrativos</span>':room?`Sala activa <span class="livecode">${safe(room)}</span> (unificada con todas las salas)`:'Todas las salas unificadas';
  const filt=$('liveFilter').value;
  // Mostrar todos los grupos cuando el filtro es 'all', o si el grupo ya tiene datos de esa etapa
  const filtered=filt==='all'?teamDocs:teamDocs.filter(d=>{
    if(d.stage===filt) return true;
    if(filt==='explora') return Boolean(d.o1||d.o2||d.q1||d.q2);
    if(filt==='problema') return Boolean(d.stage==='problema'||d.unidad||d.variable||d.limite||d.fuenteContexto||d.fuenteComposicion||d.fuenteRegistro||d.fuenteMuestreo);
    if(filt==='hipotesis') return Boolean(d.h1||d.h2||d.contraste);
    if(filt==='pregunta') return Boolean(d.pregunta);
    if(filt==='mediacion') return Boolean(d.m1q||d.m2q||d.m3q||d.m4q||d.sesgo);
    return false;
  });
  $('liveFeed').innerHTML=filtered.length?filtered.map(d=>`<label class="livechoice"><input type="checkbox" data-pick="${safe(d.id)}" ${lastSelected.includes(d.id)?'checked':''}><span><b>${safe(d.grupo)}</b> <span class="livebadge">${safe(stageNames[d.stage]||'Avance')}</span><br><span class="small">${safe(d.pregunta||d.h1||d.limite||d.o1||'(en progreso)')}</span></span></label>`).join(''):'<p class="small">Aún no hay respuestas para este filtro.</p>';
  $('liveSelectedNote').textContent=`Seleccionados: ${lastSelected.length}/2. Marca las casillas de los equipos para proyectar su comparación.`;
  $('liveCompareA').innerHTML=lastSelected[0]?(teamDocs.find(d=>d.id===lastSelected[0])?summary(teamDocs.find(d=>d.id===lastSelected[0])):'Sin respuesta'):'Selecciona el primer equipo en la lista de arriba';
  $('liveCompareB').innerHTML=lastSelected[1]?(teamDocs.find(d=>d.id===lastSelected[1])?summary(teamDocs.find(d=>d.id===lastSelected[1])):'Sin respuesta'):'Selecciona el segundo equipo en la lista de arriba';
  const allGrid=$('liveAllTeamsGrid');
  if(allGrid){
    allGrid.innerHTML=teamDocs.length?teamDocs.map(d=>`<div class="livecompare">${summary(d)}</div>`).join(''):'<p class="small">Aún no se han recibido equipos.</p>';
  }
  const focus=$('liveFocus').value||'explora';
  $('liveFocusDisplay').innerHTML=`<strong>Foco actual:</strong> ${safe(stageNames[focus]||focus)}<br><span class="small">${safe(focusText(focus))}</span>`;
  $('liveStudentFocus').innerHTML=`<strong>Consigna compartida:</strong> ${safe(stageNames[focus]||focus)} · ${safe(focusText(focus))}`;
  $('livePublish').disabled=false;
  $('liveActive').disabled=false;
  $('livePublishFocus').disabled=false;
  $('liveClearSelection').disabled=false;
}

function focusText(f){return {explora:'¿Qué diferencias muestran los indicadores y qué desconocemos?',problema:'¿Qué afirmaciones exceden la evidencia de los datos agregados?',hipotesis:'¿Qué observación permitiría distinguir dos hipótesis rivales?',pregunta:'¿Qué pregunta es investigable, para quién y con qué datos?',mediacion:'¿Qué intervención hará avanzar el razonamiento del estudiante?'}[f]||''}

async function updateRoom(update){
  if(demo){
    if(update.selected)lastSelected=update.selected;
    if(update.focus)$('liveFocus').value=update.focus;
    if('active' in update)active=update.active;
    render();
    return;
  }
  if(!room) return;
  try{
    if(firebaseReady){
      await roomRef().update(update);
    } else {
      if(update.selected)lastSelected=update.selected;
      if(update.focus)$('liveFocus').value=update.focus;
      if('active' in update)active=update.active;
      render();
      const meta={ownerUid:uid,focus:$('liveFocus').value,selected:lastSelected,active};
      publishCloudRelay(room,{kind:'room',room,meta});
      if(isLocalServer){
        fetch(`${API_BASE}/api/rooms/${room}`,{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({uid,...update})
        }).catch(()=>{});
      }
      saveLocalRoomFallback(room,meta,teamDocs);
      if(bcChannel){try{bcChannel.postMessage({room:meta,teams:teamDocs})}catch(err){}}
    }
  }catch(e){}
}

$('liveFeed').addEventListener('change',e=>{
  const input=e.target.closest('[data-pick]');
  if(!input)return;
  let ids=lastSelected.filter(id=>id!==input.dataset.pick);
  if(input.checked)ids.push(input.dataset.pick);
  if(ids.length>2){
    input.checked=false;
    setStatus('Solo puedes comparar dos equipos a la vez.',true);
    return;
  }
  updateRoom({selected:ids});
});
$('liveFilter').addEventListener('change',render);
$('livePublishFocus').addEventListener('click',()=>updateRoom({focus:$('liveFocus').value}));
$('liveClearSelection').addEventListener('click',()=>updateRoom({selected:[]}));
$('liveActive').addEventListener('change',()=>updateRoom({active:$('liveActive').checked}));
$('livePublish').addEventListener('click',()=>publish('cierre'));
document.querySelectorAll('.liveStepSend').forEach(b=>b.addEventListener('click',()=>publish(b.dataset.stage)));
$('liveJoin').addEventListener('click',()=>joinRoom('student'));
$('liveJoinTeacher').addEventListener('click',()=>joinRoom('teacher'));
$('liveCreate').addEventListener('click',createRoom);
$('liveCodeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();joinRoom('student');}});
$('liveGoLab').addEventListener('click',()=>{role='student';label();document.querySelector('[data-page="explora"]')?.click();});
$('liveGoBoard').addEventListener('click',()=>{goTeacher();});
$('liveDisconnect').addEventListener('click',()=>{if(confirm('¿Salir de la sala compartida? Las respuestas guardadas localmente no se borrarán.'))exitRoom()});

async function copyLink(){
  if(!room)return;
  const u=new URL(location.href);
  u.searchParams.set('sala',room);
  const txt=u.toString();
  try{
    await navigator.clipboard.writeText(txt);
    setStatus('Enlace copiado al portapapeles: '+txt);
  }catch(e){
    prompt('Copia el enlace para tus estudiantes:',txt);
  }
}
$('liveCopyLink').addEventListener('click',copyLink);

$('liveExport').addEventListener('click',()=>{
  const keys=['grupo','curso','sala','stage',...ALL_DATA_KEYS.filter(k=>k!=='grupo'&&k!=='curso')];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const lines=[keys.join(';'),...teamDocs.map(d=>keys.map(k=>q(d[k])).join(';'))];
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  let url=URL.createObjectURL(blob);
  let a=document.createElement('a');
  a.href=url;
  a.download='MDMA022_respuestas_en_vivo.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

$('liveDemo').addEventListener('click',()=>{
  exitRoom();
  demo=true;room='DEMO';role='teacher';owner=true;
  teamDocs=[
    {id:'d1',grupo:'Grupo demostración A',curso:'3.º medio',stage:'hipotesis',o1:'Concentración alrededor de 88,5%',o2:'Rango de 6,6 pp',unidad:'Comuna',variable:'Asistencia media (%)',limite:'No se puede inferir a individuos (falacia ecológica)',h1tipo:'Contexto',h1:'La distancia a los centros escolares podría asociarse con la asistencia.',h2tipo:'Registro',h2:'Las diferencias entre calendarios escolares podrían influir.',h1p:'Esperaríamos menores tasas cuando aumenta la distancia.',h2p:'Esperaríamos concentraciones temporales de ausencias.',h1e:'Una ausencia de asociación con distancia.',h2e:'Patrones mensuales estables.',contraste:'Cruzar asistencia y distancias, controlando otras condiciones.',pregunta:'¿Cómo se relaciona la distancia al establecimiento con la asistencia mensual?'},
    {id:'d2',grupo:'Grupo demostración B',curso:'4.º medio',stage:'pregunta',o1:'Mediana cercana a 88,6%',o2:'Valor extremo superior en comuna L (92,2%)',unidad:'Comuna',variable:'Porcentaje comunal de asistencia',limite:'El promedio comunal oculta variabilidad interna entre escuelas',h1tipo:'Composición',h1:'Las diferencias en composición de las escuelas modifican el promedio.',h2tipo:'Registro',h2:'Criterios de registro distintos podrían influir.',h1p:'Los promedios cambian al estratificar por nivel.',h2p:'Las brechas disminuyen tras armonizar registros.',h1e:'Ausencia de diferencias por nivel.',h2e:'Consistencia de los procedimientos.',contraste:'Comparar por nivel y auditar el registro.',pregunta:'¿Persisten las diferencias comunales al comparar niveles escolares equivalentes?'}
  ];
  lastSelected=['d1','d2'];
  label();render();
  setStatus('Demostración activada con dos equipos ficticios. No comparte información entre dispositivos.');
  goTeacher();
});

$('liveQuickImportJson')?.addEventListener('change',async(e)=>{
  const files=[...(e.target.files||[])];
  for(const f of files){
    try{
      const obj=JSON.parse(await f.text());
      const r=obj.respuestas||obj;
      window.MDMA_importToLive(r);
    }catch(err){}
  }
  e.target.value='';
});

const prev=$('teacherLiveCard');
function installTab(){
  let nav=$('teacherNav');
  let b=document.createElement('button');
  b.className='navbtn';
  b.innerHTML='<span class="num">◉</span><span class="navtxt">Tablero en vivo</span>';
  b.type='button';
  b.addEventListener('click',()=>{
    $('teacherMode').click();
    prev.scrollIntoView({behavior:'smooth',block:'start'});
  });
  nav.appendChild(b);
}
installTab();

const queryCode=new URLSearchParams(location.search).get('sala');
if(queryCode){
  $('liveCodeInput').value=queryCode.toUpperCase();
  setStatus('Código de sala detectado ('+queryCode.toUpperCase()+'). Conectando automáticamente…');
  setTimeout(()=>joinRoom('student'),200);
}
render();
})();
