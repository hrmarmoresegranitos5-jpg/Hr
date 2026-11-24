# junta worker/totem-mod.js + worker/totem.html dentro do hr-bot.js (entre os marcadores TOTEM-INI/FIM)
import re, os
d = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(d, 'totem.html')).read().replace('/*<<EXPL>>*/', open(os.path.join(d, 'totem-expl.js')).read()); assert '`' not in s and '${' not in s
mod = open(os.path.join(d, 'totem-mod.js')).read()
f = os.path.join(d, 'hr-bot.js'); w = open(f).read()
A = '// <<TOTEM-INI>>'; B = '// <<TOTEM-FIM>>'
bloco = A + '\n' + mod + 'const TOTEM_HTML = String.raw`' + s + '`;\n' + B + '\n'
w = re.sub(re.escape(A) + '.*?' + re.escape(B) + '\n', lambda m: bloco, w, flags=re.S)
open(f, 'w').write(w)
