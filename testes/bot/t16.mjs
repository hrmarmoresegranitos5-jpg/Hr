// v329: casos reais 23-24/11 (conversa do Fabrício)
import {T,KV,env,msg} from './sim.mjs';
const now=Date.now();
KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74999990011'}]}));
KV.set('equipe:numeros',JSON.stringify({fabrica:'5574999990011'}));
const P=(id,o)=>T.salvarPedido(env,{id,criado:now-86400000,status:'fechado',fichaEnviadaEm:now-3600e3,...o});
await P(102,{nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Preto São Gabriel',itens:[{ambiente:'Área gourmet',pecas:[{qtd:1,comp_cm:200,larg_cm:60}]},{ambiente:'Lavatório',pedra:'Branco Pinta Verde',pecas:[{qtd:2,comp_cm:80,larg_cm:45}]}]}});
await P(103,{nome:'Osmailton Souza',fabResp:'1',resumoApp:{pedra:'Verde Ubatuba',itens:[{ambiente:'Balcão',pecas:[{qtd:1,comp_cm:150,larg_cm:60}]}]}});
const F='5574999990011', foto=c=>({type:'image',image:{id:'i'+Math.random(),mime_type:'image/jpeg',caption:c}});
for (const [t,c] of [['F','Um balcão  do verde Ubatuba já cortado'],['T','Osmailton'],['F','a cozinha do preto são Gabriel já cortada'],['T','Cássio Borges'],['T','Já cortado']]) { console.log('\n### '+t+' '+c); console.log(await msg(F,t==='T'?c:'',t==='F'?foto(c):{})); }
const c=await T.lerPedido(env,102), o=await T.lerPedido(env,103); console.log('\nCássio log', JSON.stringify(c.prodLog), 'corteEm', !!c.corteEm, '| Osmailton log', JSON.stringify(o.prodLog), !!o.corteEm, !!o.fabProntoEm);
process.exit(0);
