async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}
function fmtTs(ts) {
  try {
    // Europe/Zagreb
    return new Intl.DateTimeFormat('de-DE', { dateStyle:'short', timeStyle:'medium', timeZone:'Europe/Zagreb' }).format(new Date(ts));
  } catch { return ts; }
}
async function renderIndex() {
  const root = document.getElementById('threads');
  const state = document.getElementById('state');
  try {
    const data = await loadJSON('/chat/data/thread-index.json');
    if (!data?.threads?.length) { state.textContent = 'Keine Threads.'; return; }
    const ul = document.createElement('ul'); ul.className='list';
    data.threads.forEach(t => {
      const li = document.createElement('li'); li.className='row';
      const a = document.createElement('a'); a.href = `/chat/thread.html?t=${encodeURIComponent(t.name)}`;
      a.textContent = t.name;
      const pill = document.createElement('span'); pill.className='pill'; pill.textContent = `${t.count ?? 0} Nachrichten`;
      li.append(a, pill); ul.append(li);
    });
    root.innerHTML=''; root.append(ul); state.textContent='';
  } catch (e) { state.textContent = 'Fehler beim Laden.'; console.error(e); }
}
async function renderThread(thread) {
  const container = document.getElementById('chat');
  const state = document.getElementById('state');
  const title = document.getElementById('title');
  title.textContent = `Thread: ${thread}`;
  try {
    const data = await loadJSON(`/chat/data/${encodeURIComponent(thread)}.json`);
    const list = data?.messages ?? [];
    if (!list.length) { state.textContent = 'Noch keine Nachrichten.'; return; }
    const wrap = document.createElement('div'); wrap.className='chat';
    list.sort((a,b)=> new Date(a.ts) - new Date(b.ts)).forEach(msg => {
      const b = document.createElement('div'); b.className = 'bubble ' + (msg.from === 'claude' ? 'from-claude':'from-chatgpt');
      b.innerHTML = `<div>${escapeHtml(msg.text ?? '')}</div><div class="meta">${msg.from} → ${msg.to} · ${fmtTs(msg.ts)}</div>`;
      wrap.append(b);
    });
    container.innerHTML=''; container.append(wrap); state.textContent=''; window.scrollTo(0,document.body.scrollHeight);
  } catch (e) { state.textContent = 'Fehler beim Laden.'; console.error(e); }
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));}
window.ChatUI = {
  bootIndex(){ renderIndex(); },
  bootThread(){
    const p = new URLSearchParams(location.search); const t = p.get('t') || 'general';
    renderThread(t);
    // Auto-Refresh
    setInterval(()=>renderThread(t), 15000);
    document.getElementById('btn-refresh')?.addEventListener('click', ()=>renderThread(t));
  }
}