// SOGTANA Cloud - النسخة المصححة لـ Vercel
// بلا express - بلا socket.io - غير polling

// باش ما يتمسحش كل مرة فـ Vercel
if (!globalThis.__SOGTANA__) {
  globalThis.__SOGTANA__ = { phones: {}, requests: {} };
}
const store = globalThis.__SOGTANA__;

function getBody(req) {
  // Vercel كيعطينا body واجد
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    if (typeof req.body === 'object') return req.body;
  }
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  // 1 - الصفحة ديال البيسي
  if (path === '/' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <html dir="rtl"><head><meta charset="utf-8"><title>SOGTANA Cloud</title></head>
      <body style="font-family:Arial;text-align:center;padding:40px;background:#f5f5f5">
        <h1>☁️ SOGTANA Cloud</h1>
        <p>دخل الكود ديال التيليفون ديالك</p>
        <input id="code" placeholder="مثال: 4582" style="padding:12px;font-size:18px;text-align:center;border-radius:10px;border:1px solid #ccc">
        <br><br>
        <button onclick="check()" style="padding:12px 30px;font-size:18px;background:#7c3aed;color:white;border:none;border-radius:10px;cursor:pointer">دخل</button>
        <p id="msg"></p>
        <div id="gallery" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center"></div>
        <script>
          async function check(){
            let code = document.getElementById('code').value.trim();
            if(!code){ document.getElementById('msg').innerText = 'كتب الكود بعدا!'; return; }
            let r = await fetch('/api/phone-status?code='+encodeURIComponent(code));
            let j = await r.json();
            document.getElementById('msg').innerText = j.online ? '✅ التيليفون شاعل! كنجيب التصاور...' : '❌ التيليفون طافي، شعل التطبيق فالتيليفون';
            if(j.online){ loadList(code); }
          }
          async function loadList(code){
            let r = await fetch('/api/request', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({code, type:'list'})});
            let j = await r.json();
            setTimeout(async ()=>{
              let r2 = await fetch('/api/get-response?id='+j.requestId);
              let j2 = await r2.json();
              if(j2.data && j2.data.images){
                document.getElementById('gallery').innerHTML = j2.data.images.map(img=>'<img src="'+img+'" style="width:150px;height:150px;object-fit:cover;border-radius:10px">').join('');
              } else {
                document.getElementById('msg').innerText = 'كيتسنى التيليفون يجاوب... عاود ورك دخل';
              }
            }, 3000);
          }
        </script>
      </body></html>
    `);
  }

  // 2 - التيليفون كيقول أنا شاعل
  if (path === '/api/phone-online' && req.method === 'POST') {
    const b = getBody(req);
    if (!b.code) return res.status(400).json({ error: 'code required' });
    store.phones[b.code] = { online: true, lastSeen: Date.now() };
    return res.status(200).json({ ok: true });
  }

  // 3 - واش التيليفون شاعل؟
  if (path === '/api/phone-status' && req.method === 'GET') {
    const code = url.searchParams.get('code');
    const p = store.phones[code];
    const online = p && (Date.now() - p.lastSeen < 30000);
    return res.status(200).json({ online: !!online });
  }

  // 4 - البيسي كيطلب
  if (path === '/api/request' && req.method === 'POST') {
    const b = getBody(req);
    if (!b.code) return res.status(400).json({ error: 'code required' });
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    store.requests[id] = { code: b.code, type: b.type || 'list', status: 'waiting', created: Date.now() };
    return res.status(200).json({ requestId: id });
  }

  // 5 - التيليفون كيجيب شنو مطلوب منو
  if (path === '/api/phone-get-requests' && req.method === 'GET') {
    const code = url.searchParams.get('code');
    const list = Object.entries(store.requests)
      .filter(([id, r]) => r.code === code && r.status === 'waiting')
      .map(([id, r]) => ({ id, ...r }));
    return res.status(200).json(list);
  }

  // 6 - التيليفون كيصيفط الجواب
  if (path === '/api/response' && req.method === 'POST') {
    const b = getBody(req);
    if (store.requests[b.requestId]) {
      store.requests[b.requestId].status = 'done';
      store.requests[b.requestId].data = b.data;
    }
    return res.status(200).json({ ok: true });
  }

  // 7 - البيسي كيجيب الجواب
  if (path === '/api/get-response' && req.method === 'GET') {
    const id = url.searchParams.get('id');
    const r = store.requests[id];
    if (!r) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({ status: r.status, data: r.data || null });
  }

  return res.status(404).json({ error: 'not found' });
};
