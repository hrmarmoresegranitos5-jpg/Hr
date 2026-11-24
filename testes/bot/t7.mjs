// totem do balcão: página, conversa com a Helena, pedido de orçamento, chamar atendente, link do dono
import {env,T,KV,sent,msg} from './sim.mjs';
import {W} from "./sim.mjs";
const ctx={waitUntil:p=>p&&p.catch&&p.catch(()=>{}),passThroughOnException(){}};
KV.set('pf:lista',JSON.stringify([{id:'a1',tipo:'pedra',nome:'Preto São Gabriel',tp:'Granito',preco:450},{id:'o1',tipo:'trabalho',legenda:'Cozinha em granito preto',cat:'cozinha',em:1}]));
const tok=await T.totemToken(env);
const req=(p,b,h)=>W.fetch(new Request('https://w.test'+p+(p.includes('?')?'&':'?')+'k='+tok,b?{method:'POST',headers:{'content-type':'application/json',...(h||{})},body:typeof b==='string'?b:JSON.stringify(b)}:{}),env,ctx);
let r=await W.fetch(new Request('https://w.test/totem?k=errado'),env,ctx); console.log('token errado:',r.status);
r=await req('/totem'); const h=await r.text(); console.log('página:',r.status,h.length,'bytes', h.includes('Toque para ser atendido'));
r=await req('/totem/conversa',{texto:'quanto é o granito preto?',hist:[{r:'h',t:'Oi!'}]}); console.log('conversa:',await r.text());
r=await req('/totem/galeria?cat=Cozinhas'); console.log('galeria:',(await r.text()).slice(0,200));
sent.length=0;
r=await req('/totem/pedido',{nome:'Maria Souza',tel:'74999112233',cidade:'Pilão Arcado',ambiente:'cozinha',pedra:{id:'pf:a1'},cubaOp:'Já tenho',medidas:'Bancada 220 x 60 cm',obs:'Pedido feito no totem da loja'}); console.log('pedido:',await r.text());
console.log(sent.map(s=>`→${String(s.to).slice(-4)} [${s.type}]: ${String(s.txt||'').slice(0,300)}`).join('\n'));
console.log('conversa cliente:', (KV.get('ca:5574999112233')||'').slice(0,300));
sent.length=0; r=await req('/totem/atendente',{}); console.log('atendente:',await r.text(), sent.map(s=>s.txt).join(' | '));
r=await req('/totem/ping',{tela:'descanso'}); console.log('ping:',await r.text());
console.log(await msg('74991484460','link do totem'));
