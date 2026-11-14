# Gera o site (index.html) a partir do catálogo do app (../catalogo.json): pedras, fotos e logo.
# Uso: python3 site/gerar.py   (rodar de novo quando o catálogo mudar)
import json, base64, io, html, os, urllib.parse
from PIL import Image
os.chdir(os.path.dirname(os.path.abspath(__file__)))
c = json.load(open('../catalogo.json'))
os.makedirs('img', exist_ok=True)
def save(durl, name, maxw=900):
    im = Image.open(io.BytesIO(base64.b64decode(durl.split(',', 1)[1]))).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)))
    im.save(f'img/{name}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    return f'img/{name}.jpg'
save(c['emp']['logoUrl'], 'logo', 480)
for t in c.get('trabalhos', []):
    for i, f in enumerate(t.get('fotos', [])[:1]): save(f, f'obra-{i}')
GRUPOS = [('granitos', 'Granitos'), ('marmores', 'Mármores'), ('quartzitos', 'Quartzitos'), ('ultra', 'Ultra compactos')]
def grupo(cat):
    k = cat.lower()
    if 'mármore' in k or 'marmore' in k: return 'marmores'
    if 'quartzito' in k: return 'quartzitos'
    if 'ultra' in k: return 'ultra'
    return 'granitos'
pedras = []
for p in c['pedras']:
    fs = [f for f in (p.get('fotos') or []) if isinstance(f, str) and f.startswith('data:')]
    if not fs: continue
    slug = ''.join(ch if ch.isalnum() else '-' for ch in p['id']).strip('-')
    img = save(fs[0], 'pedra-' + slug)
    nm = ' '.join(p['nm'].split()); nm = nm[0].upper() + nm[1:]
    nm = ' '.join(w if w.lower() in ('de', 'da', 'do') else w[0].upper() + w[1:] for w in nm.split())
    pedras.append(dict(nm=nm, cat=p['cat'].strip(), g=grupo(p['cat']), fin=(p.get('fin') or '').strip(), desc=(p.get('desc') or '').strip().split('\n')[0], img=img))
ordem = {g: i for i, (g, _) in enumerate(GRUPOS)}
pedras.sort(key=lambda x: (ordem[x['g']], x['nm']))
E = lambda s: html.escape(s, quote=True)
NUM = '5574991484460'
wa = lambda t: 'https://wa.me/' + NUM + '?text=' + urllib.parse.quote(t)
ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
destaque = {x['nm'].lower(): x for x in pedras}
mos = [destaque.get(n) for n in ['preto via láctea', 'perla santana', 'preto são gabriel', 'branco itaúnas']]
mos = [m for m in mos if m] + [p for p in pedras if p not in mos]
mosaico = ''.join(f'<figure><img src="{E(m["img"])}" alt=""><figcaption>{E(m["nm"])}</figcaption></figure>' for m in mos[:4])
filtros = '<button class="on" data-g="todas" role="tab" aria-selected="true">Todas</button>' + ''.join(
    f'<button data-g="{g}" role="tab" aria-selected="false">{n}</button>' for g, n in GRUPOS if any(p['g'] == g for p in pedras))
cards = ''.join(
    f'<button class="pedra" data-g="{p["g"]}" data-nome="{E(p["nm"])}" data-cat="{E(p["cat"])}" data-fin="{E(p["fin"])}" data-desc="{E(p["desc"])}">'
    f'<div class="foto"><img src="{E(p["img"])}" alt="{E(p["nm"])}" loading="lazy"></div><div class="info"><b>{E(p["nm"])}</b><span>{E(p["cat"])}</span></div></button>'
    for p in pedras)
t = open('_modelo.html', encoding='utf-8').read()
rep = {'{{WA}}': wa('Olá! Vim pelo site e quero um orçamento.'), '{{WA_COZ}}': wa('Olá! Vim pelo site e quero orçar uma cozinha/bancada.'),
       '{{WA_BAN}}': wa('Olá! Vim pelo site e quero orçar um banheiro.'), '{{WA_SOL}}': wa('Olá! Vim pelo site e quero orçar soleira/peitoril.'),
       '{{ICON_WA}}': ICON, '{{ICON_WA_SO}}': ICON.replace('fill="currentColor"', ''), '{{MOSAICO}}': mosaico, '{{FILTROS}}': filtros,
       '{{PEDRAS}}': cards, '{{N_PEDRAS}}': str(len(pedras))}
for k, v in rep.items(): t = t.replace(k, E(v) if k.startswith('{{WA') else v)
assert '{{' not in t
open('index.html', 'w', encoding='utf-8').write(t)
print('ok', len(pedras), 'pedras')
