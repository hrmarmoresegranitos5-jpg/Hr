// v334: foto inteligente — a IA olha a foto e escolhe serviço + etapa entre as opções do funcionário
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'},{id:'2',nome:'Gibson',tel:'74999990022'}]}));
KV.set('equipe:numeros',JSON.stringify({fabrica:'5574999990011',entrega:'5574999990022'}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(101,{nome:'Jacob da Mata',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Peitoril',pecas:[{qtd:2,comp_cm:120,larg_cm:15}]}]}});
await P(102,{nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Branco Pinta Verde',itens:[{ambiente:'Lavatório',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
await P(103,{nome:'Osmailton Souza',entResp:'2',corteEm:now-9e6,fabProntoEm:now-7e6,entregaEnviadaEm:now-6e6,resumoApp:{pedra:'Preto',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]}]}});
await P(104,{nome:'Poliana Reis',entResp:'2',corteEm:now-9e6,fabProntoEm:now-7e6,entregaEnviadaEm:now-6e6,instIniEm:now-3e6,instIniPor:'2',resumoApp:{pedra:'Branco Siena',itens:[{ambiente:'Cozinha',pecas:[{qtd:1,comp_cm:250,larg_cm:60}]}]}});
const foto=c=>({type:'image',image:{id:'i'+Math.random().toString(36).slice(2,6),mime_type:'image/jpeg',...(c?{caption:c}:{})}});
globalThis.__fotoAlvo='101'; console.log('### F "iniciando"'); console.log(await msg('5574999990011','',foto('iniciando')));
globalThis.__fotoAlvo='102'; globalThis.__fotoCerteza='media'; await KV.delete('prod:fotopend:99990011'); console.log('### F sem legenda (média)'); console.log(await msg('5574999990011','',foto('')));
globalThis.__fotoAlvo='104'; globalThis.__fotoCerteza='alta'; console.log('### G "finalizado"'); console.log(await msg('5574999990022','',foto('finalizado')));
globalThis.__fotoAlvo='101'; globalThis.__fotoCerteza='alta'; await KV.delete('prod:fotopend:99990011'); await KV.delete('prod:fotoult:99990011'); console.log('### F cortado (auto)'); console.log(await msg('5574999990011','',foto('cortado')));
console.log('### F desfaz'); console.log(await msg('5574999990011','não, é do Cássio'));
const j=await T.lerPedido(env,101), po=await T.lerPedido(env,104); console.log('Jacob pronto', !!j.fabProntoEm, '| Poliana entregue', !!po.entregueEm);
process.exit(0);
