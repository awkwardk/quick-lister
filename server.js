'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DATA_DIR = process.env.DATA_DIR || '/data/quick-lister-data';
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

function activeProvider(){
  if(GEMINI_API_KEY)return 'gemini';
  if(OPENROUTER_API_KEY)return 'openrouter';
  if(ANTHROPIC_API_KEY)return 'claude';
  return 'none';
}

console.log('[STARTUP] Gemini key found:', GEMINI_API_KEY.length > 0);
console.log('[STARTUP] OpenRouter key found:', OPENROUTER_API_KEY.length > 0);
console.log('[STARTUP] Anthropic key found:', ANTHROPIC_API_KEY.length > 0);
console.log('[STARTUP] Active AI provider:', activeProvider());
[DATA_DIR, PHOTOS_DIR].forEach(function(d){if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});});

function loadListings(){try{if(fs.existsSync(LISTINGS_FILE))return JSON.parse(fs.readFileSync(LISTINGS_FILE,'utf8'));}catch(e){}return[];}
function saveListings(l){try{fs.writeFileSync(LISTINGS_FILE,JSON.stringify(l));}catch(e){console.log('[SAVE] Error:',e.message);}}
function savePhotos(itemId,photos){var d=path.join(PHOTOS_DIR,itemId);if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});photos.forEach(function(b64,i){try{fs.writeFileSync(path.join(d,'photo_'+(i+1)+'.jpg'),Buffer.from(b64,'base64'));}catch(e){};});}
function isDuplicate(itemId){return loadListings().some(function(l){return l.itemId===itemId;});}

const PHONE_HTML=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#111111">
<title>Quick Lister</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#111;--surface:#1a1a1a;--surface2:#222;--border:#2c2c2c;--text:#f2f2f2;--muted:#666;--accent:#e8ff00;--green:#00e676;--red:#ff1744;--orange:#ff9f1c;--display:'Bebas Neue',sans-serif;--body:'Barlow',sans-serif;--mono:'DM Mono',monospace;}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;background:var(--bg);font-family:var(--body);color:var(--text);touch-action:manipulation;}
body{display:flex;flex-direction:column;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 12px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;gap:10px;}
.topbar-brand{font-family:var(--display);font-size:1.3rem;letter-spacing:0.06em;color:var(--text);white-space:nowrap;}.topbar-brand span{color:var(--accent);}
.topbar-right{font-family:var(--mono);font-size:0.6rem;letter-spacing:0.08em;color:var(--muted);text-transform:uppercase;text-align:right;}
.scroll-content{flex:1;overflow-y:auto;padding:18px 20px 32px;}
.section-title{font-family:var(--display);font-size:1.3rem;letter-spacing:0.04em;color:var(--text);margin:18px 0 8px;}
.section-title:first-child{margin-top:0;}
.btn{width:100%;padding:18px;border:none;border-radius:8px;font-family:var(--display);font-size:1.3rem;letter-spacing:0.06em;cursor:pointer;transition:all 0.15s;}
.btn-primary{background:var(--accent);color:#000;}.btn-primary:active{background:#c8df00;}
.btn-primary:disabled{background:var(--border);color:var(--muted);cursor:not-allowed;}
.btn-primary.uploading{background:var(--border);color:var(--text);cursor:wait;}
.btn-spinner{display:inline-block;width:16px;height:16px;margin-right:8px;vertical-align:-3px;border:2px solid rgba(242,242,242,0.3);border-top-color:var(--text);border-radius:50%;animation:btnspin 0.7s linear infinite;}
@keyframes btnspin{to{transform:rotate(360deg);}}
.gallery-btn{display:block;text-align:center;border:1px dashed var(--border);border-radius:8px;padding:16px;cursor:pointer;}
.gallery-btn .gb-title{font-family:var(--display);font-size:1.1rem;letter-spacing:0.05em;color:var(--text);}
.gallery-btn .gb-sub{font-family:var(--mono);font-size:0.6rem;color:var(--muted);letter-spacing:0.06em;margin-top:4px;}
.photo-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
.photo-thumbs:empty{display:none;}
.photo-thumb-wrap{position:relative;width:64px;height:64px;}
.photo-thumb-wrap img{width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border);}
.photo-thumb-wrap .rm{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;font-size:12px;line-height:20px;text-align:center;cursor:pointer;font-weight:bold;}
.text-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;color:var(--text);font-family:var(--body);font-size:1rem;line-height:1.5;outline:none;-webkit-appearance:none;}
.text-input:focus{border-color:var(--accent);}
.text-input::placeholder{color:var(--muted);}
.notes-area{resize:none;min-height:90px;margin-top:8px;}
.voice-row{display:flex;align-items:center;gap:12px;}
.mic-btn{flex-shrink:0;width:52px;height:52px;border-radius:50%;border:2px solid var(--border);background:var(--surface);color:var(--text);font-size:1.4rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.mic-btn.recording{border-color:var(--red);background:rgba(255,23,68,0.12);animation:pulse 1.1s infinite;}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,23,68,0.45);}70%{box-shadow:0 0 0 12px rgba(255,23,68,0);}100%{box-shadow:0 0 0 0 rgba(255,23,68,0);}}
.voice-status{font-family:var(--mono);font-size:0.65rem;letter-spacing:0.05em;color:var(--muted);flex:1;}
.submit-wrap{margin-top:22px;}
.queued-flash{margin-top:10px;text-align:center;font-family:var(--mono);font-size:0.7rem;letter-spacing:0.06em;color:var(--green);opacity:0;transition:opacity 0.2s;}
.queued-flash.show{opacity:1;}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-brand">QUICK<span>&#183;</span>LISTER</div>
  <div class="topbar-right" id="statusRight">0 saved</div>
</div>

<div class="scroll-content">

  <div class="section-title">Photos</div>
  <div class="photo-thumbs" id="photoThumbs"></div>
  <label for="galleryInput" class="gallery-btn">
    <div class="gb-title">&#128193; Choose from Gallery</div>
    <div class="gb-sub">Select or take multiple photos at once</div>
  </label>
  <input type="file" id="galleryInput" accept="image/*" multiple onchange="addGalleryPhotos(this)" style="display:none;">

  <div class="section-title">Spoken / Written Notes</div>
  <div class="voice-row">
    <button type="button" class="mic-btn" id="micBtn" onclick="toggleRecording()">&#127908;</button>
    <div class="voice-status" id="voiceStatus">Tap mic to speak item, brand, model &amp; condition</div>
  </div>
  <textarea class="text-input notes-area" id="notesInput" placeholder="e.g. Dell D3100 docking station, works great, light scuffs on bottom, includes cables"></textarea>

  <div class="submit-wrap">
    <button type="button" class="btn btn-primary" id="submitBtn" onclick="submitItem()">Generate Listing</button>
    <div class="queued-flash" id="queuedFlash">&#10003; Queued &#8212; generating in background</div>
  </div>

</div>

<script>
var photoB64s=[];
var savedCount=0;
var sessionCount=0;
var bgQueue=0;
var wakeLock=null;

var mediaRecorder=null;
var audioChunks=[];
var recording=false;
var recTimer=null;
var recSeconds=0;

function renderThumbs(){
  var wrap=document.getElementById('photoThumbs');
  wrap.innerHTML='';
  photoB64s.forEach(function(b64,idx){
    var d=document.createElement('div');
    d.className='photo-thumb-wrap';
    var img=document.createElement('img');
    img.src='data:image/jpeg;base64,'+b64;
    var rm=document.createElement('div');
    rm.className='rm';
    rm.textContent='\\u00d7';
    rm.onclick=function(){photoB64s.splice(idx,1);renderThumbs();};
    d.appendChild(img);d.appendChild(rm);
    wrap.appendChild(d);
  });
}

// Reads one file and downscales/recompresses it via an offscreen canvas (max 1400px on the long
// edge, JPEG q0.82) so multi-photo batches stay small over cellular. Resolves with base64 (never
// rejects) so one bad file in a batch can't take out the rest — falls back to the uncompressed
// read if the image fails to decode or canvas processing throws.
function readAndCompressImage(file){
  return new Promise(function(resolve){
    var fr=new FileReader();
    fr.onload=function(){
      var rawResult=String(fr.result||'');
      var rawB64=(function(){var c=rawResult.indexOf(',');return c>=0?rawResult.slice(c+1):rawResult;})();
      var img=new Image();
      img.onload=function(){
        try{
          var maxDim=1400;
          var w=img.naturalWidth||img.width||1,h=img.naturalHeight||img.height||1;
          var scale=Math.min(1,maxDim/Math.max(w,h));
          var outW=Math.max(1,Math.round(w*scale));
          var outH=Math.max(1,Math.round(h*scale));
          var canvas=document.createElement('canvas');
          canvas.width=outW;canvas.height=outH;
          var ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,outW,outH);
          var dataUrl=canvas.toDataURL('image/jpeg',0.82);
          var c=dataUrl.indexOf(',');
          resolve(c>=0?dataUrl.slice(c+1):rawB64);
        }catch(e){resolve(rawB64);}
      };
      img.onerror=function(){resolve(rawB64);};
      img.src=rawResult;
    };
    fr.onerror=function(){resolve(null);};
    fr.readAsDataURL(file);
  });
}

function addGalleryPhotos(input){
  var files=input.files;
  if(!files||!files.length)return;
  var arr=[];for(var i=0;i<files.length;i++)arr.push(files[i]);
  // Promise.all's results array is index-matched to the input array regardless of which file
  // finishes reading/compressing first, so the operator's original selection order (hero photo
  // first) is always preserved — a plain forEach+FileReader would race and could scramble it.
  Promise.all(arr.map(readAndCompressImage)).then(function(results){
    results.forEach(function(b64){if(b64)photoB64s.push(b64);});
    renderThumbs();
  });
  input.value='';
}

function acquireWakeLock(){if('wakeLock' in navigator){navigator.wakeLock.request('screen').then(function(wl){wakeLock=wl;}).catch(function(){});}}
function releaseWakeLock(){if(wakeLock){wakeLock.release().catch(function(){});wakeLock=null;}}

function updateMicUI(){
  var m=Math.floor(recSeconds/60), s=recSeconds%60;
  document.getElementById('voiceStatus').textContent='Recording... '+m+':'+(s<10?'0':'')+s;
}

function toggleRecording(){
  if(recording)stopRecording();else startRecording();
}

function startRecording(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){
    document.getElementById('voiceStatus').textContent='Voice capture not supported \\u2014 type notes manually';
    return;
  }
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})
  .then(function(stream){
    var mimeType='';
    if(window.MediaRecorder&&MediaRecorder.isTypeSupported){
      if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))mimeType='audio/webm;codecs=opus';
      else if(MediaRecorder.isTypeSupported('audio/webm'))mimeType='audio/webm';
      else if(MediaRecorder.isTypeSupported('audio/mp4'))mimeType='audio/mp4';
    }
    try{mediaRecorder=mimeType?new MediaRecorder(stream,{mimeType:mimeType}):new MediaRecorder(stream);}
    catch(e){mediaRecorder=new MediaRecorder(stream);}
    audioChunks=[];
    mediaRecorder.ondataavailable=function(e){if(e.data&&e.data.size>0)audioChunks.push(e.data);};
    mediaRecorder.onstop=function(){
      stream.getTracks().forEach(function(t){t.stop();});
      var blob=new Blob(audioChunks,{type:mediaRecorder.mimeType||'audio/webm'});
      sendAudioForTranscription(blob);
    };
    mediaRecorder.start();
    recording=true;
    recSeconds=0;
    document.getElementById('micBtn').classList.add('recording');
    updateMicUI();
    recTimer=setInterval(function(){recSeconds++;updateMicUI();},1000);
  })
  .catch(function(e){
    console.error('Mic error',e);
    document.getElementById('voiceStatus').textContent='Mic access denied \\u2014 type notes manually';
  });
}

function stopRecording(){
  if(mediaRecorder&&recording)mediaRecorder.stop();
  recording=false;
  clearInterval(recTimer);
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('voiceStatus').textContent='Transcribing...';
}

function sendAudioForTranscription(blob){
  fetch('/api/voice/transcribe',{method:'POST',headers:{'Content-Type':blob.type||'audio/webm'},body:blob})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d&&d.success&&d.transcript){
      var ta=document.getElementById('notesInput');
      ta.value=(ta.value.trim()?ta.value.trim()+'\\n':'')+d.transcript.trim();
      document.getElementById('voiceStatus').textContent='Tap mic to speak item, brand, model & condition';
    }else{
      document.getElementById('voiceStatus').textContent='Could not transcribe \\u2014 type notes manually';
    }
  })
  .catch(function(){
    document.getElementById('voiceStatus').textContent='Network error \\u2014 type notes manually';
  });
}

function updateStatus(){
  var txt=(savedCount+sessionCount)+' saved';
  if(bgQueue>0)txt+=' \\u00b7 '+bgQueue+' processing';
  document.getElementById('statusRight').textContent=txt;
}

function flashQueued(){
  var el=document.getElementById('queuedFlash');
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},2200);
}

function resetForm(){
  photoB64s=[];
  renderThumbs();
  document.getElementById('notesInput').value='';
  document.getElementById('voiceStatus').textContent='Tap mic to speak item, brand, model & condition';
}

function submitItem(){
  if(photoB64s.length===0){alert('Add at least one photo.');return;}
  if(recording)stopRecording();
  var itemId='item_'+Date.now();
  var photoCount=photoB64s.length;
  var payload={
    notes:document.getElementById('notesInput').value.trim(),
    photos:photoB64s.slice(),
    itemId:itemId
  };
  var btn=document.getElementById('submitBtn');
  // Multi-megabyte photos can take a while to upload over cellular — keep the button disabled and
  // visibly "uploading" for the whole request so the operator doesn't close the tab or navigate away
  // mid-upload (which would silently drop the item). Photos/notes are only cleared once the upload
  // actually succeeds, so a failed/interrupted upload never loses the operator's work.
  btn.disabled=true;
  btn.classList.add('uploading');
  btn.innerHTML='<span class="btn-spinner"></span>Uploading '+photoCount+' photo'+(photoCount!==1?'s':'')+'… stay on this screen';
  bgQueue++;
  updateStatus();
  acquireWakeLock();
  fetch('/api/generate-listing',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
  .then(function(r){return r.json();})
  .then(function(){
    sessionCount++;
    flashQueued();
    resetForm();
  })
  .catch(function(){
    alert('Upload failed — check your connection and tap Generate Listing to try again.');
  })
  .then(function(){
    bgQueue=Math.max(0,bgQueue-1);
    btn.disabled=false;
    btn.classList.remove('uploading');
    btn.textContent='Generate Listing';
    releaseWakeLock();
    updateStatus();
  });
}

window.addEventListener('load',function(){
  fetch('/api/listing-count').then(function(r){return r.json();}).then(function(d){
    savedCount=d.count||0;
    updateStatus();
  }).catch(function(){});
});

document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible'&&bgQueue>0)acquireWakeLock();
});
</script>
</body>
</html>`;
const LISTINGS_HTML="<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Quick Lister — Listings</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0;}\nbody{font-family:Arial,sans-serif;background:#f0f0f0;padding:24px;min-height:100vh;}\n.topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px;}\n.topbar-left h1{font-size:22px;color:#1a1a1a;margin-bottom:4px;}\n.meta{font-size:13px;color:#888;}\n.actions{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}\n.btn{padding:10px 18px;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;transition:background 0.15s;white-space:nowrap;}\n.btn-new{background:#2e7d32;color:#fff;}.btn-new:hover{background:#1b5e20;}\n.btn-clear{background:#ff1744;color:#fff;}.btn-clear:hover{background:#d50000;}\n.btn-refresh{background:#455a64;color:#fff;}.btn-refresh:hover{background:#37474f;}\n.empty{text-align:center;padding:80px 20px;color:#aaa;font-size:14px;line-height:1.8;}\n.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.12);margin-bottom:28px;overflow:hidden;}\n.card-header{padding:12px 18px;color:#fff;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}\n.card-num{background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:13px;font-weight:bold;flex-shrink:0;}\n.card-title-text{font-size:15px;font-weight:bold;flex:1;}\n.card-time{font-size:11px;opacity:0.7;white-space:nowrap;}\n.del-link{margin-left:auto;color:#fff;background:rgba(255,255,255,0.22);font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;cursor:pointer;}\n.del-link:hover{background:#c62828;}\n.del-confirm{background:#fff3f3;border-bottom:1px solid #ffcdd2;padding:10px 18px;font-size:13px;color:#b71c1c;}\n.btn-yesdel{background:#c62828;color:#fff;border:none;border-radius:4px;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;margin-left:8px;}\n.btn-canceldel{background:#e0e0e0;color:#333;border:none;border-radius:4px;padding:6px 12px;font-size:12px;cursor:pointer;}\n.del-err{color:#c62828;font-size:12px;margin-left:8px;}\n.price-bar{background:#f5f5f5;padding:8px 18px;display:flex;gap:20px;font-size:13px;color:#444;border-bottom:1px solid #e0e0e0;flex-wrap:wrap;}\n.price-bar b{color:#1a1a1a;}\n.price-note-bar{background:#fffde7;padding:6px 18px;font-size:11px;color:#795548;border-bottom:1px solid #e0e0e0;font-style:italic;}\n.card-body{padding:16px 18px;}\n.copy-row{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}\n.copy-btn{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;transition:background 0.15s;}\n.copy-title-btn{background:#1565c0;color:#fff;}\n.copy-cond-btn{background:#37474f;color:#fff;}\n.copy-html-btn{background:#2e7d32;color:#fff;}\n.dl-btn{background:#e65100;color:#fff;}\n.rgbtn{background:#455a64;color:#fff;}\n.copy-btn.flashed{background:#4caf50!important;}\n.field-label{font-size:11px;font-weight:bold;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;margin-top:14px;}\n.field-value{font-size:13px;color:#333;line-height:1.6;background:#f9f9f9;padding:10px 12px;border-radius:4px;border:1px solid #e0e0e0;}\n.photo-strip{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}\n.photo-thumb{width:100px;height:75px;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;cursor:pointer;}\n.photo-thumb:hover{border-color:#1565c0;}\ntextarea.hidden-ta{display:none;}\n.status-proc{display:flex;align-items:center;gap:10px;color:#e65100;font-size:14px;font-weight:bold;margin-bottom:10px;}\n.spinner{width:16px;height:16px;border:2px solid #ddd;border-top-color:#e65100;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;}\n@keyframes spin{to{transform:rotate(360deg);}}\n.fail-msg{color:#c62828;font-weight:bold;font-size:14px;margin-bottom:10px;}\n.regen-panel{margin-top:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:12px;}\n.regen-panel .rl{display:block;font-size:12px;font-weight:bold;color:#555;margin-bottom:4px;}\n.regen-panel .ri,.regen-panel .rt{width:100%;border:1px solid #ccc;border-radius:6px;padding:8px;font-size:13px;font-family:inherit;margin-bottom:4px;}\n.regen-panel .rt{min-height:60px;resize:vertical;margin-bottom:10px;}\n.regen-panel .rh{font-size:11px;color:#888;margin-bottom:10px;}\n.btn-regnow{background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer;}\n.rcancel{color:#1565c0;font-size:13px;cursor:pointer;margin-left:10px;}\n.regerr{color:#c62828;font-size:12px;margin-left:8px;display:none;}\n#uploadModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:flex-start;justify-content:center;overflow:auto;padding:30px 16px;}\n.um-card{background:#fff;border-radius:10px;max-width:520px;width:100%;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,0.3);}\n.um-card h2{font-size:20px;color:#1a1a1a;margin-bottom:6px;}\n.um-lbl{font-size:12px;font-weight:bold;color:#555;display:block;margin-bottom:4px;}\n.um-in{width:100%;border:1px solid #ccc;border-radius:6px;padding:10px;font-size:13px;font-family:inherit;margin-bottom:4px;}\n.um-help{font-size:11px;color:#888;margin-bottom:16px;}\n.ug-btn{padding:10px 6px;border:2px solid #ccc;border-radius:8px;background:#fafafa;cursor:pointer;font-size:18px;font-weight:bold;color:#333;display:flex;flex-direction:column;align-items:center;gap:2px;}\n.ug-btn span{font-size:10px;font-weight:normal;color:#888;}\n.ug-btn.sel{border-color:#2e7d32;background:#e8f5e9;color:#1b5e20;}\n</style>\n</head>\n<body>\n<div class=\"topbar\">\n  <div class=\"topbar-left\">\n    <h1>Quick Lister — Saved Listings</h1>\n    <div class=\"meta\" id=\"metaLine\">Loading...</div>\n  </div>\n  <div class=\"actions\">\n    <button class=\"btn btn-new\" onclick=\"openUploadModal()\">+ New Listing from Photos</button>\n    <button class=\"btn btn-refresh\" onclick=\"refresh()\">Refresh</button>\n    <button class=\"btn btn-clear\" onclick=\"clearAll()\">Clear All</button>\n  </div>\n</div>\n\n<div id=\"uploadModal\">\n  <div class=\"um-card\">\n    <h2>Upload Photos to Generate Listing</h2>\n    <label class=\"um-lbl\">Brand & Model (optional)</label>\n    <input type=\"text\" id=\"uploadBrandModel\" class=\"um-in\" placeholder=\"e.g. Dell D3100 docking station, Lot of 5 Cisco SG110-16 switches, HP 92A toner cartridge\">\n    <div class=\"um-help\">If left blank AI will identify the item from your photos.</div>\n    <label class=\"um-lbl\">Photos</label>\n    <input type=\"file\" id=\"uploadFiles\" accept=\"image/*\" multiple onchange=\"document.getElementById('uploadFileCount').textContent=this.files.length+' file(s) selected';\" class=\"um-in\">\n    <div class=\"um-help\">Select all photos for one item. You can select multiple photos at once. <span id=\"uploadFileCount\"></span></div>\n    <label class=\"um-lbl\">Condition / Testing Notes (optional)</label>\n    <textarea id=\"uploadNotes\" class=\"um-in\" style=\"min-height:80px;resize:vertical;\" placeholder=\"e.g. tested working, missing power adapter, screen has small scratch bottom right\"></textarea>\n    <label class=\"um-lbl\">Condition Grade</label>\n    <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:6px 0 18px;\">\n      <button type=\"button\" class=\"ug-btn\" data-grade=\"A\" onclick=\"selectUploadGrade(this)\">A<span>Like New</span></button>\n      <button type=\"button\" class=\"ug-btn\" data-grade=\"B\" onclick=\"selectUploadGrade(this)\">B<span>Good</span></button>\n      <button type=\"button\" class=\"ug-btn\" data-grade=\"C\" onclick=\"selectUploadGrade(this)\">C<span>Heavy Wear</span></button>\n      <button type=\"button\" class=\"ug-btn\" data-grade=\"D\" onclick=\"selectUploadGrade(this)\">D<span>Parts/Untested</span></button>\n    </div>\n    <div id=\"uploadError\" style=\"display:none;background:#ffebee;border:1px solid #c62828;color:#b71c1c;padding:10px 12px;border-radius:6px;font-size:13px;margin-bottom:14px;\"></div>\n    <button class=\"btn btn-new\" id=\"uploadGenBtn\" onclick=\"doUpload()\" style=\"width:100%;\">Generate Listing</button>\n    <div style=\"text-align:center;margin-top:10px;\"><span onclick=\"closeUploadModal()\" style=\"color:#1565c0;font-size:13px;cursor:pointer;\">Cancel</span></div>\n  </div>\n</div>\n\n<div id=\"listingsContainer\"><div class=\"empty\">Loading...</div></div>\n<script>\nfunction esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}\nfunction copyBtn(btn){var el=document.getElementById(btn.getAttribute('data-target'));if(!el)return;var isArea=btn.getAttribute('data-area')==='1';var val=isArea?el.value:el.textContent;navigator.clipboard.writeText(val.trim()).then(function(){var o=btn.textContent;btn.classList.add('flashed');btn.textContent='Copied!';setTimeout(function(){btn.classList.remove('flashed');btn.textContent=o;},1500);});}\nfunction downloadPhotos(btn){var id=btn.getAttribute('data-id');var count=parseInt(btn.getAttribute('data-count'),10)||0;var title=btn.getAttribute('data-title')||'';var safe=title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30);for(var i=1;i<=count;i++){(function(idx){setTimeout(function(){var a=document.createElement('a');a.href='/api/photo/'+id+'/'+idx;a.download=safe+'_photo'+idx+'.jpg';document.body.appendChild(a);a.click();document.body.removeChild(a);},(idx-1)*500);})(i);}}\nfunction clearAll(){if(!confirm('Clear all listings and photos? This cannot be undone.'))return;fetch('/api/clear-listings',{method:'POST'}).then(function(){location.reload();});}\nfunction refresh(){location.reload();}\nvar uploadGrade='B';\nfunction openUploadModal(){uploadGrade='B';document.getElementById('uploadBrandModel').value='';document.getElementById('uploadFiles').value='';document.getElementById('uploadNotes').value='';document.getElementById('uploadFileCount').textContent='';var e=document.getElementById('uploadError');e.style.display='none';e.textContent='';var b=document.getElementById('uploadGenBtn');b.disabled=false;b.textContent='Generate Listing';Array.prototype.forEach.call(document.querySelectorAll('.ug-btn'),function(x){x.classList.toggle('sel',x.getAttribute('data-grade')==='B');});document.getElementById('uploadModal').style.display='flex';}\nfunction closeUploadModal(){document.getElementById('uploadModal').style.display='none';}\nfunction selectUploadGrade(btn){uploadGrade=btn.getAttribute('data-grade');Array.prototype.forEach.call(document.querySelectorAll('.ug-btn'),function(x){x.classList.remove('sel');});btn.classList.add('sel');}\nfunction readFileB64(file){return new Promise(function(resolve,reject){var fr=new FileReader();fr.onload=function(){var v=String(fr.result||'');var c=v.indexOf(',');resolve(c>=0?v.slice(c+1):v);};fr.onerror=function(){reject(new Error('read failed'));};fr.readAsDataURL(file);});}\nfunction doUpload(){var files=document.getElementById('uploadFiles').files;var err=document.getElementById('uploadError');err.style.display='none';if(!files||files.length===0){err.textContent='Please select at least one photo.';err.style.display='block';return;}var bm=document.getElementById('uploadBrandModel').value;var notes=document.getElementById('uploadNotes').value;var btn=document.getElementById('uploadGenBtn');btn.disabled=true;btn.textContent='Generating listing...';var arr=[];for(var i=0;i<files.length;i++)arr.push(files[i]);Promise.all(arr.map(readFileB64)).then(function(b64s){return fetch('/api/generate-from-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({photos:b64s,grade:uploadGrade,notes:notes,brand_model:bm})});}).then(function(r){return r.json();}).then(function(d){if(d&&d.success){closeUploadModal();location.reload();}else{btn.disabled=false;btn.textContent='Generate Listing';err.textContent=(d&&d.error)?d.error:'Upload failed - try again';err.style.display='block';}}).catch(function(){btn.disabled=false;btn.textContent='Generate Listing';err.textContent='Network error - try again';err.style.display='block';});}\nvar COLORS=['#1565c0','#2e7d32','#e65100','#6a1b9a','#00838f','#c62828','#37474f','#558b2f'];\nfunction regenControls(id){return '<div style=\"margin-top:12px;\"><button class=\"copy-btn rgbtn\" data-id=\"'+id+'\" onclick=\"toggleRegen(this)\">&#8634; Regenerate</button></div>'\n+'<div class=\"regen-panel\" id=\"regenpanel_'+id+'\" style=\"display:none;\">'\n+'<label class=\"rl\">Brand & Model (optional)</label>'\n+'<input type=\"text\" class=\"ri\" id=\"rbm_'+id+'\" placeholder=\"e.g. Dell D3100 docking station\">'\n+'<div class=\"rh\">Leave blank to re-identify from photos</div>'\n+'<label class=\"rl\">Additional Notes (optional)</label>'\n+'<textarea class=\"rt\" id=\"rnotes_'+id+'\" placeholder=\"e.g. item is actually a lot of 3, missing power adapter, screen cracked top left\"></textarea>'\n+'<div><button class=\"btn-regnow\" id=\"regnow_'+id+'\" data-id=\"'+id+'\" onclick=\"doRegenerate(this)\">Regenerate Now</button> <span class=\"rcancel\" data-id=\"'+id+'\" onclick=\"cancelRegen(this)\">Cancel</span> <span class=\"regerr\" id=\"regerr_'+id+'\"></span></div>'\n+'</div>';}\nfunction renderCard(item,i){\n  var id=item.itemId||'';\n  var status=item.status||'complete';\n  var color=COLORS[i%COLORS.length];\n  var time=item.timestamp?new Date(item.timestamp).toLocaleString():'';\n  var photoCount=item.photoCount||0;\n  var titleText=(status==='processing')?'Processing...':(item.title||'(untitled)');\n  var photoStrip='';\n  if(photoCount>0&&id){var thumbs='';for(var p=1;p<=Math.min(photoCount,8);p++){thumbs+='<img class=\"photo-thumb\" src=\"/api/photo/'+id+'/'+p+'\" onclick=\"window.open(this.src)\" title=\"Click to view full size\">';}photoStrip='<div class=\"field-label\">Photos ('+photoCount+')</div><div class=\"photo-strip\">'+thumbs+'</div>';}\n  var body='';\n  if(status==='processing'){\n    body='<div class=\"card-body\"><div class=\"status-proc\"><span class=\"spinner\"></span> Generating listing... this takes about a minute.</div>'+photoStrip+regenControls(id)+'</div>';\n  }else if(status==='failed'){\n    body='<div class=\"card-body\"><div class=\"fail-msg\">Generation failed'+(item.error?(': '+esc(item.error)):'')+'</div>'+photoStrip+regenControls(id)+'</div>';\n  }else{\n    var price=item.suggested_price?'$'+item.suggested_price:'--';\n    var accept=item.accept_price?'$'+item.accept_price:'--';\n    var decline=item.decline_price?'$'+item.decline_price:'--';\n    var dl=(photoCount>0&&id)?'<button class=\"copy-btn dl-btn\" data-id=\"'+id+'\" data-count=\"'+photoCount+'\" data-title=\"'+esc(item.title||'')+'\" onclick=\"downloadPhotos(this)\">&#8595; '+photoCount+' Photos</button>':'';\n    body=(item.price_note?'<div class=\"price-note-bar\">'+esc(item.price_note)+'</div>':'')\n    +'<div class=\"price-bar\"><span><b>List:</b> '+price+'</span><span><b>Accept:</b> '+accept+'</span><span><b>Decline:</b> '+decline+'</span></div>'\n    +'<div class=\"card-body\">'\n    +'<div class=\"copy-row\">'\n    +'<button class=\"copy-btn copy-title-btn\" data-target=\"t_'+id+'\" onclick=\"copyBtn(this)\">Copy Title</button>'\n    +'<button class=\"copy-btn copy-cond-btn\" data-target=\"c_'+id+'\" onclick=\"copyBtn(this)\">Copy Condition</button>'\n    +'<button class=\"copy-btn copy-html-btn\" data-target=\"h_'+id+'\" data-area=\"1\" onclick=\"copyBtn(this)\">Copy HTML</button>'\n    +dl\n    +'</div>'\n    +'<div class=\"field-label\">Title</div><div class=\"field-value\" id=\"t_'+id+'\">'+esc(item.title)+'</div>'\n    +'<div class=\"field-label\">Condition Box</div><div class=\"field-value\" id=\"c_'+id+'\">'+esc(item.condition_box)+'</div>'\n    +'<div class=\"field-label\">HTML Description</div><div class=\"field-value\" style=\"font-size:12px;max-height:80px;overflow:hidden;opacity:0.7;\">'+(item.description_html||'')+'</div>'\n    +'<textarea class=\"hidden-ta\" id=\"h_'+id+'\">'+(item.description_html||'')+'</textarea>'\n    +photoStrip+regenControls(id)\n    +'</div>';\n  }\n  return '<div class=\"card\" id=\"card_'+id+'\" data-item-id=\"'+id+'\" data-status=\"'+status+'\">'\n  +'<div class=\"card-header\" style=\"background:'+color+';\">'\n  +'<span class=\"card-num\">'+(i+1)+'</span>'\n  +'<span class=\"card-title-text\">'+esc(titleText)+'</span>'\n  +'<span class=\"card-time\">'+time+'</span>'\n  +'<span class=\"del-link\" data-id=\"'+id+'\" onclick=\"askDelete(this)\">&#10005; Delete</span>'\n  +'</div>'\n  +'<div class=\"del-confirm\" id=\"delconfirm_'+id+'\" style=\"display:none;\">Remove this listing? This cannot be undone. <button class=\"btn-yesdel\" data-id=\"'+id+'\" onclick=\"confirmDelete(this)\">Yes, Delete</button> <button class=\"btn-canceldel\" data-id=\"'+id+'\" onclick=\"cancelDelete(this)\">Cancel</button> <span class=\"del-err\" id=\"delerr_'+id+'\"></span></div>'\n  +body\n  +'</div>';\n}\nfunction renderAll(items){\n  var c=document.getElementById('listingsContainer');\n  document.getElementById('metaLine').textContent=items.length+' listing'+(items.length!==1?'s':'')+' saved';\n  if(!items.length){c.innerHTML='<div class=\"empty\">No listings saved yet.<br>Generate from your phone, or use + New Listing from Photos above.</div>';return;}\n  c.innerHTML=items.map(renderCard).join('');\n}\nvar pollTimer=null;\nfunction startPollingIfNeeded(items){var anyProc=items.some(function(it){return (it.status||'complete')==='processing';});if(anyProc&&!pollTimer){pollTimer=setInterval(pollOnce,5000);}else if(!anyProc&&pollTimer){clearInterval(pollTimer);pollTimer=null;}}\nfunction pollOnce(){fetch('/api/get-listings').then(function(r){return r.json();}).then(function(data){var items=data.listings||[];items.forEach(function(it,i){var card=document.getElementById('card_'+it.itemId);if(card&&card.getAttribute('data-status')!==(it.status||'complete')){var tmp=document.createElement('div');tmp.innerHTML=renderCard(it,i);if(tmp.firstChild)card.parentNode.replaceChild(tmp.firstChild,card);}});startPollingIfNeeded(items);}).catch(function(){});}\nfunction refreshNow(){fetch('/api/get-listings').then(function(r){return r.json();}).then(function(data){var items=data.listings||[];renderAll(items);startPollingIfNeeded(items);}).catch(function(){var c=document.getElementById('listingsContainer');c.innerHTML='<div class=\"empty\">Could not reach server. Hit Refresh.</div>';});}\nfunction toggleRegen(btn){var id=btn.getAttribute('data-id');var p=document.getElementById('regenpanel_'+id);if(p)p.style.display=(p.style.display==='none'||!p.style.display)?'block':'none';}\nfunction cancelRegen(el){var id=el.getAttribute('data-id');var p=document.getElementById('regenpanel_'+id);if(p)p.style.display='none';}\nfunction doRegenerate(btn){var id=btn.getAttribute('data-id');var bm=(document.getElementById('rbm_'+id)||{}).value||'';var notes=(document.getElementById('rnotes_'+id)||{}).value||'';var err=document.getElementById('regerr_'+id);if(err){err.style.display='none';err.textContent='';}btn.disabled=true;btn.textContent='Regenerating...';fetch('/api/regenerate/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand_model:bm,notes:notes})}).then(function(r){return r.json();}).then(function(d){if(d&&(d.success||d.status==='processing')){refreshNow();}else{btn.disabled=false;btn.textContent='Regenerate Now';if(err){err.textContent=(d&&d.error)?d.error:'Failed';err.style.display='inline';}}}).catch(function(){btn.disabled=false;btn.textContent='Regenerate Now';if(err){err.textContent='Network error';err.style.display='inline';}});}\nfunction askDelete(el){var id=el.getAttribute('data-id');var c=document.getElementById('delconfirm_'+id);if(c)c.style.display='block';}\nfunction cancelDelete(el){var id=el.getAttribute('data-id');var c=document.getElementById('delconfirm_'+id);if(c)c.style.display='none';}\nfunction confirmDelete(el){var id=el.getAttribute('data-id');var err=document.getElementById('delerr_'+id);if(err){err.textContent='';}el.disabled=true;el.textContent='Deleting...';fetch('/api/listing/'+encodeURIComponent(id),{method:'DELETE'}).then(function(r){return r.json();}).then(function(d){if(d&&d.success){var card=document.getElementById('card_'+id);if(card&&card.parentNode)card.parentNode.removeChild(card);}else{el.disabled=false;el.textContent='Yes, Delete';if(err){err.textContent=(d&&d.error)?d.error:'Delete failed';}}}).catch(function(){el.disabled=false;el.textContent='Yes, Delete';if(err){err.textContent='Network error';}});}\nrefreshNow();\n</script>\n</body>\n</html>";

function httpsPostJSON(hostname,path,headers,bodyObj,callback){
  var body=JSON.stringify(bodyObj);
  var h={'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)};
  for(var k in headers){if(Object.prototype.hasOwnProperty.call(headers,k))h[k]=headers[k];}
  var opts={hostname:hostname,path:path,method:'POST',headers:h};
  var req=https.request(opts,function(res){
    var data='';
    res.on('data',function(c){data+=c;});
    res.on('end',function(){callback(null,res.statusCode,data);});
  });
  req.on('error',function(e){callback(e);});
  req.write(body);req.end();
}

function extractText(c){return(c||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('');}

// --- Multi-provider AI callers -------------------------------------------
// Every caller normalizes to callback(err, plainTextResponse) so downstream
// code (extractJSON etc) does not need to know which provider answered.

function callGemini(params,callback){
  var parts=[{text:params.text||''}];
  (params.images||[]).forEach(function(b64){parts.push({inline_data:{mime_type:'image/jpeg',data:b64}});});
  // thinkingBudget:0 disables Gemini 2.5 Flash's default thinking mode, which otherwise prepends an
  // internal-reasoning part (thought:true) ahead of the actual answer and breaks JSON parsing.
  var generationConfig={maxOutputTokens:params.maxTokens||1500,thinkingConfig:{thinkingBudget:0}};
  // response_mime_type forces strict JSON output, which is the biggest lever against "could not parse
  // listing" errors — but the Gemini API rejects it when the google_search tool is attached, so it can
  // only be forced on the tool-free (vision) call. The search call still asks for JSON via the prompt
  // and leans on extractJSON's tolerant parsing instead.
  if(!params.useSearch)generationConfig.response_mime_type='application/json';
  var body={system_instruction:{parts:[{text:params.system||''}]},contents:[{role:'user',parts:parts}],generationConfig:generationConfig};
  if(params.useSearch)body.tools=[{google_search:{}}];
  httpsPostJSON('generativelanguage.googleapis.com','/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(GEMINI_API_KEY),{},body,function(err,status,data){
    if(err){callback(err);return;}
    console.log('[GEMINI] Status:',status);
    if(status!==200)console.log('[GEMINI] Error:',data.slice(0,300));
    try{
      var j=JSON.parse(data);
      var respParts=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[];
      // Even with thinking disabled, filter out any thought:true parts defensively so extractJSON
      // never sees the model's internal reasoning monologue instead of the final JSON answer.
      var answerText=respParts.filter(function(p){return !p.thought;}).map(function(p){return p.text||'';}).join('');
      if(!answerText){callback(new Error('Empty Gemini response'));return;}
      callback(null,answerText);
    }catch(e){callback(e);}
  });
}

function callOpenRouter(params,callback){
  var content=[{type:'text',text:params.text||''}];
  (params.images||[]).forEach(function(b64){content.push({type:'image_url',image_url:{url:'data:image/jpeg;base64,'+b64}});});
  var model='google/gemini-2.5-flash'+(params.useSearch?':online':'');
  var body={model:model,max_tokens:params.maxTokens||1500,messages:[{role:'system',content:params.system||''},{role:'user',content:content}],response_format:{type:'json_object'}};
  httpsPostJSON('openrouter.ai','/api/v1/chat/completions',{'Authorization':'Bearer '+OPENROUTER_API_KEY},body,function(err,status,data){
    if(err){callback(err);return;}
    console.log('[OPENROUTER] Status:',status);
    if(status!==200)console.log('[OPENROUTER] Error:',data.slice(0,300));
    try{
      var j=JSON.parse(data);
      var txt=(j.choices&&j.choices[0]&&j.choices[0].message)?j.choices[0].message.content:'';
      if(!txt){callback(new Error('Empty OpenRouter response'));return;}
      callback(null,txt);
    }catch(e){callback(e);}
  });
}

function callClaudeAI(params,callback){
  var content=[{type:'text',text:params.text||''}];
  (params.images||[]).forEach(function(b64){content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}});});
  var payload={model:'claude-sonnet-4-5',max_tokens:params.maxTokens||1500,system:params.system||'',messages:[{role:'user',content:content}]};
  if(params.useSearch)payload.tools=[{type:'web_search_20250305',name:'web_search'}];
  httpsPostJSON('api.anthropic.com','/v1/messages',{'x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},payload,function(err,status,data){
    if(err){callback(err);return;}
    console.log('[CLAUDE] Status:',status);
    if(status!==200)console.log('[CLAUDE] Error:',data.slice(0,300));
    try{
      var j=JSON.parse(data);
      if(j.type==='error'){callback(new Error('Claude API error'));return;}
      var txt=extractText(j.content);
      if(!txt){callback(new Error('Empty Claude response'));return;}
      callback(null,txt);
    }catch(e){callback(e);}
  });
}

// Unified entry point: routes to whichever provider has a key configured,
// in priority order Gemini -> OpenRouter -> Claude. Same params shape for all.
function callAI(params,callback){
  var provider=activeProvider();
  if(provider==='gemini')callGemini(params,callback);
  else if(provider==='openrouter')callOpenRouter(params,callback);
  else if(provider==='claude')callClaudeAI(params,callback);
  else callback(new Error('No AI provider API key configured'));
}

// Reads a raw (non-JSON) request body, e.g. an uploaded audio blob. Caps size to avoid abuse.
function readRawBody(req,cb){
  var chunks=[],size=0,limit=20*1024*1024,failed=false;
  req.on('data',function(c){
    if(failed)return;
    size+=c.length;
    if(size>limit){failed=true;cb(new Error('Payload too large'));req.destroy();return;}
    chunks.push(c);
  });
  req.on('end',function(){if(!failed)cb(null,Buffer.concat(chunks));});
  req.on('error',function(e){if(!failed)cb(e);});
}

// Transcribes an audio recording via Gemini 2.5 Flash (direct API, falling back to OpenRouter).
// Claude is not used here — it has no audio input support. Returns callback(err, transcriptText).
function transcribeAudio(audioB64,mimeType,callback){
  var sysPrompt='You are an expert audio transcriber for an electronics and merchandise reselling warehouse. Accurately transcribe the spoken audio verbatim. Pay special attention to quiet speech, alphanumeric model numbers, accessories, testing notes, and cosmetic flaw descriptions. Output ONLY the clean transcribed text without markdown formatting or commentary.';
  if(GEMINI_API_KEY){
    var parts=[{text:'Transcribe this audio recording.'},{inline_data:{mime_type:mimeType||'audio/webm',data:audioB64}}];
    var body={system_instruction:{parts:[{text:sysPrompt}]},contents:[{role:'user',parts:parts}],generationConfig:{maxOutputTokens:800}};
    httpsPostJSON('generativelanguage.googleapis.com','/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(GEMINI_API_KEY),{},body,function(err,status,data){
      if(err){callback(err);return;}
      console.log('[VOICE][GEMINI] Status:',status);
      if(status!==200)console.log('[VOICE][GEMINI] Error:',data.slice(0,300));
      try{
        var j=JSON.parse(data);
        var cand=(j.candidates&&j.candidates[0])||null;
        var txt=(cand&&cand.content&&cand.content.parts)?cand.content.parts.filter(function(p){return p.text;}).map(function(p){return p.text;}).join(''):'';
        if(!txt){callback(new Error('Empty transcript'));return;}
        callback(null,txt);
      }catch(e){callback(e);}
    });
    return;
  }
  if(OPENROUTER_API_KEY){
    var content=[{type:'text',text:'Transcribe this audio recording.'},{type:'input_audio',input_audio:{data:audioB64,format:(mimeType&&mimeType.indexOf('wav')>=0)?'wav':'webm'}}];
    var obody={model:'google/gemini-2.5-flash',max_tokens:800,messages:[{role:'system',content:sysPrompt},{role:'user',content:content}]};
    httpsPostJSON('openrouter.ai','/api/v1/chat/completions',{'Authorization':'Bearer '+OPENROUTER_API_KEY},obody,function(err,status,data){
      if(err){callback(err);return;}
      console.log('[VOICE][OPENROUTER] Status:',status);
      if(status!==200)console.log('[VOICE][OPENROUTER] Error:',data.slice(0,300));
      try{
        var j=JSON.parse(data);
        var txt=(j.choices&&j.choices[0]&&j.choices[0].message)?j.choices[0].message.content:'';
        if(!txt){callback(new Error('Empty transcript'));return;}
        callback(null,txt);
      }catch(e){callback(e);}
    });
    return;
  }
  callback(new Error('No transcription provider configured'));
}

// Finds the outermost {...} object in a string, ignoring braces that appear inside quoted string
// values (the naive brace-counter this replaced would get confused by e.g. "{" inside description_html).
function findOutermostObject(text){
  var depth=0,start=-1,inStr=false,esc=false;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(inStr){
      if(esc){esc=false;}
      else if(ch==='\\'){esc=true;}
      else if(ch==='"'){inStr=false;}
      continue;
    }
    if(ch==='"'){inStr=true;continue;}
    if(ch==='{'){if(depth===0)start=i;depth++;}
    else if(ch==='}'&&depth>0){depth--;if(depth===0&&start!==-1)return text.slice(start,i+1);}
  }
  return null;
}

// AI responses frequently contain a literal newline/tab inside a string value (instead of an escaped
// \n), which breaks JSON.parse outright. Walks the string char-by-char and escapes control characters
// that appear inside quoted values, leaving everything outside strings untouched.
function sanitizeJSONControlChars(s){
  var out='',inStr=false,esc=false;
  for(var i=0;i<s.length;i++){
    var ch=s[i];
    if(inStr){
      if(esc){out+=ch;esc=false;continue;}
      if(ch==='\\'){out+=ch;esc=true;continue;}
      if(ch==='"'){inStr=false;out+=ch;continue;}
      var code=ch.charCodeAt(0);
      if(code===10){out+='\\n';continue;}
      if(code===13){out+='\\r';continue;}
      if(code===9){out+='\\t';continue;}
      if(code<0x20)continue; // drop other stray control chars
      out+=ch;
      continue;
    }
    if(ch==='"'){inStr=true;}
    out+=ch;
  }
  return out;
}

// Last-resort fallback when the object still won't parse (e.g. an unescaped quote deep inside one
// field). Pulls out individual "key": value pairs with a regex instead of losing the whole listing —
// good enough to rescue title/price/grade even if description_html is malformed.
function regexFallbackParse(s){
  var result={},found=false;
  var re=/"([a-zA-Z0-9_]+)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?)|(true|false|null))/g;
  var m;
  while((m=re.exec(s))!==null){
    found=true;
    var key=m[1];
    if(m[2]!==undefined){try{result[key]=JSON.parse('"'+m[2]+'"');}catch(e){result[key]=m[2];}}
    else if(m[3]!==undefined)result[key]=parseFloat(m[3]);
    else if(m[4]!==undefined)result[key]=(m[4]==='true')?true:(m[4]==='false'?false:null);
  }
  return found?result:null;
}

// Resilient JSON extraction for AI responses: strips markdown code fences, locates the outermost
// JSON object, and if a straight JSON.parse fails, sanitizes control characters and retries, then
// falls back to pulling out individual key/value pairs with regex rather than returning nothing.
function extractJSON(text){
  if(!text)return null;
  var raw=String(text);

  var fenced=raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  var candidate=fenced?fenced[1]:raw;

  var slice=findOutermostObject(candidate)||findOutermostObject(raw);
  if(!slice)return null;

  try{return JSON.parse(slice);}catch(e){}

  var sanitized=sanitizeJSONControlChars(slice);
  try{return JSON.parse(sanitized);}catch(e2){
    console.log('[EXTRACTJSON] JSON.parse failed after sanitize:',e2.message);
    console.log('[EXTRACTJSON] Raw text (truncated):',raw.slice(0,2000));
  }

  var fallback=regexFallbackParse(sanitized);
  if(fallback){console.log('[EXTRACTJSON] Recovered via regex fallback');return fallback;}

  return null;
}

function parseBody(req,cb){var b='';req.on('data',function(c){b+=c;});req.on('end',function(){try{cb(null,JSON.parse(b));}catch(e){cb(new Error('Bad JSON'));}});}
function sendJSON(res,code,obj){res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));}

// Patch a listing record (by itemId) in listings.json. Best-effort, never throws.
function updateListingRecord(itemId,patch){try{var ls=loadListings();for(var i=0;i<ls.length;i++){if(ls[i].itemId===itemId){for(var k in patch){if(Object.prototype.hasOwnProperty.call(patch,k))ls[i][k]=patch[k];}break;}}saveListings(ls);}catch(e){console.log('[GEN] record update error:',e.message);}}

// Shared background two-step Claude pipeline (same prompts as /api/generate-listing). Fire-and-forget:
// updates the listing record to status 'complete' or 'failed'. brandModel, when provided, is used as the
// primary identifier in both steps. tag is 'UPLOAD' or 'REGEN' for logging. Never crashes the server.
function runGeneration(itemId,photos,grade,notes,brandModel,tag){
  try{
    tag=tag||'UPLOAD';
    var doneWord=(tag==='REGEN')?'regenerated':'generated';
    var gradeNames={A:'Like New / Open Box',B:'Good - Normal Used',C:'Fair - Heavy Wear',D:'Parts/Untested'};
    var gradeProvided=(grade&&gradeNames[grade])?grade:'';
    var bm=(brandModel&&String(brandModel).trim())?String(brandModel).trim():'';
    var opNotes=(notes&&String(notes).trim())?String(notes).trim():'';

    // The operator's spoken/written notes are the ground truth for item identity when present.
    // Brand/model (desktop-only field) is a fallback identifier when no notes were given.
    var visionText='Identify this item precisely. Read any visible model numbers, serial numbers, or labels. Note what is included and any condition issues. Return ONLY a JSON object: item_name, brand, model, serial_number, category, condition_notes, includes.';
    if(opNotes){
      visionText='The operator explicitly describes this item as: \''+opNotes+'\'.\nYou MUST treat this operator description as the ground truth for brand, model, and condition. Use the photos to verify details, read exact serial numbers, and check for physical condition issues, but DO NOT override the operator\'s stated item identity.\n'+visionText;
    }else if(bm){
      visionText='The seller identifies this item as: '+bm+'\nUse this as your primary identifier. Confirm from the photos and add any additional details visible.\n'+visionText;
    }

    callAI({system:'You are an expert electronics appraiser. Identify the item precisely from these photos. Return ONLY a JSON object, no markdown.',text:visionText,images:(photos||[]).slice(0,10),maxTokens:400,useSearch:false},function(err,txt1){
      try{
        if(err){console.log('['+tag+'] itemId '+itemId+' failed: vision step -',err.message);updateListingRecord(itemId,{status:'failed',error:'Vision step failed'});return;}
        var vd=extractJSON(txt1);
        if(!vd){console.log('[EXTRACTJSON FAIL] Raw text:',(txt1||'').slice(0,500));vd={item_name:'Unknown item'};}
        var itemName=bm?bm:(vd.item_name||'Unknown item');

        var pricingSystemLines=[
          'You are an experienced eBay seller writing a listing for a personal resale account.',
          'Search eBay completed/sold listings for accurate current pricing.',
          'Pricing: list just below mid-range of recent comps.',
          'Write honest, specific, confident copy. No overselling or underselling.',
          'Clean up raw operator notes into professional copy regardless of format.',
          'No pricing context in buyer-facing description.',
          'Include serial number when provided.',
          'The title, brand, model, and condition box must strictly reflect what the operator stated in their notes — verify against the photos but never contradict the operator\'s stated item identity.'
        ];
        var jsonShape;
        if(gradeProvided){
          pricingSystemLines.push('Grade: A=Like New, B=Good Normal Used, C=Fair Heavy Wear, D=Parts/Untested');
          jsonShape='{"title":"under 80 chars","condition_box":"2-3 sentences","description_html":"full HTML with specs table","suggested_price":45,"accept_price":36,"decline_price":28,"price_note":"internal context"}';
        }else{
          pricingSystemLines.push('No condition grade was provided by the operator. Deduce it yourself from the operator notes and the visible photo condition: A=Like New/Open Box, B=Good-Normal Used, C=Fair-Heavy Wear, D=Parts/Untested. Return your choice as "condition_grade" (exactly one letter: A, B, C, or D) in the JSON.');
          jsonShape='{"title":"under 80 chars","condition_box":"2-3 sentences","description_html":"full HTML with specs table","condition_grade":"A","suggested_price":45,"accept_price":36,"decline_price":28,"price_note":"internal context"}';
        }
        pricingSystemLines.push('Return ONLY this JSON no markdown:');
        pricingSystemLines.push(jsonShape);
        var pricingSystem=pricingSystemLines.join('\n');

        var gradeLine=gradeProvided?('Grade: '+gradeProvided+' ('+gradeNames[gradeProvided]+')'):'Grade: Not provided — deduce from operator notes and photo condition.';
        var pricingText='Item: '+itemName+'\n'+gradeLine+'\nSerial: '+(vd.serial_number||'Not visible')+'\nIncludes: '+(vd.includes||'See photos')+'\nCondition: '+(vd.condition_notes||'See photos')+'\nOperator notes: '+(opNotes||'None')+'\n\nSearch eBay sold listings and generate listing JSON.';
        callAI({system:pricingSystem,text:pricingText,images:[],maxTokens:1500,useSearch:true},function(err2,txt2){
          try{
            if(err2){console.log('['+tag+'] itemId '+itemId+' failed: pricing step -',err2.message);updateListingRecord(itemId,{status:'failed',error:'Generation failed'});return;}
            var result=extractJSON(txt2);
            if(!result||!result.title){
              console.log('['+tag+'] itemId '+itemId+' failed: could not parse listing');
              console.log('[EXTRACTJSON FAIL] Raw text:',(txt2||'').slice(0,500));
              updateListingRecord(itemId,{status:'failed',error:'Could not parse listing'});
              return;
            }
            var finalGrade=gradeProvided;
            if(!finalGrade){
              var deduced=(result.condition_grade||'').toString().trim().toUpperCase().charAt(0);
              finalGrade=gradeNames[deduced]?deduced:'B';
            }
            updateListingRecord(itemId,{title:result.title,condition_box:(result.condition_box!=null?result.condition_box:'See photos.'),description_html:(result.description_html!=null?result.description_html:'<p>'+itemName+'</p>'),suggested_price:(result.suggested_price!=null?result.suggested_price:0),accept_price:(result.accept_price!=null?result.accept_price:0),decline_price:(result.decline_price!=null?result.decline_price:0),price_note:(result.price_note!=null?result.price_note:''),grade:finalGrade,status:'complete',error:null});
            console.log('['+tag+'] itemId '+itemId+' '+doneWord+' successfully (grade '+finalGrade+')');
          }catch(e){console.log('['+tag+'] itemId '+itemId+' failed:',e.message);updateListingRecord(itemId,{status:'failed',error:'Server error'});}
        });
      }catch(e){console.log('['+tag+'] itemId '+itemId+' failed:',e.message);updateListingRecord(itemId,{status:'failed',error:'Server error'});}
    });
  }catch(e){console.log('['+tag+'] itemId '+itemId+' failed:',e.message);updateListingRecord(itemId,{status:'failed',error:'Server error'});}
}

const server=http.createServer(function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  if(req.method==='GET'&&req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(PHONE_HTML.replace('</head>','<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png"></head>'));
    return;
  }
  if(req.method==='GET'&&req.url==='/listings'){res.writeHead(200,{'Content-Type':'text/html'});res.end(LISTINGS_HTML);return;}
  if(req.method==='GET'&&req.url==='/ping'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}

  if(req.method==='GET'&&req.url==='/manifest.json'){
    res.writeHead(200,{'Content-Type':'application/manifest+json'});
    res.end(JSON.stringify({name:'Quick Lister',short_name:'Quick List',description:'Personal eBay listing tool',start_url:'/',display:'fullscreen',orientation:'portrait',background_color:'#111111',theme_color:'#111111',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}));
    return;
  }

  if(req.method==='GET'&&(req.url==='/icon-192.png'||req.url==='/icon-512.png')){
    var sz=req.url.includes('512')?512:192;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'"><rect width="'+sz+'" height="'+sz+'" fill="#111111"/><rect x="'+Math.round(sz*0.08)+'" y="'+Math.round(sz*0.08)+'" width="'+Math.round(sz*0.84)+'" height="'+Math.round(sz*0.84)+'" rx="'+Math.round(sz*0.12)+'" fill="#e8ff00"/><text x="'+Math.round(sz*0.5)+'" y="'+Math.round(sz*0.48)+'" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="'+Math.round(sz*0.28)+'" fill="#000000" text-anchor="middle" dominant-baseline="middle">LIST</text><text x="'+Math.round(sz*0.5)+'" y="'+Math.round(sz*0.75)+'" font-family="Arial,sans-serif" font-weight="700" font-size="'+Math.round(sz*0.11)+'" fill="#000000" text-anchor="middle" opacity="0.6">QUICK</text></svg>';
    res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=86400'});
    res.end(svg);
    return;
  }

  if(req.method==='GET'&&req.url.startsWith('/api/photo/')){
    var parts=req.url.split('/');
    var itemId=parts[3];var photoNum=parseInt(parts[4])||1;
    if(!itemId){res.writeHead(404);res.end('Not found');return;}
    var pp=path.join(PHOTOS_DIR,itemId,'photo_'+photoNum+'.jpg');
    if(fs.existsSync(pp)){res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=3600'});res.end(fs.readFileSync(pp));}
    else{res.writeHead(404);res.end('Photo not found');}
    return;
  }

  if(req.method==='GET'&&req.url==='/api/listing-count'){sendJSON(res,200,{count:loadListings().length});return;}
  if(req.method==='GET'&&req.url==='/api/get-listings'){var l=loadListings();sendJSON(res,200,{listings:l,count:l.length});return;}

  if(req.method==='POST'&&req.url==='/api/clear-listings'){
    saveListings([]);
    try{if(fs.existsSync(PHOTOS_DIR)){fs.readdirSync(PHOTOS_DIR).forEach(function(d){var dp=path.join(PHOTOS_DIR,d);fs.readdirSync(dp).forEach(function(f){fs.unlinkSync(path.join(dp,f));});fs.rmdirSync(dp);});}}catch(e){}
    sendJSON(res,200,{success:true});return;
  }

  // Voice capture: accepts a raw audio blob (audio/webm etc, not JSON) from the phone's MediaRecorder,
  // transcribes it via Gemini 2.5 Flash, and returns the transcript so the client can drop it into notes.
  // Always resolves — never crashes — so the client can gracefully fall back to manual typing on failure.
  if(req.method==='POST'&&req.url==='/api/voice/transcribe'){
    readRawBody(req,function(err,buf){
      try{
        if(err||!buf||!buf.length){sendJSON(res,400,{success:false,error:'No audio received'});return;}
        var ctype=(req.headers['content-type']||'audio/webm').split(';')[0].trim();
        transcribeAudio(buf.toString('base64'),ctype,function(terr,transcript){
          if(terr||!transcript){console.log('[VOICE] transcription failed:',terr&&terr.message);sendJSON(res,200,{success:false,error:'Transcription failed'});return;}
          sendJSON(res,200,{success:true,transcript:transcript.trim()});
        });
      }catch(e){console.log('[VOICE] failed:',e.message);sendJSON(res,200,{success:false,error:'Server error'});}
    });
    return;
  }

  // Phone capture: BACKGROUND generation via the shared runGeneration() pipeline (same as upload/regen).
  // Saves photos + a "processing" placeholder, returns 202 immediately. The phone UI has no grade
  // picker anymore — an empty grade tells runGeneration to deduce the condition grade itself from
  // the operator's notes and the photos. Failures set status:'failed' so /listings shows the fail
  // state + regenerate.
  if(req.method==='POST'&&req.url==='/api/generate-listing'){
    parseBody(req,function(err,parsed){
      try{
        if(err||!parsed){sendJSON(res,400,{error:'Bad request'});return;}
        var grade=(parsed.grade&&String(parsed.grade).trim())?String(parsed.grade).trim():'';
        var notes=parsed.notes||'';
        var photos=parsed.photos||[];
        var brand_model=(parsed.brand_model&&String(parsed.brand_model).trim())?String(parsed.brand_model).trim():'';
        var itemId=parsed.itemId||('item_'+Date.now());

        // Deduplicate — if itemId already saved, return existing (kept before saving anything)
        if(isDuplicate(itemId)){
          console.log('[GENERATE] Duplicate itemId skipped:',itemId);
          sendJSON(res,200,{success:true,duplicate:true});
          return;
        }

        if(photos.length===0){sendJSON(res,200,{title:'No photos',condition_box:'Please take photos.',description_html:'<p>No photos.</p>',suggested_price:0,accept_price:0,decline_price:0});return;}

        // Save photos immediately so they are available even if generation fails
        savePhotos(itemId,photos);
        console.log('[GENERATE] Saved',photos.length,'photos for',itemId);

        // Save an immediate "processing" placeholder so /listings shows a spinner card right away
        var placeholder={itemId:itemId,title:'Processing...',condition_box:'',description_html:'',suggested_price:null,accept_price:null,decline_price:null,photoCount:photos.length,timestamp:new Date().toISOString(),status:'processing',grade:grade,notes:notes,brand_model:brand_model};
        var gls=loadListings();gls.unshift(placeholder);saveListings(gls);
        console.log('[GENERATE] itemId '+itemId+' queued for background generation');

        // Respond immediately — client does not wait
        sendJSON(res,202,{success:true,itemId:itemId,status:'processing'});

        // Fill in the final record via the shared pipeline (operator notes are the ground-truth identifier)
        runGeneration(itemId,photos,grade,notes,brand_model,'PHONE');
      }catch(e){console.log('[GENERATE] failed:',e.message);sendJSON(res,200,{success:false,error:'Server error'});}
    });
    return;
  }

  // Regenerate an existing listing in the BACKGROUND using its saved photos. Accepts optional
  // brand_model + notes in the body. Returns 202 immediately; runGeneration updates the record.
  if(req.method==='POST'&&req.url.startsWith('/api/regenerate/')){
    parseBody(req,function(rbErr,rbody){
      try{
        var rid=decodeURIComponent((req.url.split('?')[0].split('/')[3])||'');
        if(!rid){sendJSON(res,400,{success:false,error:'Missing itemId'});return;}
        var body=(rbErr||!rbody||typeof rbody!=='object')?{}:rbody;
        var rlist=loadListings();
        var ridx=-1;for(var ri=0;ri<rlist.length;ri++){if(rlist[ri].itemId===rid){ridx=ri;break;}}
        if(ridx<0){sendJSON(res,404,{success:false,error:'Listing not found'});return;}
        var rrec=rlist[ridx];
        var rpc=rrec.photoCount||0;
        if(rpc<1){sendJSON(res,400,{success:false,error:'No photos for this listing'});return;}
        var rphotos=[];
        for(var pn=1;pn<=rpc;pn++){try{var pf=path.join(PHOTOS_DIR,rid,'photo_'+pn+'.jpg');if(fs.existsSync(pf))rphotos.push(fs.readFileSync(pf).toString('base64'));}catch(e){}}
        if(rphotos.length===0){console.log('[REGEN] itemId '+rid+' failed: photo files missing');sendJSON(res,400,{success:false,error:'Photo files missing on disk'});return;}
        var rbm=(body.brand_model&&String(body.brand_model).trim())?String(body.brand_model).trim():((rrec.brand_model&&String(rrec.brand_model).trim())?String(rrec.brand_model).trim():'');
        var rnotes=(body.notes&&String(body.notes).trim())?String(body.notes).trim():(rrec.notes||'');
        var rgrade=rrec.grade||'B';
        updateListingRecord(rid,{status:'processing',brand_model:rbm,notes:rnotes,error:null});
        console.log('[REGEN] itemId '+rid+' queued for background generation');
        sendJSON(res,202,{success:true,itemId:rid,status:'processing'});
        runGeneration(rid,rphotos,rgrade,rnotes,rbm,'REGEN');
      }catch(e){console.log('[REGEN] failed:',e.message);sendJSON(res,200,{success:false,error:'Server error'});}
    });
    return;
  }

  // Desktop upload: BACKGROUND generation. Saves photos + a "processing" placeholder, returns 202
  // immediately, then runGeneration fills in the listing. Optional brand_model. Never crashes.
  if(req.method==='POST'&&req.url==='/api/generate-from-upload'){
    parseBody(req,function(uperr,uparsed){
      try{
        if(uperr||!uparsed){sendJSON(res,400,{success:false,error:'Bad request'});return;}
        var uphotos=uparsed.photos||[];
        var ugrade=uparsed.grade||'B';
        var unotes=uparsed.notes||'';
        var ubm=(uparsed.brand_model&&String(uparsed.brand_model).trim())?String(uparsed.brand_model).trim():'';
        if(!uphotos.length){sendJSON(res,400,{success:false,error:'No photos provided'});return;}
        var uitemId='item_'+Date.now();
        savePhotos(uitemId,uphotos);
        var placeholder={itemId:uitemId,title:'Processing...',condition_box:'',description_html:'',suggested_price:null,accept_price:null,decline_price:null,photoCount:uphotos.length,timestamp:new Date().toISOString(),status:'processing',grade:ugrade,notes:unotes,brand_model:ubm};
        var uls=loadListings();uls.unshift(placeholder);saveListings(uls);
        console.log('[UPLOAD] itemId '+uitemId+' queued for background generation');
        sendJSON(res,202,{success:true,itemId:uitemId,status:'processing'});
        runGeneration(uitemId,uphotos,ugrade,unotes,ubm,'UPLOAD');
      }catch(e){console.log('[UPLOAD] failed:',e.message);sendJSON(res,200,{success:false,error:'Server error'});}
    });
    return;
  }

  // Delete a listing and its photo folder from disk. Never crashes — always returns JSON.
  if(req.method==='DELETE'&&req.url.startsWith('/api/listing/')){
    try{
      var did=decodeURIComponent((req.url.split('?')[0].split('/')[3])||'');
      if(!did){sendJSON(res,400,{success:false,error:'Missing itemId'});return;}
      var dls=loadListings().filter(function(l){return l.itemId!==did;});
      saveListings(dls);
      try{var dd=path.join(PHOTOS_DIR,did);if(fs.existsSync(dd)){fs.readdirSync(dd).forEach(function(f){try{fs.unlinkSync(path.join(dd,f));}catch(e){}});fs.rmdirSync(dd);}}catch(e){}
      console.log('[DELETE] itemId '+did+' removed');
      sendJSON(res,200,{success:true});
    }catch(e){console.log('[DELETE] failed:',e.message);sendJSON(res,200,{success:false,error:'Server error'});}
    return;
  }

  res.writeHead(404);res.end('Not found');
});

server.listen(PORT,function(){console.log('Quick Lister running on port '+PORT);});
