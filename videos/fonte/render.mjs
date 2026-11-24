// node render.mjs pagina.html saida.mp4 [fps] [t0] [t1] [so_quadros]
import { spawn, execFileSync } from 'child_process'; import fs from 'fs';
const [pag, saida, fpsA, t0A, t1A, soQ] = process.argv.slice(2);
const fps = +fpsA || 24, port = 9400 + Math.floor(Math.random() * 400);
const ch = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--remote-debugging-port=' + port, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const pg = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find(x => x.type === 'page');
const ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await cmd('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cmd('Page.enable'); await cmd('Page.navigate', { url: 'file://' + pag }); await new Promise(r => setTimeout(r, 2500));
const dur = (await cmd('Runtime.evaluate', { expression: 'DUR + "|" + document.title', returnByValue: true })).result.value; console.log('pagina:', dur);
const D = +String(dur).split('|')[0], t0 = +t0A || 0, t1 = t1A ? +t1A : D;
const dir = saida + '.q'; fs.mkdirSync(dir, { recursive: true });
const lista = soQ ? soQ.split(',').map(Number) : null;
let n = 0, ini = Date.now();
const tempos = lista || Array.from({ length: Math.round((t1 - t0) * fps) }, (_, i) => t0 + i / fps);
for (const t of tempos) {
  await cmd('Runtime.evaluate', { expression: 'frame(' + t + ')', returnByValue: true });
  const r = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
  fs.writeFileSync(dir + '/q' + String(n).padStart(5, '0') + '.jpg', Buffer.from(r.data, 'base64')); n++;
  if (n % 24 === 0 || lista) console.log(n + '/' + tempos.length, ((Date.now() - ini) / n / 1000).toFixed(2) + ' s/quadro');
}
ws.close(); ch.kill();
if (!lista) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', dir + '/q%05d.jpg', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', saida + '.tmp.mp4']); fs.renameSync(saida + '.tmp.mp4', saida); console.log('ok', saida, fs.statSync(saida).size); }
