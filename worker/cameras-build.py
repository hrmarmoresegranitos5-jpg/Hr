# junta cameras/instalar.ps1 e cameras/agente.ps1 dentro do hr-bot.js (entre os marcadores CAM-INI/FIM)
import json, os, re
d = os.path.dirname(os.path.abspath(__file__)); raiz = os.path.dirname(d)
ins = open(os.path.join(raiz, 'cameras', 'instalar.ps1'), encoding='utf-8').read()
ag = open(os.path.join(raiz, 'cameras', 'agente.ps1'), encoding='utf-8').read()
f = os.path.join(d, 'hr-bot.js'); w = open(f, encoding='utf-8').read()
A = '// <<CAM-INI>>'; B = '// <<CAM-FIM>>'
bloco = A + '\nconst CAM_INSTALAR = ' + json.dumps(ins, ensure_ascii=False) + ';\nconst CAM_AGENTE = ' + json.dumps(ag, ensure_ascii=False) + ';\n' + B + '\n'
if A in w: w = re.sub(re.escape(A) + '.*?' + re.escape(B) + '\n', lambda m: bloco, w, flags=re.S)
else: w = w.replace('async function camTok(env, novo)', bloco + 'async function camTok(env, novo)', 1)
open(f, 'w', encoding='utf-8').write(w)
