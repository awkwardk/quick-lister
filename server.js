'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DATA_DIR = '/tmp/quick-lister-data';
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

console.log('[STARTUP] API key found:', API_KEY.length > 0);

// Init directories
[DATA_DIR, PHOTOS_DIR].forEach(function(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); });

function loadListings(){try{if(fs.existsSync(LISTINGS_FILE))return JSON.parse(fs.readFileSync(LISTINGS_FILE,'utf8'));}catch(e){}return [];}
function saveListings(l){try{fs.writeFileSync(LISTINGS_FILE,JSON.stringify(l));}catch(e){console.log('[SAVE] Error:',e.message);}}

function savePhotos(itemId, photos){
  var itemDir=path.join(PHOTOS_DIR,itemId);
  if(!fs.existsSync(itemDir))fs.mkdirSync(itemDir,{recursive:true});
  photos.forEach(function(b64,i){
    try{fs.writeFileSync(path.join(itemDir,'photo_'+(i+1)+'.jpg'),Buffer.from(b64,'base64'));}catch(e){}
  });
}

const PHONE_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n<meta name=\"mobile-web-app-capable\" content=\"yes\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<meta name=\"theme-color\" content=\"#111111\">\n<title>Quick Lister</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">\n<style>\n:root{--bg:#111;--surface:#1a1a1a;--surface2:#222;--border:#2c2c2c;--text:#f2f2f2;--muted:#666;--accent:#e8ff00;--green:#00e676;--red:#ff1744;--orange:#ff9f1c;--display:'Bebas Neue',sans-serif;--body:'Barlow',sans-serif;--mono:'DM Mono',monospace;}\n*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}\nhtml,body{height:100%;overflow:hidden;background:var(--bg);font-family:var(--body);color:var(--text);user-select:none;touch-action:manipulation;}\n.screen{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg);}.screen.active{display:flex;}\n.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;}\n.topbar-brand{font-family:var(--display);font-size:1.4rem;letter-spacing:0.06em;color:var(--text);}.topbar-brand span{color:var(--accent);}\n.topbar-right{font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;}\n.scroll-content{flex:1;overflow-y:auto;padding:24px 20px;}\n.btn{width:100%;padding:18px;border:none;border-radius:8px;font-family:var(--display);font-size:1.3rem;letter-spacing:0.06em;cursor:pointer;transition:all 0.15s;margin-bottom:10px;}\n.btn-primary{background:var(--accent);color:#000;}.btn-primary:active{background:#c8df00;}\n.btn-primary:disabled{background:var(--border);color:var(--muted);cursor:not-allowed;}\n.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border);}.btn-secondary:active{background:#2a2a2a;}\n.btn-skip{background:transparent;color:var(--muted);border:1px solid var(--border);font-size:1rem;padding:14px;}\n.section-title{font-family:var(--display);font-size:1.8rem;letter-spacing:0.04em;color:var(--text);margin-bottom:4px;}\n.section-sub{font-size:0.9rem;color:var(--muted);margin-bottom:24px;line-height:1.5;}\n.grade-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}\n.grade-btn{padding:20px 12px;border:2px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;transition:all 0.15s;text-align:center;}\n.grade-btn:active{transform:scale(0.96);}\n.grade-btn.selected{border-color:var(--accent);background:rgba(232,255,0,0.06);}\n.grade-letter{font-family:var(--display);font-size:3rem;line-height:1;margin-bottom:4px;color:var(--text);}\n.grade-name{font-size:0.85rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;}\n.grade-desc{font-size:0.75rem;color:var(--muted);line-height:1.4;}\n.grade-btn.selected .grade-letter{color:var(--accent);}.grade-btn.selected .grade-name{color:var(--accent);}\n.notes-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;color:var(--text);font-family:var(--body);font-size:1rem;line-height:1.5;resize:none;outline:none;min-height:140px;-webkit-appearance:none;}\n.notes-input:focus{border-color:var(--accent);}\n.notes-input::placeholder{color:var(--muted);}\n.notes-hint{font-family:var(--mono);font-size:0.6rem;letter-spacing:0.08em;color:var(--muted);margin-top:8px;line-height:1.6;}\n.camera-wrap{position:relative;width:100%;border-radius:8px;overflow:hidden;background:#000;margin-bottom:12px;}\n.camera-video{width:100%;display:block;max-height:320px;object-fit:cover;}\n.camera-prompt{position:absolute;bottom:0;left:0;right:0;padding:10px 14px;background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);}\n.photo-count-badge{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);border-radius:100px;padding:4px 10px;font-family:var(--mono);font-size:0.65rem;color:#fff;letter-spacing:0.06em;}\n.shoot-btn{width:100%;padding:16px;background:var(--surface2);border:2px solid var(--border);border-radius:8px;font-family:var(--display);font-size:1.2rem;letter-spacing:0.06em;color:var(--text);cursor:pointer;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:10px;}\n.shoot-btn:active{background:#2a2a2a;}\n.shoot-btn svg{width:22px;height:22px;flex-shrink:0;}\n.photo-thumbs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}\n.photo-thumb{width:64px;height:64px;border-radius:6px;object-fit:cover;border:2px solid var(--border);}\n.photo-thumb.new{border-color:var(--accent);}\n.generating-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:16px;}\n.generating-ring{width:50px;height:50px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--accent);animation:spin 0.72s linear infinite;}\n@keyframes spin{to{transform:rotate(360deg);}}\n.generating-text{font-family:var(--display);font-size:1.3rem;letter-spacing:0.05em;color:var(--text);}\n.generating-sub{font-family:var(--mono);font-size:0.6rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;}\n.result-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;}\n.result-header{background:var(--surface2);padding:10px 16px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;}\n.result-content{padding:14px 16px;font-size:0.9rem;color:var(--text);line-height:1.6;}\n.copy-btn{width:100%;padding:12px;border:none;border-radius:0;font-family:var(--display);font-size:1rem;letter-spacing:0.06em;cursor:pointer;transition:all 0.15s;}\n.copy-title{background:#1565c0;color:#fff;}.copy-cond{background:#37474f;color:#fff;}.copy-html{background:#2e7d32;color:#fff;}\n.copy-btn.flashed{background:#4caf50!important;}\n.price-row{display:flex;gap:10px;margin-bottom:12px;}\n.price-box{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;}\n.price-label{font-family:var(--mono);font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}\n.price-value{font-family:var(--display);font-size:1.6rem;color:var(--accent);line-height:1;}\n.price-note-text{font-family:var(--mono);font-size:0.6rem;color:var(--muted);letter-spacing:0.06em;margin-bottom:16px;line-height:1.5;}\n.saved-banner{background:rgba(0,230,118,0.08);border:1px solid rgba(0,230,118,0.3);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.08em;color:var(--green);}\ncanvas{display:none;}\n</style>\n</head>\n<body>\n\n<!-- HOME -->\n<div class=\"screen active\" id=\"homeScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">QUICK<span>&#183;</span>LISTER</div>\n    <div class=\"topbar-right\" id=\"homeCount\">0 items</div>\n  </div>\n  <div class=\"scroll-content\" style=\"display:flex;flex-direction:column;justify-content:center;min-height:calc(100vh - 60px);\">\n    <div style=\"margin-bottom:32px;\">\n      <div style=\"font-family:var(--display);font-size:3.5rem;color:var(--text);line-height:0.9;margin-bottom:12px;\">READY<br>TO LIST</div>\n      <div style=\"font-size:0.9rem;color:var(--muted);line-height:1.6;\">Grade your item, add quick notes, take photos. Listing and photos saved automatically.<br><br>Open <strong style=\"color:var(--accent);\">quick-lister.onrender.com/listings</strong> on your computer to copy text and download photos.</div>\n    </div>\n    <button class=\"btn btn-primary\" onclick=\"startItem()\">New Item</button>\n    <button class=\"btn btn-secondary\" onclick=\"checkCount()\">Check Saved Count</button>\n  </div>\n</div>\n\n<!-- GRADE -->\n<div class=\"screen\" id=\"gradeScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Grade</div>\n    <div class=\"topbar-right\" id=\"gradeNum\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Condition Grade</div>\n    <div class=\"section-sub\">Pick the grade that matches what you see and tested. When between two grades choose the lower one.</div>\n    <div class=\"grade-grid\">\n      <div class=\"grade-btn\" id=\"gradeA\" onclick=\"selectGrade('A')\"><div class=\"grade-letter\">A</div><div class=\"grade-name\">Like New</div><div class=\"grade-desc\">Works perfectly. Looks almost new.</div></div>\n      <div class=\"grade-btn\" id=\"gradeB\" onclick=\"selectGrade('B')\"><div class=\"grade-letter\">B</div><div class=\"grade-name\">Good &#9733;</div><div class=\"grade-desc\">Works perfectly. Normal light wear.</div></div>\n      <div class=\"grade-btn\" id=\"gradeC\" onclick=\"selectGrade('C')\"><div class=\"grade-letter\">C</div><div class=\"grade-name\">Fair</div><div class=\"grade-desc\">Works. Heavy visible wear.</div></div>\n      <div class=\"grade-btn\" id=\"gradeD\" onclick=\"selectGrade('D')\"><div class=\"grade-letter\">D</div><div class=\"grade-name\">Parts</div><div class=\"grade-desc\">Does not work or untested.</div></div>\n    </div>\n    <button class=\"btn btn-primary\" id=\"gradeContinue\" onclick=\"goToNotes()\" disabled>Continue</button>\n    <button class=\"btn btn-skip\" onclick=\"goHome()\">Cancel</button>\n  </div>\n</div>\n\n<!-- NOTES -->\n<div class=\"screen\" id=\"notesScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Notes</div>\n    <div class=\"topbar-right\" id=\"notesGrade\" style=\"color:var(--accent);\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Quick Notes</div>\n    <div class=\"section-sub\">Write however you want \u2014 shorthand, fragments, all caps. The AI cleans it up into proper listing copy.</div>\n    <textarea class=\"notes-input\" id=\"notesInput\" placeholder=\"e.g. works great no remote dusty&#10;tested powers on screen perfect&#10;MISSING BATTERY COVER otherwise fine&#10;includes original box and manual\"></textarea>\n    <div class=\"notes-hint\">Type raw \u2014 AI handles grammar, caps, and tone automatically.<br>Include: what works, what does not, what is included, anything notable.</div>\n    <br>\n    <button class=\"btn btn-primary\" onclick=\"goToPhotos()\">Continue</button>\n    <button class=\"btn btn-skip\" onclick=\"goToPhotos()\">Skip \u2014 No Notes</button>\n  </div>\n</div>\n\n<!-- PHOTOS -->\n<div class=\"screen\" id=\"photoScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Photos</div>\n    <div class=\"topbar-right\" id=\"photoGrade\" style=\"color:var(--accent);\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Photograph Item</div>\n    <div class=\"section-sub\">Take as many photos as you need. Always include the item body and any labels in the same shot.</div>\n    <div class=\"camera-wrap\">\n      <video class=\"camera-video\" id=\"photoVideo\" autoplay playsinline muted></video>\n      <div class=\"camera-prompt\">Point at item</div>\n      <div class=\"photo-count-badge\" id=\"photoCountBadge\">0 photos</div>\n    </div>\n    <button class=\"shoot-btn\" onclick=\"takePhoto()\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg>\n      Take Photo\n    </button>\n    <div class=\"photo-thumbs\" id=\"photoThumbs\"></div>\n    <button class=\"btn btn-primary\" id=\"photoContinue\" onclick=\"goToGenerate()\" disabled>Generate Listing</button>\n    <button class=\"btn btn-skip\" onclick=\"goToGenerate()\">Skip remaining photos</button>\n  </div>\n  <canvas id=\"photoCanvas\"></canvas>\n</div>\n\n<!-- GENERATING -->\n<div class=\"screen\" id=\"generatingScreen\">\n  <div class=\"topbar\"><div class=\"topbar-brand\">QUICK<span>&#183;</span>LISTER</div></div>\n  <div class=\"scroll-content\">\n    <div class=\"generating-state\">\n      <div class=\"generating-ring\"></div>\n      <div style=\"text-align:center;\">\n        <div class=\"generating-text\" id=\"genText\">Identifying item...</div>\n        <div class=\"generating-sub\" id=\"genSub\">Reading photos</div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- RESULT -->\n<div class=\"screen\" id=\"resultScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Listing Ready</div>\n    <div class=\"topbar-right\" id=\"resultNum\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"price-row\">\n      <div class=\"price-box\"><div class=\"price-label\">List At</div><div class=\"price-value\" id=\"priceList\">--</div></div>\n      <div class=\"price-box\"><div class=\"price-label\">Accept</div><div class=\"price-value\" id=\"priceAccept\" style=\"color:var(--green);\">--</div></div>\n      <div class=\"price-box\"><div class=\"price-label\">Decline</div><div class=\"price-value\" id=\"priceDecline\" style=\"color:var(--red);\">--</div></div>\n    </div>\n    <div class=\"price-note-text\" id=\"priceNote\"></div>\n    <div class=\"saved-banner\">&#10003; Listing and photos saved \u2014 open quick-lister.onrender.com/listings on your computer</div>\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>Title</span><span id=\"titleLen\">0/80</span></div>\n      <div class=\"result-content\" id=\"resultTitle\">--</div>\n      <button class=\"copy-btn copy-title\" onclick=\"copyText(this,'resultTitle',false)\">Copy Title</button>\n    </div>\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>Condition Box</span></div>\n      <div class=\"result-content\" id=\"resultCond\">--</div>\n      <button class=\"copy-btn copy-cond\" onclick=\"copyText(this,'resultCond',false)\">Copy Condition</button>\n    </div>\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>HTML Description</span></div>\n      <div class=\"result-content\" id=\"resultDescPreview\" style=\"font-size:0.8rem;max-height:100px;overflow:hidden;opacity:0.6;\">--</div>\n      <button class=\"copy-btn copy-html\" onclick=\"copyText(this,'resultHtmlHidden',true)\">Copy HTML Description</button>\n      <textarea id=\"resultHtmlHidden\" style=\"display:none;\"></textarea>\n    </div>\n    <button class=\"btn btn-primary\" style=\"margin-top:8px;\" onclick=\"nextItem()\">Next Item</button>\n    <button class=\"btn btn-secondary\" onclick=\"goHome()\">Back to Home</button>\n  </div>\n</div>\n\n<script>\nvar currentItem={};\nvar photoB64s=[];\nvar photoStream=null;\nvar sessionCount=0;\nvar genSteps=[['Identifying item...','Reading photos'],['Researching pricing...','Checking eBay sold listings'],['Writing listing...','Crafting description'],['Almost done...','Finalizing copy']];\n\nfunction showScreen(id){document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});document.getElementById(id).classList.add('active');}\nfunction goHome(){stopCamera();showScreen('homeScreen');}\n\nfunction checkCount(){\n  fetch('/api/listing-count').then(function(r){return r.json();}).then(function(d){\n    alert(d.count+' listing'+(d.count!==1?'s':'')+' saved. Open /listings on your computer to view and download photos.');\n  }).catch(function(){alert('Could not reach server.');});\n}\n\nfunction startItem(){\n  currentItem={grade:null,notes:'',itemId:'item_'+Date.now()};\n  photoB64s=[];\n  document.querySelectorAll('.grade-btn').forEach(function(b){b.classList.remove('selected');});\n  document.getElementById('gradeContinue').disabled=true;\n  document.getElementById('notesInput').value='';\n  document.getElementById('photoThumbs').innerHTML='';\n  document.getElementById('photoCountBadge').textContent='0 photos';\n  document.getElementById('photoContinue').disabled=true;\n  document.getElementById('gradeNum').textContent='Item '+(sessionCount+1);\n  showScreen('gradeScreen');\n}\n\nfunction selectGrade(g){currentItem.grade=g;document.querySelectorAll('.grade-btn').forEach(function(b){b.classList.remove('selected');});document.getElementById('grade'+g).classList.add('selected');document.getElementById('gradeContinue').disabled=false;}\nfunction goToNotes(){if(!currentItem.grade)return;document.getElementById('notesGrade').textContent='Grade '+currentItem.grade;showScreen('notesScreen');}\nfunction goToPhotos(){currentItem.notes=document.getElementById('notesInput').value.trim();document.getElementById('photoGrade').textContent='Grade '+currentItem.grade;startCamera();showScreen('photoScreen');}\n\nfunction startCamera(){\n  var video=document.getElementById('photoVideo');\n  if(photoStream)return;\n  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})\n  .then(function(stream){photoStream=stream;video.srcObject=stream;video.play();})\n  .catch(function(e){console.error('Camera error',e);});\n}\nfunction stopCamera(){if(photoStream){photoStream.getTracks().forEach(function(t){t.stop();});photoStream=null;}}\n\nfunction takePhoto(){\n  var video=document.getElementById('photoVideo');\n  var canvas=document.getElementById('photoCanvas');\n  if(!video.videoWidth){alert('Camera not ready yet.');return;}\n  var scale=Math.min(1,1024/video.videoWidth);\n  canvas.width=Math.round(video.videoWidth*scale);\n  canvas.height=Math.round(video.videoHeight*scale);\n  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);\n  var b64=canvas.toDataURL('image/jpeg',0.85).split(',')[1];\n  photoB64s.push(b64);\n  var img=document.createElement('img');\n  img.src='data:image/jpeg;base64,'+b64;\n  img.className='photo-thumb new';\n  document.getElementById('photoThumbs').appendChild(img);\n  setTimeout(function(){img.className='photo-thumb';},1000);\n  document.getElementById('photoCountBadge').textContent=photoB64s.length+' photo'+(photoB64s.length!==1?'s':'');\n  document.getElementById('photoContinue').disabled=false;\n}\n\nfunction goToGenerate(){\n  stopCamera();\n  showScreen('generatingScreen');\n  var si=0;updateGenStep(0);\n  var iv=setInterval(function(){si=Math.min(si+1,genSteps.length-1);updateGenStep(si);},2500);\n  fetch('/api/generate-listing',{\n    method:'POST',\n    headers:{'Content-Type':'application/json'},\n    body:JSON.stringify({grade:currentItem.grade,notes:currentItem.notes,photos:photoB64s,itemId:currentItem.itemId})\n  })\n  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})\n  .then(function(data){clearInterval(iv);showResult(data);})\n  .catch(function(e){clearInterval(iv);showResult({title:'Generation failed \u2014 try again',condition_box:'Please try again.',description_html:'<p>Error: '+e.message+'</p>',suggested_price:0,accept_price:0,decline_price:0,price_note:''});});\n}\n\nfunction updateGenStep(i){document.getElementById('genText').textContent=genSteps[i][0];document.getElementById('genSub').textContent=genSteps[i][1];}\n\nfunction showResult(r){\n  sessionCount++;\n  document.getElementById('homeCount').textContent=sessionCount+' items';\n  document.getElementById('resultNum').textContent='Item '+sessionCount;\n  var title=r.title||'--';\n  var cond=r.condition_box||'See photos.';\n  var html=r.description_html||'<p>No description.</p>';\n  document.getElementById('resultTitle').textContent=title;\n  document.getElementById('titleLen').textContent=title.length+'/80';\n  document.getElementById('resultCond').textContent=cond;\n  document.getElementById('resultDescPreview').innerHTML=html;\n  document.getElementById('resultHtmlHidden').value=html;\n  document.getElementById('priceList').textContent=r.suggested_price?'$'+r.suggested_price:'--';\n  document.getElementById('priceAccept').textContent=r.accept_price?'$'+r.accept_price:'--';\n  document.getElementById('priceDecline').textContent=r.decline_price?'$'+r.decline_price:'--';\n  document.getElementById('priceNote').textContent=r.price_note||'';\n  showScreen('resultScreen');\n}\n\nfunction copyText(btn,id,isHidden){\n  var val=isHidden?document.getElementById(id).value:document.getElementById(id).textContent;\n  navigator.clipboard.writeText(val.trim()).then(function(){\n    var orig=btn.textContent;btn.classList.add('flashed');btn.textContent='Copied!';\n    setTimeout(function(){btn.classList.remove('flashed');btn.textContent=orig;},1500);\n  });\n}\n\nfunction nextItem(){startItem();}\n\nwindow.addEventListener('load',function(){\n  fetch('/api/listing-count').then(function(r){return r.json();}).then(function(d){\n    if(d.count>0)document.getElementById('homeCount').textContent=d.count+' saved on server';\n  }).catch(function(){});\n});\n</script>\n</body>\n</html>";
const LISTINGS_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Quick Lister \u2014 Listings</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0;}\nbody{font-family:Arial,sans-serif;background:#f0f0f0;padding:24px;min-height:100vh;}\n.topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px;}\n.topbar-left h1{font-size:22px;color:#1a1a1a;margin-bottom:4px;}\n.meta{font-size:13px;color:#888;}\n.actions{display:flex;gap:10px;flex-shrink:0;}\n.btn{padding:10px 18px;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;transition:background 0.15s;white-space:nowrap;}\n.btn-clear{background:#ff1744;color:#fff;}.btn-clear:hover{background:#d50000;}\n.btn-refresh{background:#455a64;color:#fff;}.btn-refresh:hover{background:#37474f;}\n.empty{text-align:center;padding:80px 20px;color:#aaa;font-size:14px;line-height:1.8;}\n.card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.12);margin-bottom:28px;overflow:hidden;}\n.card-header{padding:12px 18px;color:#fff;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}\n.card-num{background:rgba(255,255,255,0.25);border-radius:4px;padding:2px 8px;font-size:13px;font-weight:bold;flex-shrink:0;}\n.card-title-text{font-size:15px;font-weight:bold;flex:1;}\n.card-time{font-size:11px;opacity:0.7;white-space:nowrap;}\n.price-bar{background:#f5f5f5;padding:8px 18px;display:flex;gap:20px;font-size:13px;color:#444;border-bottom:1px solid #e0e0e0;flex-wrap:wrap;}\n.price-bar b{color:#1a1a1a;}\n.price-note-bar{background:#fffde7;padding:6px 18px;font-size:11px;color:#795548;border-bottom:1px solid #e0e0e0;font-style:italic;}\n.card-body{padding:16px 18px;}\n.copy-row{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}\n.copy-btn{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;transition:background 0.15s;}\n.copy-title-btn{background:#1565c0;color:#fff;}\n.copy-cond-btn{background:#37474f;color:#fff;}\n.copy-html-btn{background:#2e7d32;color:#fff;}\n.dl-btn{background:#e65100;color:#fff;}\n.copy-btn.flashed{background:#4caf50!important;}\n.field-label{font-size:11px;font-weight:bold;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;margin-top:14px;}\n.field-value{font-size:13px;color:#333;line-height:1.6;background:#f9f9f9;padding:10px 12px;border-radius:4px;border:1px solid #e0e0e0;}\n.photo-strip{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}\n.photo-thumb{width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;cursor:pointer;}\n.photo-thumb:hover{border-color:#1565c0;}\n.photo-count{font-size:12px;color:#888;margin-top:6px;}\ntextarea.hidden-ta{display:none;}\n</style>\n<script>\nfunction copyBtn(btn,id,isArea){\n  var el=document.getElementById(id);\n  var val=isArea?el.value:el.textContent;\n  navigator.clipboard.writeText(val.trim()).then(function(){\n    var o=btn.textContent;btn.classList.add('flashed');btn.textContent='Copied!';\n    setTimeout(function(){btn.classList.remove('flashed');btn.textContent=o;},1500);\n  });\n}\n\nfunction downloadPhotos(itemId, count, title) {\n  var safeName = title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30);\n  for(var i=1;i<=count;i++){\n    (function(idx){\n      setTimeout(function(){\n        var a=document.createElement('a');\n        a.href='/api/photo/'+itemId+'/'+idx;\n        a.download=safeName+'_photo'+idx+'.jpg';\n        document.body.appendChild(a);\n        a.click();\n        document.body.removeChild(a);\n      }, (idx-1)*400);\n    })(i);\n  }\n}\n\nfunction clearAll(){\n  if(!confirm('Clear all listings and photos? This cannot be undone.'))return;\n  fetch('/api/clear-listings',{method:'POST'}).then(function(){location.reload();});\n}\nfunction refresh(){location.reload();}\n</script>\n</head>\n<body>\n<div class=\"topbar\">\n  <div class=\"topbar-left\">\n    <h1>Quick Lister \u2014 Saved Listings</h1>\n    <div class=\"meta\" id=\"metaLine\">Loading...</div>\n  </div>\n  <div class=\"actions\">\n    <button class=\"btn btn-refresh\" onclick=\"refresh()\">Refresh</button>\n    <button class=\"btn btn-clear\" onclick=\"clearAll()\">Clear All</button>\n  </div>\n</div>\n<div id=\"listingsContainer\"><div class=\"empty\">Loading...</div></div>\n<script>\nfetch('/api/get-listings').then(function(r){return r.json();}).then(function(data){\n  var items=data.listings||[];\n  document.getElementById('metaLine').textContent=items.length+' listing'+(items.length!==1?'s':'')+' saved';\n  if(items.length===0){\n    document.getElementById('listingsContainer').innerHTML='<div class=\"empty\">No listings saved yet.<br>Generate listings from your phone and they will appear here.<br><br>Refresh this page after generating listings on your phone.</div>';\n    return;\n  }\n  var colors=['#1565c0','#2e7d32','#e65100','#6a1b9a','#00838f','#c62828','#37474f','#558b2f'];\n  var html=items.map(function(item,i){\n    var color=colors[i%colors.length];\n    var time=item.timestamp?new Date(item.timestamp).toLocaleString():'';\n    var price=item.suggested_price?'$'+item.suggested_price:'--';\n    var accept=item.accept_price?'$'+item.accept_price:'--';\n    var decline=item.decline_price?'$'+item.decline_price:'--';\n    var photoCount=item.photoCount||0;\n    var itemId=item.itemId||'';\n\n    var photoStrip='';\n    if(photoCount>0 && itemId){\n      var thumbs='';\n      for(var p=1;p<=Math.min(photoCount,6);p++){\n        thumbs+='<img class=\"photo-thumb\" src=\"/api/photo/'+itemId+'/'+p+'\" alt=\"Photo '+p+'\" onclick=\"window.open(this.src)\">';\n      }\n      photoStrip='<div class=\"field-label\">Photos ('+photoCount+')</div>'\n        +'<div class=\"photo-strip\">'+thumbs+'</div>'\n        +'<div class=\"photo-count\">Click a photo to view full size</div>';\n    }\n\n    return '<div class=\"card\">'\n      +'<div class=\"card-header\" style=\"background:'+color+';\">'\n      +'<span class=\"card-num\">'+(i+1)+'</span>'\n      +'<span class=\"card-title-text\">'+item.title+'</span>'\n      +'<span class=\"card-time\">'+time+'</span>'\n      +'</div>'\n      +(item.price_note?'<div class=\"price-note-bar\">'+item.price_note+'</div>':'')\n      +'<div class=\"price-bar\"><span><b>List:</b> '+price+'</span><span><b>Accept:</b> '+accept+'</span><span><b>Decline:</b> '+decline+'</span></div>'\n      +'<div class=\"card-body\">'\n      +'<div class=\"copy-row\">'\n      +'<button class=\"copy-btn copy-title-btn\" onclick=\"copyBtn(this,\\'title_'+i+'\\',false)\">Copy Title</button>'\n      +'<button class=\"copy-btn copy-cond-btn\" onclick=\"copyBtn(this,\\'cond_'+i+'\\',false)\">Copy Condition</button>'\n      +'<button class=\"copy-btn copy-html-btn\" onclick=\"copyBtn(this,\\'html_'+i+'\\',true)\">Copy HTML Description</button>'\n      +(photoCount>0&&itemId?'<button class=\"copy-btn dl-btn\" onclick=\"downloadPhotos(\\''+itemId+'\\','+photoCount+',\\''+item.title.replace(/'/g,'').slice(0,20)+'\\')\">Download '+photoCount+' Photos</button>':'')\n      +'</div>'\n      +'<div class=\"field-label\">Title</div><div class=\"field-value\" id=\"title_'+i+'\">'+item.title+'</div>'\n      +'<div class=\"field-label\">Condition Box</div><div class=\"field-value\" id=\"cond_'+i+'\">'+item.condition_box+'</div>'\n      +'<div class=\"field-label\">HTML Description</div>'\n      +'<div class=\"field-value\" style=\"font-size:12px;max-height:80px;overflow:hidden;opacity:0.7;\">'+item.description_html+'</div>'\n      +'<textarea class=\"hidden-ta\" id=\"html_'+i+'\">'+item.description_html+'</textarea>'\n      +photoStrip\n      +'</div></div>';\n  }).join('');\n  document.getElementById('listingsContainer').innerHTML=html;\n});\n</script>\n</body>\n</html>";

function callClaude(payload,callback){
  var body=JSON.stringify(payload);
  var options={hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',headers:{'Content-Type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01','Content-Length':Buffer.byteLength(body)}};
  var req=https.request(options,function(res){
    var data='';
    res.on('data',function(c){data+=c;});
    res.on('end',function(){
      console.log('[API] Status:',res.statusCode);
      if(res.statusCode!==200)console.log('[API] Error:',data.slice(0,200));
      try{callback(null,JSON.parse(data));}catch(e){callback(null,{content:[],type:'error',error:{message:'parse_failed'}});}
    });
  });
  req.on('error',function(e){callback(e);});
  req.write(body);req.end();
}

function extractText(content){return(content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('');}

function extractJSON(text){
  var depth=0,start=-1;
  for(var i=0;i<text.length;i++){
    if(text[i]==='{'){if(depth===0)start=i;depth++;}
    else if(text[i]==='}' && depth>0){depth--;if(depth===0&&start!==-1){try{return JSON.parse(text.slice(start,i+1));}catch(e){start=-1;}}}
  }
  return null;
}

function parseBody(req,callback){
  var body='';
  req.on('data',function(c){body+=c;});
  req.on('end',function(){try{callback(null,JSON.parse(body));}catch(e){callback(new Error('Bad JSON'));}});
}

function sendJSON(res,code,obj){res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));}

const server=http.createServer(function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  if(req.method==='GET' && req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(PHONE_HTML.replace('</head>','<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png"></head>'));
    return;
  }

  if(req.method==='GET' && req.url==='/listings'){
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(LISTINGS_HTML);
    return;
  }

  if(req.method==='GET' && req.url==='/ping'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}

  if(req.method==='GET' && req.url==='/manifest.json'){
    res.writeHead(200,{'Content-Type':'application/manifest+json'});
    res.end(JSON.stringify({name:'Quick Lister',short_name:'Quick List',description:'Personal eBay listing tool',start_url:'/',display:'fullscreen',orientation:'portrait',background_color:'#111111',theme_color:'#111111',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}));
    return;
  }

  if(req.method==='GET' && (req.url==='/icon-192.png'||req.url==='/icon-512.png')){
    var size=req.url.includes('512')?512:192;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'"><rect width="'+size+'" height="'+size+'" fill="#111111"/><rect x="'+Math.round(size*0.08)+'" y="'+Math.round(size*0.08)+'" width="'+Math.round(size*0.84)+'" height="'+Math.round(size*0.84)+'" rx="'+Math.round(size*0.12)+'" fill="#e8ff00"/><text x="'+Math.round(size*0.5)+'" y="'+Math.round(size*0.48)+'" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="'+Math.round(size*0.28)+'" fill="#000000" text-anchor="middle" dominant-baseline="middle">LIST</text><text x="'+Math.round(size*0.5)+'" y="'+Math.round(size*0.75)+'" font-family="Arial,sans-serif" font-weight="700" font-size="'+Math.round(size*0.11)+'" fill="#000000" text-anchor="middle" opacity="0.6">QUICK</text></svg>';
    res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=86400'});
    res.end(svg);
    return;
  }

  // Serve individual photo
  if(req.method==='GET' && req.url.startsWith('/api/photo/')){
    var parts=req.url.split('/');
    var itemId=parts[3];
    var photoNum=parseInt(parts[4])||1;
    if(!itemId){res.writeHead(404);res.end('Not found');return;}
    var photoPath=path.join(PHOTOS_DIR,itemId,'photo_'+photoNum+'.jpg');
    if(fs.existsSync(photoPath)){
      res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=3600'});
      res.end(fs.readFileSync(photoPath));
    } else {
      res.writeHead(404);res.end('Photo not found');
    }
    return;
  }

  if(req.method==='GET' && req.url==='/api/listing-count'){sendJSON(res,200,{count:loadListings().length});return;}

  if(req.method==='GET' && req.url==='/api/get-listings'){var l=loadListings();sendJSON(res,200,{listings:l,count:l.length});return;}

  if(req.method==='POST' && req.url==='/api/clear-listings'){
    saveListings([]);
    // Clear photos
    try{
      if(fs.existsSync(PHOTOS_DIR)){
        fs.readdirSync(PHOTOS_DIR).forEach(function(d){
          var dp=path.join(PHOTOS_DIR,d);
          fs.readdirSync(dp).forEach(function(f){fs.unlinkSync(path.join(dp,f));});
          fs.rmdirSync(dp);
        });
      }
    }catch(e){}
    sendJSON(res,200,{success:true});
    return;
  }

  if(req.method==='POST' && req.url==='/api/generate-listing'){
    parseBody(req,function(err,parsed){
      if(err){sendJSON(res,400,{title:'Error',condition_box:'Bad request.',description_html:'<p>Error.</p>'});return;}

      var grade=parsed.grade||'B';
      var notes=parsed.notes||'';
      var photos=parsed.photos||[];
      var itemId=parsed.itemId||('item_'+Date.now());
      var gradeName={A:'Like New / Open Box',B:'Good - Normal Used Condition',C:'Fair - Heavy Cosmetic Wear',D:'For Parts or Not Working'}[grade]||'Used';

      if(photos.length===0){sendJSON(res,200,{title:'No photos provided',condition_box:'Please take photos.',description_html:'<p>No photos.</p>',suggested_price:0,accept_price:0,decline_price:0});return;}

      // Save photos immediately
      savePhotos(itemId,photos);
      console.log('[GENERATE] Saved',photos.length,'photos for',itemId);

      // Step 1: Vision
      var photoContent=[{type:'text',text:'Identify this item precisely. Read any visible model numbers, serial numbers, or labels. Note what accessories or cables are included and any visible condition issues. Return ONLY a JSON object with: item_name, brand, model, serial_number, category, condition_notes, includes.'}];
      photos.slice(0,5).forEach(function(b64){photoContent.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}});});

      callClaude({
        model:'claude-sonnet-4-5',
        max_tokens:400,
        system:'You are an expert electronics appraiser. Examine these photos and identify the item with precision. Return ONLY a JSON object, no markdown.',
        messages:[{role:'user',content:photoContent}]
      },function(err,r1){
        if(err||r1.type==='error'){
          var fb={title:'Could not identify item',condition_box:'See photos.',description_html:'<p>Could not identify. Try again.</p>',suggested_price:0,accept_price:0,decline_price:0,itemId:itemId,photoCount:photos.length,timestamp:new Date().toISOString()};
          var l=loadListings();l.unshift(fb);saveListings(l);
          sendJSON(res,200,fb);return;
        }

        var vd=extractJSON(extractText(r1.content))||{item_name:'Unknown item'};
        var itemName=vd.item_name||'Unknown item';
        console.log('[GENERATE] Identified:',itemName);

        // Step 2: Research + write
        callClaude({
          model:'claude-sonnet-4-5',
          max_tokens:1500,
          tools:[{type:'web_search_20250305',name:'web_search'}],
          system:[
            'You are an experienced eBay seller writing a listing for a personal resale account.',
            'Search eBay completed/sold listings to get accurate current pricing.',
            'Pricing strategy: list just below mid-range of recent sold comps.',
            'Write in an honest, specific, confident tone. No overselling or underselling.',
            'Clean up any raw seller notes into proper professional copy regardless of how they were written.',
            'Do not mention pricing context in the buyer-facing description.',
            'Include serial number in description when provided.',
            'Grade: A=Like New, B=Good Normal Used, C=Fair Heavy Wear, D=Parts/Untested',
            '',
            'Return ONLY this JSON, no markdown:',
            '{"title":"eBay title under 80 chars","condition_box":"2-3 sentence condition description","description_html":"Full HTML listing with specs table","suggested_price":45,"accept_price":36,"decline_price":28,"price_note":"Internal pricing context e.g. Avg sold $52, listing below mid"}'
          ].join('\n'),
          messages:[{role:'user',content:[
            'Item: '+itemName,
            'Grade: '+grade+' ('+gradeName+')',
            'Serial: '+(vd.serial_number||'Not visible'),
            'Includes: '+(vd.includes||'See photos'),
            'Condition from photos: '+(vd.condition_notes||'See photos'),
            'Seller raw notes: '+(notes||'None'),
            '',
            'Search eBay sold listings and write the complete listing JSON.'
          ].join('\n')}]
        },function(err2,r2){
          var result;
          if(err2||r2.type==='error'){
            result={title:itemName,condition_box:'See photos for condition details.',description_html:'<p>'+itemName+'</p>',suggested_price:0,accept_price:0,decline_price:0,price_note:'Pricing unavailable.'};
          } else {
            result=extractJSON(extractText(r2.content))||{title:itemName,condition_box:'See photos.',description_html:'<p>'+itemName+'</p>',suggested_price:0,accept_price:0,decline_price:0,price_note:''};
          }
          result.itemId=itemId;
          result.photoCount=photos.length;
          result.timestamp=new Date().toISOString();
          var listings=loadListings();
          listings.unshift(result);
          saveListings(listings);
          console.log('[GENERATE] Saved listing:',result.title,'| Photos:',photos.length,'| Price: $'+result.suggested_price);
          sendJSON(res,200,result);
        });
      });
    });
    return;
  }

  res.writeHead(404);res.end('Not found');
});

server.listen(PORT,function(){console.log('Quick Lister running on port '+PORT);});
