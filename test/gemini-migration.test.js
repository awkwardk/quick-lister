'use strict';
const assert = require('assert');
const {test, before, after} = require('node:test');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const {spawn} = require('child_process');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-require-'));
delete process.env.GEMINI_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

const app = require('../server.js');

const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];
const FORBIDDEN = ['thinkingBudget', 'thinking_budget', 'temperature', 'topP', 'top_p', 'topK', 'top_k', 'candidateCount', 'candidate_count'];

function walkKeys(value, fn){
  if(!value || typeof value !== 'object')return;
  if(Array.isArray(value)){value.forEach(function(v){walkKeys(v, fn);});return;}
  Object.keys(value).forEach(function(k){
    fn(k, value[k]);
    walkKeys(value[k], fn);
  });
}

function assertNoForbidden(body, label){
  walkKeys(body, function(k){
    assert.ok(FORBIDDEN.indexOf(k) === -1, label + ' must not send ' + k);
  });
}

function assertUserTurnOnly(contents, label){
  assert.ok(Array.isArray(contents) && contents.length > 0, label + ' needs contents');
  contents.forEach(function(turn){
    assert.strictEqual(turn.role, 'user', label + ' must not prefill a model turn');
    (turn.parts || []).forEach(function(part){
      assert.ok(!part.functionCall && !part.function_call, label + ' must not send a function call');
      assert.ok(!part.functionResponse && !part.function_response, label + ' must not send a function response');
    });
  });
  assert.strictEqual(contents[contents.length - 1].role, 'user', label + ' must end on a user turn');
}

function assertThinking(body, label){
  var level = body.generationConfig && body.generationConfig.thinkingConfig && body.generationConfig.thinkingConfig.thinkingLevel;
  assert.ok(THINKING_LEVELS.indexOf(level) !== -1, label + ' thinkingLevel must be a supported enum, got ' + level);
  assert.strictEqual(level, 'MINIMAL', label + ' should stay at minimal thinking, the stand-in for thinkingBudget 0');
  assert.ok(!body.generationConfig.thinkingConfig.thinkingBudget, label + ' must not send thinkingBudget');
}

test('model id is centralized on gemini-3.5-flash-lite', function(){
  assert.strictEqual(app.GEMINI_MODEL_ID, 'gemini-3.5-flash-lite');
  assert.strictEqual(app.OPENROUTER_MODEL_ID, 'google/gemini-3.5-flash-lite');
  assert.strictEqual(app.GEMINI_THINKING_LEVEL, 'MINIMAL');
  var src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.ok(!/['"]gemini-2\.5-flash['"]/.test(src), 'a string still names gemini-2.5-flash');
  assert.ok(!/google\/gemini-2\.5-flash['":]/.test(src), 'OpenRouter slug still names gemini-2.5-flash');
  assert.ok(!/thinkingBudget\s*:/.test(src), 'thinkingBudget is still set');
});

test('vision request is JSON mode, minimal thinking, one user turn', function(){
  var body = app.buildGeminiGenerateBody({system:'sys', text:'identify', images:['abc'], maxTokens:400, useSearch:false});
  assertNoForbidden(body, 'vision');
  assertThinking(body, 'vision');
  assert.strictEqual(body.generationConfig.maxOutputTokens, 400);
  assert.strictEqual(body.generationConfig.responseMimeType, 'application/json');
  assert.strictEqual(body.tools, undefined);
  assertUserTurnOnly(body.contents, 'vision');
  assert.strictEqual(body.contents[0].parts[1].inline_data.mime_type, 'image/jpeg');
  assert.strictEqual(body.contents[0].parts[1].inline_data.data, 'abc');
  assert.strictEqual(body.system_instruction.parts[0].text, 'sys');
});

test('search request keeps google_search and omits JSON mime type', function(){
  var body = app.buildGeminiGenerateBody({system:'price', text:'search sold', images:[], maxTokens:1500, useSearch:true});
  assertNoForbidden(body, 'search');
  assertThinking(body, 'search');
  assert.strictEqual(body.generationConfig.responseMimeType, undefined);
  assert.deepStrictEqual(body.tools, [{google_search:{}}]);
  assertUserTurnOnly(body.contents, 'search');
  assert.strictEqual(body.contents[0].parts.length, 1);
});

test('transcription request is plain text audio, not a function call', function(){
  var body = app.buildGeminiTranscribeBody('audiodata', 'audio/webm', 'transcribe');
  assertNoForbidden(body, 'transcribe');
  assertThinking(body, 'transcribe');
  assert.strictEqual(body.generationConfig.maxOutputTokens, 800);
  assert.strictEqual(body.generationConfig.responseMimeType, undefined);
  assert.strictEqual(body.tools, undefined);
  assertUserTurnOnly(body.contents, 'transcribe');
  assert.strictEqual(body.contents[0].parts[1].inline_data.mime_type, 'audio/webm');
  assert.strictEqual(body.contents[0].parts[1].inline_data.data, 'audiodata');
  var wav = app.buildGeminiTranscribeBody('audiodata', 'audio/wav', 'transcribe');
  assert.strictEqual(wav.contents[0].parts[1].inline_data.mime_type, 'audio/wav');
});

test('OpenRouter listing body uses the replacement slug and minimal effort', function(){
  var plain = app.buildOpenRouterChatBody({system:'sys', text:'identify', images:['abc'], maxTokens:400, useSearch:false});
  var search = app.buildOpenRouterChatBody({system:'sys', text:'price', images:[], maxTokens:1500, useSearch:true});
  [plain, search].forEach(function(body, i){
    var label = i ? 'openrouter-search' : 'openrouter-vision';
    assertNoForbidden(body, label);
    assert.ok(body.model.indexOf('gemini-2.5') === -1, label + ' still uses 2.5');
    assert.deepStrictEqual(body.reasoning, {effort:'minimal', exclude:true});
    assert.strictEqual(body.response_format.type, 'json_object');
    assert.ok(!body.tools, label + ' must not send function tools without call ids');
    assert.strictEqual(body.messages[0].role, 'system');
    assert.strictEqual(body.messages[body.messages.length - 1].role, 'user');
    body.messages.forEach(function(m){
      assert.notStrictEqual(m.role, 'assistant', label + ' must not prefill an assistant turn');
    });
  });
  assert.strictEqual(plain.model, 'google/gemini-3.5-flash-lite');
  assert.strictEqual(search.model, 'google/gemini-3.5-flash-lite:online');
  assert.strictEqual(plain.max_tokens, 400);
  assert.strictEqual(plain.messages[1].content[1].type, 'image_url');
});

test('OpenRouter transcription stays on the same slug without JSON mode', function(){
  var webm = app.buildOpenRouterTranscribeBody('audiodata', 'audio/webm', 'transcribe');
  var wav = app.buildOpenRouterTranscribeBody('audiodata', 'audio/wav', 'transcribe');
  assert.strictEqual(webm.model, 'google/gemini-3.5-flash-lite');
  assert.deepStrictEqual(webm.reasoning, {effort:'minimal', exclude:true});
  assert.strictEqual(webm.response_format, undefined);
  assert.strictEqual(webm.temperature, undefined);
  assert.strictEqual(webm.top_p, undefined);
  assert.strictEqual(webm.messages[webm.messages.length - 1].role, 'user');
  assert.strictEqual(webm.messages[1].content[1].input_audio.format, 'webm');
  assert.strictEqual(wav.messages[1].content[1].input_audio.format, 'wav');
  assertNoForbidden(webm, 'openrouter-transcribe');
});

const TINY_JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

let child;
let base;

function request(method, urlPath, body, headers){
  return new Promise(function(resolve, reject){
    var data = body == null ? null : (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    var reqHeaders = Object.assign({}, headers || {});
    if(data && !reqHeaders['Content-Type'] && !reqHeaders['content-type'])reqHeaders['Content-Type'] = 'application/json';
    if(data)reqHeaders['Content-Length'] = data.length;
    var req = http.request(base + urlPath, {method:method, headers:reqHeaders}, function(res){
      var chunks = [];
      res.on('data', function(c){chunks.push(c);});
      res.on('end', function(){
        var raw = Buffer.concat(chunks);
        var text = raw.toString('utf8');
        var json = null;
        try{json = JSON.parse(text);}catch(e){}
        resolve({status:res.statusCode, text:text, json:json, raw:raw, type:res.headers['content-type'] || ''});
      });
    });
    req.on('error', reject);
    if(data)req.write(data);
    req.end();
  });
}

before(async function(){
  var port = await new Promise(function(resolve, reject){
    var s = net.createServer();
    s.listen(0, '127.0.0.1', function(){
      var p = s.address().port;
      s.close(function(){resolve(p);});
    });
    s.on('error', reject);
  });
  var dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-http-'));
  child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, {
      PORT: String(port),
      DATA_DIR: dataDir,
      GEMINI_API_KEY: '',
      OPENROUTER_API_KEY: '',
      ANTHROPIC_API_KEY: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  var log = '';
  child.stdout.on('data', function(c){log += c;});
  child.stderr.on('data', function(c){log += c;});
  var deadline = Date.now() + 8000;
  while(log.indexOf('running on port') === -1){
    if(child.exitCode != null)throw new Error('server exited early: ' + log);
    if(Date.now() > deadline)throw new Error('server did not start: ' + log);
    await new Promise(function(r){setTimeout(r, 50);});
  }
  base = 'http://127.0.0.1:' + port;
});

after(function(){
  if(child && !child.killed)child.kill('SIGTERM');
});

test('listing pages and generate/regenerate/delete run without API keys', async function(){
  var ping = await request('GET', '/ping');
  assert.strictEqual(ping.status, 200);
  assert.strictEqual(ping.text, 'ok');

  var phone = await request('GET', '/');
  assert.strictEqual(phone.status, 200);
  assert.ok(phone.text.indexOf('Generate Listing') !== -1);

  var listingsPage = await request('GET', '/listings');
  assert.strictEqual(listingsPage.status, 200);
  assert.ok(listingsPage.text.indexOf('New Listing from Photos') !== -1);
  assert.ok(listingsPage.text.indexOf('Generate Listing') !== -1);

  var empty = await request('GET', '/api/get-listings');
  assert.strictEqual(empty.status, 200);
  assert.deepStrictEqual(empty.json.listings, []);
  assert.strictEqual((await request('GET', '/api/listing-count')).json.count, 0);

  var bad = await request('POST', '/api/generate-from-upload', 'not-json', {'Content-Type':'application/json'});
  assert.strictEqual(bad.status, 400);

  var noPhotos = await request('POST', '/api/generate-listing', {photos:[], notes:'tested working'});
  assert.strictEqual(noPhotos.status, 200);
  assert.strictEqual(noPhotos.json.title, 'No photos');

  var uploaded = await request('POST', '/api/generate-from-upload', {
    photos:[TINY_JPEG],
    grade:'C',
    notes:'lot of 2, untested, heavy wear',
    brand_model:'Dell D3100'
  });
  assert.strictEqual(uploaded.status, 202);
  assert.strictEqual(uploaded.json.success, true);
  assert.strictEqual(uploaded.json.status, 'processing');
  var itemId = uploaded.json.itemId;

  var listed = await request('GET', '/api/get-listings');
  assert.strictEqual(listed.json.count, 1);
  var card = listed.json.listings[0];
  assert.strictEqual(card.itemId, itemId);
  assert.strictEqual(card.status, 'failed');
  assert.strictEqual(card.photoCount, 1);
  assert.ok(card.error);

  var photo = await request('GET', '/api/photo/' + encodeURIComponent(itemId) + '/1');
  assert.strictEqual(photo.status, 200);
  assert.ok(photo.type.indexOf('image/jpeg') !== -1);
  assert.ok(photo.raw.length > 10);

  var regen = await request('POST', '/api/regenerate/' + encodeURIComponent(itemId), {brand_model:'Dell D3100', notes:'missing power adapter'});
  assert.strictEqual(regen.status, 202);
  assert.strictEqual(regen.json.status, 'processing');
  var afterRegen = await request('GET', '/api/get-listings');
  assert.strictEqual(afterRegen.json.listings[0].status, 'failed');
  assert.strictEqual(afterRegen.json.listings[0].notes, 'missing power adapter');

  var voice = await request('POST', '/api/voice/transcribe', Buffer.from('not-audio'), {'Content-Type':'audio/webm'});
  assert.strictEqual(voice.status, 200);
  assert.strictEqual(voice.json.success, false);

  var phoneGen = await request('POST', '/api/generate-listing', {
    photos:[TINY_JPEG],
    notes:'HP 92A toner, tested working',
    itemId:'item_phone_test'
  });
  assert.strictEqual(phoneGen.status, 202);
  assert.strictEqual(phoneGen.json.itemId, 'item_phone_test');
  var both = await request('GET', '/api/get-listings');
  assert.strictEqual(both.json.count, 2);
  var phoneCard = both.json.listings.filter(function(l){return l.itemId === 'item_phone_test';})[0];
  assert.ok(phoneCard);
  assert.strictEqual(phoneCard.status, 'failed');

  var dup = await request('POST', '/api/generate-listing', {photos:[TINY_JPEG], itemId:'item_phone_test'});
  assert.strictEqual(dup.status, 200);
  assert.strictEqual(dup.json.duplicate, true);

  var deleted = await request('DELETE', '/api/listing/' + encodeURIComponent(itemId));
  assert.strictEqual(deleted.status, 200);
  assert.strictEqual(deleted.json.success, true);
  var remaining = await request('GET', '/api/get-listings');
  assert.strictEqual(remaining.json.count, 1);
  assert.strictEqual(remaining.json.listings[0].itemId, 'item_phone_test');

  var cleared = await request('POST', '/api/clear-listings', {});
  assert.strictEqual(cleared.status, 200);
  assert.strictEqual((await request('GET', '/api/listing-count')).json.count, 0);
});
