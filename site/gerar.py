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
    pr = 0
    try: pr = float(str(p.get('pr') or 0).replace(',', '.'))
    except Exception: pass
    faixa = '$' if pr < 400 else '$$' if pr < 800 else '$$$' if pr < 1500 else '$$$$'
    pedras.append(dict(faixa=faixa, nm=nm, cat=p['cat'].strip(), g=grupo(p['cat']), fin=(p.get('fin') or '').strip(), desc=(p.get('desc') or '').strip().split('\n')[0], img=img))
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
    f'<button class="pedra" data-g="{p["g"]}" data-nome="{E(p["nm"])}" data-cat="{E(p["cat"])}">'
    f'<div class="foto"><img src="{E(p["img"])}" alt="{E(p["nm"])}" loading="lazy"></div><div class="info"><b>{E(p["nm"])}</b><span>{E(p["cat"])}<i>{p["faixa"]}</i></span></div></button>'
    for p in pedras)
filtros = filtros.replace('<button ', '<button class="chip" ').replace('class="chip" class="on"', 'class="chip on"')
ordem_sim = ['Preto São Gabriel', 'Branco Itaúnas', 'Perla Santana', 'Preto Via Láctea', 'Ultra Compacto Carrara', 'Verde Ubatuba', 'Branco Dallas', 'Cinza Andorinhas', 'Taj Mahal Sintético', 'Branco Siena', 'Preto Absoluto', 'Café Imperial']
sim = [destaque[n.lower()] for n in ordem_sim if n.lower() in destaque] + [p for p in pedras if p['nm'] not in ordem_sim]
amostras = ''.join(f'<button class="amostra" data-nome="{E(p["nm"])}" title="{E(p["nm"])}" aria-label="{E(p["nm"])}"><img src="{E(p["img"])}" alt="" loading="lazy"></button>' for p in sim)
opcoes = ''.join(f'<option>{E(p["nm"])}</option>' for p in pedras)
dados = json.dumps([{k: p[k] for k in ('nm', 'cat', 'g', 'fin', 'desc', 'img', 'faixa')} for p in pedras], ensure_ascii=False).replace('</', '<\\/')
COZINHA = """<svg id="cozinha" viewBox="0 0 800 470" role="img" aria-label="Ilustração de cozinha com a pedra escolhida na bancada">
<defs id="simTex">
 <pattern id="tx" patternUnits="userSpaceOnUse" width="300" height="225"><image href="" width="300" height="225" preserveAspectRatio="xMidYMid slice"/></pattern>
 <pattern id="txTopo" patternUnits="userSpaceOnUse" width="300" height="225" patternTransform="scale(1 .35)"><image href="" width="300" height="225" preserveAspectRatio="xMidYMid slice"/></pattern>
 <linearGradient id="parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe9df"/><stop offset="1" stop-color="#e2dacd"/></linearGradient>
 <linearGradient id="brilho" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd6e6"/><stop offset="1" stop-color="#e8f1f5"/></linearGradient>
 <linearGradient id="chao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9bfae"/><stop offset="1" stop-color="#b3a893"/></linearGradient>
</defs>
<rect width="800" height="470" fill="url(#parede)"/>
<rect y="404" width="800" height="66" fill="url(#chao)"/>
<rect x="488" y="54" width="170" height="120" rx="4" fill="url(#ceu)" stroke="#d8d0c2" stroke-width="8"/>
<line x1="573" y1="54" x2="573" y2="174" stroke="#d8d0c2" stroke-width="5"/>
<path d="M500 160 q30 -40 60 0 M590 160 q30 -50 58 0" fill="none" stroke="#9fbf8f" stroke-width="3" opacity=".6"/>
<g><rect class="mov" x="60" y="34" width="380" height="118" rx="4" fill="#ece7df"/>
 <rect class="mov2" x="68" y="42" width="88" height="102" rx="3" fill="#d6cfc3"/><rect class="mov2" x="162" y="42" width="88" height="102" rx="3" fill="#d6cfc3"/><rect class="mov2" x="256" y="42" width="88" height="102" rx="3" fill="#d6cfc3"/><rect class="mov2" x="350" y="42" width="82" height="102" rx="3" fill="#d6cfc3"/>
 <rect x="60" y="150" width="380" height="5" fill="#000" opacity=".08"/></g>
<rect id="frontao" x="56" y="198" width="690" height="58" fill="url(#tx)"/>
<polygon points="40,256 760,256 780,276 20,276" fill="url(#txTopo)"/>
<polygon points="40,256 760,256 780,276 20,276" fill="url(#brilho)"/>
<rect x="20" y="276" width="760" height="16" fill="url(#tx)"/><rect x="20" y="276" width="760" height="16" fill="#000" opacity=".22"/>
<g><rect class="mov" x="34" y="292" width="732" height="112" fill="#ece7df"/>
 <rect class="mov2" x="42" y="300" width="132" height="98" rx="3" fill="#d6cfc3"/><rect class="mov2" x="180" y="300" width="132" height="98" rx="3" fill="#d6cfc3"/><rect class="mov2" x="318" y="300" width="132" height="98" rx="3" fill="#d6cfc3"/><rect class="mov2" x="456" y="300" width="148" height="44" rx="3" fill="#d6cfc3"/><rect class="mov2" x="456" y="350" width="148" height="48" rx="3" fill="#d6cfc3"/><rect class="mov2" x="610" y="300" width="148" height="98" rx="3" fill="#d6cfc3"/>
 <g fill="#9a9184"><rect x="150" y="314" width="4" height="26" rx="2"/><rect x="200" y="314" width="4" height="26" rx="2"/><rect x="426" y="314" width="4" height="26" rx="2"/><rect x="510" y="318" width="40" height="4" rx="2"/><rect x="510" y="368" width="40" height="4" rx="2"/><rect x="630" y="314" width="4" height="26" rx="2"/></g>
 <rect x="34" y="404" width="732" height="6" fill="#000" opacity=".12"/></g>
<rect x="190" y="259" width="150" height="13" rx="5" fill="#8d9196"/><rect x="198" y="261" width="134" height="8" rx="4" fill="#5e6266"/>
<path d="M265 259 v-34 q0 -12 14 -12 h16 v8" fill="none" stroke="#a7abb0" stroke-width="6" stroke-linecap="round"/>
<rect x="520" y="258" width="150" height="10" rx="3" fill="#1b1b1c"/><g fill="none" stroke="#3a3a3c" stroke-width="2"><ellipse cx="560" cy="263" rx="16" ry="3"/><ellipse cx="630" cy="263" rx="16" ry="3"/></g>
<g><rect x="690" y="226" width="26" height="32" rx="4" fill="#c7b9a3"/><path d="M703 226 q-18 -30 -6 -46 M703 226 q4 -36 18 -44 M703 226 q-4 -24 -22 -30" fill="none" stroke="#6f8f5d" stroke-width="4" stroke-linecap="round"/></g>
<g><rect x="80" y="232" width="34" height="24" rx="4" fill="#efe9df" stroke="#cfc6b8"/><rect x="118" y="238" width="22" height="18" rx="3" fill="#d9cdb8"/></g>
</svg>"""
def borda(sem_ouro=True, frente=False, tras=False, b45=False):
    ouro = '#c9a45c'
    topo = '#5a554d'; frentec = ouro if frente else '#46423b'; lado = '#3a362f'
    h = 34 if b45 else 16
    s = ['<svg viewBox="22 38 216 108" aria-hidden="true">', '<rect width="240" height="150" fill="#120f0c"/>',
         '<polygon points="40,52 190,52 220,82 70,82" fill="%s"/>' % topo,
         '<polygon points="70,82 220,82 220,%d 70,%d" fill="%s"/>' % (82 + h, 82 + h, frentec),
         '<polygon points="40,52 70,82 70,%d 40,%d" fill="%s"/>' % (82 + h, 52 + h, lado)]
    if tras: s.append('<line x1="40" y1="52" x2="190" y2="52" stroke="%s" stroke-width="5" stroke-linecap="round"/>' % ouro)
    if b45:
        s.append('<line x1="70" y1="82" x2="54" y2="%d" stroke="#120f0c" stroke-width="2"/>' % (82 + h - 4))
        s.append('<path d="M40 52 L70 82 L70 %d" fill="none" stroke="%s" stroke-width="2" opacity=".6"/>' % (82 + h, ouro))
        s.append('<text x="120" y="138" fill="#8a8276" font-size="11" font-family="Manrope,sans-serif" text-anchor="middle">corte a 45° e borda dobrada</text>')
    elif frente or tras:
        s.append('<text x="120" y="138" fill="#8a8276" font-size="11" font-family="Manrope,sans-serif" text-anchor="middle">%s</text>' % ('frente e fundo polidos' if tras else 'frente polida'))
    else:
        s.append('<text x="120" y="138" fill="#8a8276" font-size="11" font-family="Manrope,sans-serif" text-anchor="middle">bordas retas, sem polimento</text>')
    s.append('</svg>')
    return ''.join(s)
TIPOS = [('Granito', 'granitos', 'O mais usado em cozinhas: muito duro, aguenta calor e o uso pesado, com ótimo custo-benefício.', [('Resistência a riscos', 90), ('Resistência a manchas', 75), ('Resistência ao calor', 95), ('Veios e sofisticação', 55)], 'Raramente'),
         ('Mármore', 'marmores', 'Clássico e elegante, com veios marcantes. Mais macio e sensível a ácidos: ideal para banheiros e lavabos.', [('Resistência a riscos', 40), ('Resistência a manchas', 35), ('Resistência ao calor', 60), ('Veios e sofisticação', 100)], 'Sim, de tempos em tempos'),
         ('Quartzito', 'quartzitos', 'Visual de mármore com dureza de pedra resistente. Sofisticado para o dia a dia.', [('Resistência a riscos', 90), ('Resistência a manchas', 65), ('Resistência ao calor', 90), ('Veios e sofisticação', 95)], 'Sim, de tempos em tempos'),
         ('Ultra compacto', 'ultra', 'Superfície de última geração com porosidade quase zero: não mancha e é muito fácil de limpar.', [('Resistência a riscos', 90), ('Resistência a manchas', 100), ('Resistência ao calor', 95), ('Veios e sofisticação', 80)], 'Não precisa')]
fx = {}
for p in pedras: fx.setdefault(p['g'], []).append(len(p['faixa']))
comparativo = ''.join(
    f'<div class="tipo"><h3>{n}</h3><p>{d}</p>' + ''.join(f'<div class="medida"><div><span>{a}</span></div><div class="barra"><i style="--v:{v}%"></i></div></div>' for a, v in med) +
    f'<div class="pe"><span>Impermeabilizar: <b>{sel}</b></span><span>Faixa de preço: <b>{"$" * round(sum(fx.get(g, [2])) / len(fx.get(g, [2])))}</b></span></div></div>'
    for n, g, d, med, sel in TIPOS)
t = open('_modelo.html', encoding='utf-8').read()
rep = {'{{WA}}': wa('Olá! Vim pelo site e quero um orçamento.'), '{{WA_COZ}}': wa('Olá! Vim pelo site e quero orçar uma cozinha/bancada.'),
       '{{WA_BAN}}': wa('Olá! Vim pelo site e quero orçar um banheiro.'), '{{WA_SOL}}': wa('Olá! Vim pelo site e quero orçar soleira/peitoril.'),
       '{{ICON_WA}}': ICON, '{{ICON_WA_SO}}': ICON.replace('fill="currentColor"', ''), '{{MOSAICO}}': mosaico, '{{FILTROS}}': filtros,
       '{{PEDRAS}}': cards, '{{N_PEDRAS}}': str(len(pedras)), '{{COZINHA}}': COZINHA, '{{AMOSTRAS}}': amostras, '{{COMPARATIVO}}': comparativo, '{{OPCOES_PEDRA}}': opcoes, '{{DADOS}}': dados, '{{B_SEM}}': borda(), '{{B_UM}}': borda(frente=True), '{{B_DOIS}}': borda(frente=True, tras=True), '{{B_45}}': borda(frente=True, b45=True)}
for k, v in rep.items(): t = t.replace(k, E(v) if k.startswith('{{WA') else v)
assert '{{' not in t
open('index.html', 'w', encoding='utf-8').write(t)
print('ok', len(pedras), 'pedras')
