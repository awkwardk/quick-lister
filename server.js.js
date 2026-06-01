'use strict';
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
console.log('[STARTUP] API key found:', API_KEY.length > 0);

const HTML_PAGE = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n<meta name=\"mobile-web-app-capable\" content=\"yes\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<meta name=\"theme-color\" content=\"#111111\">\n<title>Quick Lister</title>\n<link href=\"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap\" rel=\"stylesheet\">\n<style>\n:root{\n  --bg:#111;--surface:#1a1a1a;--surface2:#222;--border:#2c2c2c;\n  --text:#f2f2f2;--muted:#666;--accent:#e8ff00;\n  --green:#00e676;--red:#ff1744;--orange:#ff9f1c;--blue:#448aff;\n  --display:'Bebas Neue',sans-serif;--body:'Barlow',sans-serif;--mono:'DM Mono',monospace;\n}\n*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}\nhtml,body{height:100%;overflow:hidden;background:var(--bg);font-family:var(--body);color:var(--text);user-select:none;touch-action:manipulation;}\n.screen{position:fixed;inset:0;display:none;flex-direction:column;background:var(--bg);}\n.screen.active{display:flex;}\n.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;}\n.topbar-brand{font-family:var(--display);font-size:1.4rem;letter-spacing:0.06em;color:var(--text);}\n.topbar-brand span{color:var(--accent);}\n.topbar-count{font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;}\n.scroll-content{flex:1;overflow-y:auto;padding:24px 20px;}\n.btn{width:100%;padding:18px;border:none;border-radius:8px;font-family:var(--display);font-size:1.3rem;letter-spacing:0.06em;cursor:pointer;transition:all 0.15s;margin-bottom:10px;}\n.btn-primary{background:var(--accent);color:#000;}\n.btn-primary:active{background:#c8df00;}\n.btn-primary:disabled{background:var(--border);color:var(--muted);cursor:not-allowed;}\n.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border);}\n.btn-secondary:active{background:#2a2a2a;}\n.btn-skip{background:transparent;color:var(--muted);border:1px solid var(--border);font-size:1rem;padding:14px;}\n.section-title{font-family:var(--display);font-size:1.8rem;letter-spacing:0.04em;color:var(--text);margin-bottom:4px;}\n.section-sub{font-size:0.9rem;color:var(--muted);margin-bottom:24px;line-height:1.5;}\n.grade-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}\n.grade-btn{padding:20px 12px;border:2px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer;transition:all 0.15s;text-align:center;}\n.grade-btn:active{transform:scale(0.96);}\n.grade-btn.selected{border-color:var(--accent);background:rgba(232,255,0,0.06);}\n.grade-letter{font-family:var(--display);font-size:3rem;line-height:1;margin-bottom:4px;color:var(--text);}\n.grade-name{font-size:0.85rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;}\n.grade-desc{font-size:0.75rem;color:var(--muted);line-height:1.4;}\n.grade-btn.selected .grade-letter{color:var(--accent);}\n.grade-btn.selected .grade-name{color:var(--accent);}\n.notes-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;color:var(--text);font-family:var(--body);font-size:1rem;line-height:1.5;resize:none;outline:none;min-height:140px;-webkit-appearance:none;}\n.notes-input:focus{border-color:var(--accent);}\n.notes-input::placeholder{color:var(--muted);}\n.notes-hint{font-family:var(--mono);font-size:0.6rem;letter-spacing:0.08em;color:var(--muted);margin-top:8px;line-height:1.6;}\n.camera-wrap{position:relative;width:100%;border-radius:8px;overflow:hidden;background:#000;margin-bottom:12px;}\n.camera-video{width:100%;display:block;max-height:320px;object-fit:cover;}\n.camera-prompt{position:absolute;bottom:0;left:0;right:0;padding:10px 14px;background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);}\n.photo-count-badge{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);border-radius:100px;padding:4px 10px;font-family:var(--mono);font-size:0.65rem;color:#fff;letter-spacing:0.06em;}\n.shoot-btn{width:100%;padding:16px;background:var(--surface2);border:2px solid var(--border);border-radius:8px;font-family:var(--display);font-size:1.2rem;letter-spacing:0.06em;color:var(--text);cursor:pointer;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:10px;}\n.shoot-btn:active{background:#2a2a2a;}\n.shoot-btn svg{width:22px;height:22px;flex-shrink:0;}\n.photo-thumbs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}\n.photo-thumb{width:64px;height:64px;border-radius:6px;object-fit:cover;border:2px solid var(--border);}\n.photo-thumb.new{border-color:var(--accent);}\n.review-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;}\n.review-row{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 16px;border-bottom:1px solid var(--border);}\n.review-row:last-child{border-bottom:none;}\n.review-label{font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);flex-shrink:0;margin-right:12px;padding-top:2px;}\n.review-value{font-size:0.9rem;font-weight:600;color:var(--text);text-align:right;}\n.generating-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;gap:16px;}\n.generating-ring{width:50px;height:50px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--accent);animation:spin 0.72s linear infinite;}\n@keyframes spin{to{transform:rotate(360deg);}}\n.generating-text{font-family:var(--display);font-size:1.3rem;letter-spacing:0.05em;color:var(--text);}\n.generating-sub{font-family:var(--mono);font-size:0.6rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;}\n.result-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;}\n.result-header{background:var(--surface2);padding:10px 16px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;}\n.result-content{padding:14px 16px;font-size:0.9rem;color:var(--text);line-height:1.6;}\n.copy-btn{width:100%;padding:12px;border:none;border-radius:6px;font-family:var(--display);font-size:1rem;letter-spacing:0.06em;cursor:pointer;margin-top:8px;transition:all 0.15s;}\n.copy-title{background:#1565c0;color:#fff;}\n.copy-cond{background:#37474f;color:#fff;}\n.copy-html{background:#2e7d32;color:#fff;}\n.copy-btn.flashed{background:#4caf50 !important;}\n.price-row{display:flex;gap:10px;margin-bottom:16px;}\n.price-box{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;}\n.price-label{font-family:var(--mono);font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}\n.price-value{font-family:var(--display);font-size:1.6rem;color:var(--accent);line-height:1;}\n.success-wrap{text-align:center;padding:20px 0;}\n.success-num{font-family:var(--display);font-size:5rem;color:var(--green);line-height:1;margin-bottom:8px;}\n.success-label{font-family:var(--mono);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;}\ncanvas{display:none;}\n</style>\n</head>\n<body>\n\n<!-- HOME -->\n<div class=\"screen active\" id=\"homeScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">QUICK<span>&#183;</span>LISTER</div>\n    <div class=\"topbar-count\" id=\"sessionCount\">0 this session</div>\n  </div>\n  <div class=\"scroll-content\" style=\"display:flex;flex-direction:column;justify-content:center;min-height:calc(100vh - 60px);\">\n    <div style=\"margin-bottom:32px;\">\n      <div style=\"font-family:var(--display);font-size:3.5rem;color:var(--text);line-height:0.9;margin-bottom:8px;\">READY<br>TO LIST</div>\n      <div style=\"font-size:0.9rem;color:var(--muted);line-height:1.5;\">Grade your item, add quick notes, take photos.<br>Listing generated automatically.</div>\n    </div>\n    <button class=\"btn btn-primary\" onclick=\"startItem()\">New Item</button>\n    <button class=\"btn btn-secondary\" onclick=\"showListings()\">View Generated Listings</button>\n  </div>\n</div>\n\n<!-- GRADE -->\n<div class=\"screen\" id=\"gradeScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Grade</div>\n    <div class=\"topbar-count\" id=\"gradeCount\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Condition Grade</div>\n    <div class=\"section-sub\">Pick the grade that matches what you see and tested. When between two grades choose the lower one.</div>\n    <div class=\"grade-grid\">\n      <div class=\"grade-btn\" id=\"gradeA\" onclick=\"selectGrade('A')\">\n        <div class=\"grade-letter\">A</div>\n        <div class=\"grade-name\">Like New</div>\n        <div class=\"grade-desc\">Works perfectly. Looks almost new.</div>\n      </div>\n      <div class=\"grade-btn\" id=\"gradeB\" onclick=\"selectGrade('B')\">\n        <div class=\"grade-letter\">B</div>\n        <div class=\"grade-name\">Good &#9733;</div>\n        <div class=\"grade-desc\">Works perfectly. Normal light wear.</div>\n      </div>\n      <div class=\"grade-btn\" id=\"gradeC\" onclick=\"selectGrade('C')\">\n        <div class=\"grade-letter\">C</div>\n        <div class=\"grade-name\">Fair</div>\n        <div class=\"grade-desc\">Works. Heavy visible wear.</div>\n      </div>\n      <div class=\"grade-btn\" id=\"gradeD\" onclick=\"selectGrade('D')\">\n        <div class=\"grade-letter\">D</div>\n        <div class=\"grade-name\">Parts</div>\n        <div class=\"grade-desc\">Does not work or untested.</div>\n      </div>\n    </div>\n    <button class=\"btn btn-primary\" id=\"gradeContinue\" onclick=\"goToNotes()\" disabled>Continue</button>\n  </div>\n</div>\n\n<!-- NOTES -->\n<div class=\"screen\" id=\"notesScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Notes</div>\n    <div class=\"topbar-count\" id=\"notesGrade\" style=\"color:var(--accent);font-family:var(--mono);font-size:0.7rem;\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Quick Notes</div>\n    <div class=\"section-sub\">Write however you want \u2014 shorthand, fragments, all caps. The AI will clean it up into proper listing copy.</div>\n    <textarea class=\"notes-input\" id=\"notesInput\" placeholder=\"e.g. works great no remote dusty&#10;tested powers on screen perfect&#10;MISSING BATTERY COVER otherwise fine\"></textarea>\n    <div class=\"notes-hint\">\n      Type raw \u2014 the AI handles grammar, capitalization, and tone.<br>\n      Include: what works, what doesn't, what's included, anything notable.\n    </div>\n    <br>\n    <button class=\"btn btn-primary\" onclick=\"goToPhotos()\">Continue</button>\n    <button class=\"btn btn-skip\" onclick=\"goToPhotos()\">Skip \u2014 No Notes</button>\n  </div>\n</div>\n\n<!-- PHOTOS -->\n<div class=\"screen\" id=\"photoScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Photos</div>\n    <div class=\"topbar-count\" id=\"photoGrade\" style=\"color:var(--accent);font-family:var(--mono);font-size:0.7rem;\"></div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"section-title\">Photograph Item</div>\n    <div class=\"section-sub\">Take as many photos as you need. Always include the item and any labels in the same shot.</div>\n    <div class=\"camera-wrap\">\n      <video class=\"camera-video\" id=\"photoVideo\" autoplay playsinline muted></video>\n      <div class=\"camera-prompt\" id=\"cameraPrompt\">Point at item</div>\n      <div class=\"photo-count-badge\" id=\"photoCountBadge\">0 photos</div>\n    </div>\n    <button class=\"shoot-btn\" onclick=\"takePhoto()\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">\n        <path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/>\n        <circle cx=\"12\" cy=\"13\" r=\"4\"/>\n      </svg>\n      Take Photo\n    </button>\n    <div class=\"photo-thumbs\" id=\"photoThumbs\"></div>\n    <button class=\"btn btn-primary\" id=\"photoContinue\" onclick=\"goToGenerate()\" disabled>Generate Listing</button>\n    <button class=\"btn btn-skip\" onclick=\"goToGenerate()\">Skip remaining photos</button>\n  </div>\n  <canvas id=\"photoCanvas\"></canvas>\n</div>\n\n<!-- GENERATING -->\n<div class=\"screen\" id=\"generatingScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">QUICK<span>&#183;</span>LISTER</div>\n  </div>\n  <div class=\"scroll-content\">\n    <div class=\"generating-state\">\n      <div class=\"generating-ring\"></div>\n      <div>\n        <div class=\"generating-text\" id=\"genText\">Identifying item...</div>\n        <div class=\"generating-sub\" id=\"genSub\">Reading photos</div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- RESULT -->\n<div class=\"screen\" id=\"resultScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Listing Ready</div>\n    <div class=\"topbar-count\" id=\"resultCount\"></div>\n  </div>\n  <div class=\"scroll-content\">\n\n    <div class=\"price-row\">\n      <div class=\"price-box\">\n        <div class=\"price-label\">List At</div>\n        <div class=\"price-value\" id=\"priceList\">--</div>\n      </div>\n      <div class=\"price-box\">\n        <div class=\"price-label\">Accept</div>\n        <div class=\"price-value\" id=\"priceAccept\" style=\"color:var(--green);\">--</div>\n      </div>\n      <div class=\"price-box\">\n        <div class=\"price-label\">Decline</div>\n        <div class=\"price-value\" id=\"priceDecline\" style=\"color:var(--red);\">--</div>\n      </div>\n    </div>\n\n    <div style=\"font-family:var(--mono);font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;margin-bottom:16px;\" id=\"priceNote\"></div>\n\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>Title</span><span id=\"titleLen\">0 / 80</span></div>\n      <div class=\"result-content\" id=\"resultTitle\">--</div>\n      <button class=\"copy-btn copy-title\" onclick=\"copyField(this,'resultTitle','title_hidden')\">Copy Title</button>\n      <textarea id=\"title_hidden\" style=\"display:none;\"></textarea>\n    </div>\n\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>Condition Box</span></div>\n      <div class=\"result-content\" id=\"resultCond\">--</div>\n      <button class=\"copy-btn copy-cond\" onclick=\"copyField(this,'resultCond','cond_hidden')\">Copy Condition</button>\n      <textarea id=\"cond_hidden\" style=\"display:none;\"></textarea>\n    </div>\n\n    <div class=\"result-card\">\n      <div class=\"result-header\"><span>HTML Description</span></div>\n      <div class=\"result-content\" id=\"resultDesc\" style=\"font-size:0.8rem;max-height:120px;overflow:hidden;\"></div>\n      <button class=\"copy-btn copy-html\" onclick=\"copyField(this,'resultDesc','html_hidden')\">Copy HTML Description</button>\n      <textarea id=\"html_hidden\" style=\"display:none;\"></textarea>\n    </div>\n\n    <button class=\"btn btn-primary\" style=\"margin-top:8px;\" onclick=\"nextItem()\">Next Item</button>\n    <button class=\"btn btn-secondary\" onclick=\"goHome()\">Back to Home</button>\n  </div>\n</div>\n\n<!-- LISTINGS VIEW -->\n<div class=\"screen\" id=\"listingsScreen\">\n  <div class=\"topbar\">\n    <div class=\"topbar-brand\">Listings</div>\n    <button onclick=\"goHome()\" style=\"background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 14px;border-radius:6px;font-family:var(--mono);font-size:0.6rem;letter-spacing:0.08em;cursor:pointer;\">Close</button>\n  </div>\n  <div class=\"scroll-content\" id=\"listingsContent\">\n    <div style=\"text-align:center;padding:60px 20px;font-family:var(--mono);font-size:0.65rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;\">No listings yet this session</div>\n  </div>\n</div>\n\n<script>\nvar currentItem = {};\nvar photoB64s = [];\nvar photoStream = null;\nvar sessionCount = 0;\nvar sessionListings = [];\n\nvar genSteps = [\n  ['Identifying item...','Reading photos'],\n  ['Researching pricing...','Checking eBay sold listings'],\n  ['Writing listing...','Crafting description'],\n  ['Almost done...','Finalizing copy']\n];\n\nfunction showScreen(id){\n  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});\n  document.getElementById(id).classList.add('active');\n}\n\nfunction goHome(){stopCamera();showScreen('homeScreen');}\n\nfunction startItem(){\n  currentItem={grade:null,notes:'',timestamp:new Date().toISOString()};\n  photoB64s=[];\n  document.querySelectorAll('.grade-btn').forEach(function(b){b.classList.remove('selected');});\n  document.getElementById('gradeContinue').disabled=true;\n  document.getElementById('notesInput').value='';\n  document.getElementById('photoThumbs').innerHTML='';\n  document.getElementById('photoCountBadge').textContent='0 photos';\n  document.getElementById('photoContinue').disabled=true;\n  document.getElementById('gradeCount').textContent='Item '+(sessionCount+1);\n  showScreen('gradeScreen');\n}\n\nfunction selectGrade(g){\n  currentItem.grade=g;\n  document.querySelectorAll('.grade-btn').forEach(function(b){b.classList.remove('selected');});\n  document.getElementById('grade'+g).classList.add('selected');\n  document.getElementById('gradeContinue').disabled=false;\n}\n\nfunction goToNotes(){\n  if(!currentItem.grade)return;\n  document.getElementById('notesGrade').textContent='Grade '+currentItem.grade;\n  showScreen('notesScreen');\n}\n\nfunction goToPhotos(){\n  currentItem.notes=document.getElementById('notesInput').value.trim();\n  document.getElementById('photoGrade').textContent='Grade '+currentItem.grade;\n  startCamera();\n  showScreen('photoScreen');\n}\n\nfunction startCamera(){\n  var video=document.getElementById('photoVideo');\n  if(photoStream)return;\n  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})\n  .then(function(stream){photoStream=stream;video.srcObject=stream;video.play();})\n  .catch(function(e){console.error('Camera error',e);});\n}\n\nfunction stopCamera(){\n  if(photoStream){photoStream.getTracks().forEach(function(t){t.stop();});photoStream=null;}\n}\n\nfunction takePhoto(){\n  var video=document.getElementById('photoVideo');\n  var canvas=document.getElementById('photoCanvas');\n  if(!video.videoWidth){alert('Camera not ready yet.');return;}\n  var scale=Math.min(1,1024/video.videoWidth);\n  canvas.width=Math.round(video.videoWidth*scale);\n  canvas.height=Math.round(video.videoHeight*scale);\n  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);\n  var b64=canvas.toDataURL('image/jpeg',0.82).split(',')[1];\n  photoB64s.push(b64);\n  var img=document.createElement('img');\n  img.src='data:image/jpeg;base64,'+b64;\n  img.className='photo-thumb new';\n  document.getElementById('photoThumbs').appendChild(img);\n  setTimeout(function(){img.className='photo-thumb';},1000);\n  document.getElementById('photoCountBadge').textContent=photoB64s.length+' photo'+(photoB64s.length!==1?'s':'');\n  document.getElementById('photoContinue').disabled=photoB64s.length<1;\n}\n\nfunction goToGenerate(){\n  stopCamera();\n  showScreen('generatingScreen');\n  var si=0;\n  updateGenStep(0);\n  var iv=setInterval(function(){si=Math.min(si+1,genSteps.length-1);updateGenStep(si);},2500);\n\n  fetch('/api/generate-listing',{\n    method:'POST',\n    headers:{'Content-Type':'application/json'},\n    body:JSON.stringify({grade:currentItem.grade,notes:currentItem.notes,photos:photoB64s})\n  })\n  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})\n  .then(function(data){clearInterval(iv);showResult(data);})\n  .catch(function(e){\n    clearInterval(iv);\n    showResult({\n      title:'Listing generation failed \u2014 try again',\n      condition_box:'See photos for condition details.',\n      description_html:'<p>Please try again.</p>',\n      suggested_price:0,accept_price:0,decline_price:0,\n      price_note:'Could not retrieve pricing: '+e.message\n    });\n  });\n}\n\nfunction updateGenStep(i){\n  document.getElementById('genText').textContent=genSteps[i][0];\n  document.getElementById('genSub').textContent=genSteps[i][1];\n}\n\nfunction showResult(r){\n  sessionCount++;\n  document.getElementById('sessionCount').textContent=sessionCount+' this session';\n  document.getElementById('resultCount').textContent='Item '+sessionCount;\n\n  var title=r.title||'--';\n  var cond=r.condition_box||'See photos for condition.';\n  var html=r.description_html||'<p>No description generated.</p>';\n\n  document.getElementById('resultTitle').textContent=title;\n  document.getElementById('titleLen').textContent=title.length+' / 80';\n  document.getElementById('resultCond').textContent=cond;\n  document.getElementById('resultDesc').innerHTML=html;\n\n  document.getElementById('title_hidden').value=title;\n  document.getElementById('cond_hidden').value=cond;\n  document.getElementById('html_hidden').value=html;\n\n  document.getElementById('priceList').textContent=r.suggested_price?'$'+r.suggested_price:'--';\n  document.getElementById('priceAccept').textContent=r.accept_price?'$'+r.accept_price:'--';\n  document.getElementById('priceDecline').textContent=r.decline_price?'$'+r.decline_price:'--';\n  document.getElementById('priceNote').textContent=r.price_note||'';\n\n  sessionListings.push({title:title,cond:cond,html:html,price:r.suggested_price,accept:r.accept_price,decline:r.decline_price});\n  showScreen('resultScreen');\n}\n\nfunction copyField(btn, displayId, hiddenId){\n  var val='';\n  if(hiddenId==='html_hidden'){\n    val=document.getElementById('html_hidden').value;\n  } else {\n    val=document.getElementById(displayId).textContent;\n  }\n  navigator.clipboard.writeText(val.trim()).then(function(){\n    var orig=btn.textContent;\n    btn.classList.add('flashed');\n    btn.textContent='Copied!';\n    setTimeout(function(){btn.classList.remove('flashed');btn.textContent=orig;},1500);\n  });\n}\n\nfunction nextItem(){startItem();}\n\nfunction showListings(){\n  var content=document.getElementById('listingsContent');\n  if(sessionListings.length===0){\n    content.innerHTML='<div style=\"text-align:center;padding:60px 20px;font-family:var(--mono);font-size:0.65rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;\">No listings yet this session</div>';\n  } else {\n    content.innerHTML=sessionListings.map(function(l,i){\n      return '<div style=\"background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px;\">'\n        +'<div style=\"font-family:var(--mono);font-size:0.55rem;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:6px;\">Item '+(i+1)+(l.price?' &nbsp;\u00b7&nbsp; $'+l.price:'')+' </div>'\n        +'<div style=\"font-size:0.9rem;font-weight:700;color:var(--text);\">'+l.title+'</div>'\n        +'</div>';\n    }).join('');\n  }\n  showScreen('listingsScreen');\n}\n</script>\n</body>\n</html>";

function callClaude(payload, callback) {
  var body = JSON.stringify(payload);
  var options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      console.log('[API] Status:', res.statusCode);
      if(res.statusCode !== 200) console.log('[API] Error:', data.slice(0,300));
      try { callback(null, JSON.parse(data)); }
      catch(e) { callback(null, {content:[], type:'error', error:{message:'parse_failed'}}); }
    });
  });
  req.on('error', function(e) { console.log('[API] Error:', e.message); callback(e); });
  req.write(body);
  req.end();
}

function extractText(content) {
  return (content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('');
}

function extractJSON(text) {
  var depth=0, start=-1;
  for(var i=0;i<text.length;i++){
    if(text[i]==='{'){if(depth===0)start=i;depth++;}
    else if(text[i]==='}' && depth>0){depth--;if(depth===0&&start!==-1){try{return JSON.parse(text.slice(start,i+1));}catch(e){start=-1;}}}
  }
  return null;
}

function parseBody(req, callback) {
  var body = '';
  req.on('data', function(c) { body += c; });
  req.on('end', function() {
    try { callback(null, JSON.parse(body)); }
    catch(e) { callback(new Error('Bad JSON')); }
  });
}

function sendJSON(res, code, obj) {
  res.writeHead(code, {'Content-Type':'application/json'});
  res.end(JSON.stringify(obj));
}

const server = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  if(req.method==='GET' && req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html'});
    var page = HTML_PAGE.replace('</head>', '<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png"></head>');
    res.end(page);
    return;
  }

  if(req.method==='GET' && req.url==='/ping'){
    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end('ok');
    return;
  }

  if(req.method==='GET' && req.url==='/manifest.json'){
    res.writeHead(200,{'Content-Type':'application/manifest+json'});
    res.end(JSON.stringify({
      name:'Quick Lister',short_name:'Quick List',
      description:'Personal eBay listing tool',
      start_url:'/',display:'fullscreen',orientation:'portrait',
      background_color:'#111111',theme_color:'#111111',
      icons:[
        {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},
        {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}
      ]
    }));
    return;
  }

  if(req.method==='GET' && (req.url==='/icon-192.png' || req.url==='/icon-512.png')){
    var size = req.url.includes('512') ? 512 : 192;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
      +'<rect width="'+size+'" height="'+size+'" fill="#111111"/>'
      +'<rect x="'+Math.round(size*0.08)+'" y="'+Math.round(size*0.08)+'" width="'+Math.round(size*0.84)+'" height="'+Math.round(size*0.84)+'" rx="'+Math.round(size*0.12)+'" fill="#e8ff00"/>'
      +'<text x="'+Math.round(size*0.5)+'" y="'+Math.round(size*0.48)+'" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="'+Math.round(size*0.28)+'" fill="#000000" text-anchor="middle" dominant-baseline="middle">LIST</text>'
      +'<text x="'+Math.round(size*0.5)+'" y="'+Math.round(size*0.75)+'" font-family="Arial,sans-serif" font-weight="700" font-size="'+Math.round(size*0.11)+'" fill="#000000" text-anchor="middle" opacity="0.6">QUICK</text>'
      +'</svg>';
    res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=86400'});
    res.end(svg);
    return;
  }

  if(req.method==='POST' && req.url==='/api/generate-listing'){
    parseBody(req, function(err, parsed) {
      if(err){sendJSON(res,400,{title:'Error',condition_box:'Bad request',description_html:'<p>Error</p>'});return;}

      var grade = parsed.grade || 'B';
      var notes = parsed.notes || '';
      var photos = parsed.photos || [];

      if(photos.length === 0){
        sendJSON(res,200,{title:'No photos provided',condition_box:'Please take photos of the item.',description_html:'<p>No photos were provided.</p>',suggested_price:0,accept_price:0,decline_price:0});
        return;
      }

      var gradeName = {A:'Like New / Open Box', B:'Good - Normal Used Condition', C:'Fair - Heavy Cosmetic Wear', D:'For Parts or Not Working'}[grade] || 'Used';

      // STEP 1: Vision - identify and assess item
      var photoContent = [{type:'text',text:'Identify this item precisely. Read any visible model numbers, serial numbers, or labels. Assess condition. Return a JSON object with: item_name, brand, model, serial_number (if visible), category, condition_notes (what you observe), includes (what accessories are visible).'}];
      photos.slice(0,4).forEach(function(b64) {
        photoContent.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}});
      });

      callClaude({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: 'You are an expert electronics appraiser. Examine these photos and identify the item with precision. Include brand, model, serial number if visible. Note what accessories or cables are included. Return ONLY a JSON object, no markdown.',
        messages:[{role:'user',content:photoContent}]
      }, function(err, r1) {
        if(err||r1.type==='error'){
          sendJSON(res,200,{title:'Could not identify item',condition_box:'See photos.',description_html:'<p>Could not identify item from photos. Please try again.</p>',suggested_price:0,accept_price:0,decline_price:0});
          return;
        }

        var visionText = extractText(r1.content);
        var visionData = extractJSON(visionText) || {item_name: visionText.trim().slice(0,100) || 'Unknown item'};
        var itemName = visionData.item_name || 'Unknown item';
        console.log('[GENERATE] Identified:', itemName);

        // STEP 2: Research + write listing
        callClaude({
          model: 'claude-sonnet-4-5',
          max_tokens: 1500,
          tools: [{type:'web_search_20250305',name:'web_search'}],
          system: [
            'You are an experienced eBay seller writing a listing for a personal resale account.',
            'Search eBay completed/sold listings to get accurate current pricing.',
            'Write in an honest, specific, confident tone. Do not oversell or undersell.',
            'Pricing strategy: list just below mid-range of recent sold comps.',
            'The seller provided raw notes in whatever format — clean them up into proper copy.',
            'Include serial number in description when provided.',
            'Do not mention pricing in the buyer-facing description.',
            '',
            'Grade guide: A=Like New, B=Normal Used (most common), C=Heavy Cosmetic Wear, D=Parts/Untested',
            '',
            'Return ONLY this JSON, no markdown:',
            '{',
            '  "title": "eBay title under 80 chars, keyword rich",',
            '  "condition_box": "2-3 sentence honest condition description",',
            '  "description_html": "Full HTML listing using simple paragraphs and a specs table",',
            '  "suggested_price": 45,',
            '  "accept_price": 36,',
            '  "decline_price": 28,',
            '  "price_note": "Brief internal pricing context e.g. Avg sold $52, listing below mid"',
            '}'
          ].join('\n'),
          messages:[{role:'user',content:[
            'Item: '+itemName,
            'Grade: '+grade+' ('+gradeName+')',
            'Serial Number: '+(visionData.serial_number||'Not visible'),
            'What is included: '+(visionData.includes||'See photos'),
            'Condition from photos: '+(visionData.condition_notes||'See photos'),
            'Seller raw notes: '+(notes||'None provided'),
            '',
            'Search eBay sold listings and write the complete listing. Return JSON only.'
          ].join('\n')}]
        }, function(err2, r2) {
          if(err2||r2.type==='error'){
            sendJSON(res,200,{title:itemName,condition_box:'See photos for condition details.',description_html:'<p>'+itemName+'</p>',suggested_price:0,accept_price:0,decline_price:0,price_note:'Could not retrieve pricing.'});
            return;
          }
          var text = extractText(r2.content);
          var result = extractJSON(text) || {title:itemName,condition_box:'See photos.',description_html:'<p>'+itemName+'</p>',suggested_price:0,accept_price:0,decline_price:0};
          console.log('[GENERATE] Done:', result.title, '| Price: $'+result.suggested_price);
          sendJSON(res,200,result);
        });
      });
    });
    return;
  }

  res.writeHead(404);res.end('Not found');
});

server.listen(PORT, function(){console.log('Quick Lister running on port '+PORT);});
