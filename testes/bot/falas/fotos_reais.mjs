// Fotos REAIS da equipe (legendas de 19 a 24/11, do jeito que eles escrevem) → confere se a Helena acertou o cliente e a etapa
import fs from 'fs';
import {T,KV,env,msg} from '../sim.mjs';
const N={F:'5574900000001',G:'5574900000002',L:'5574900000003',H:'5574900000004',J:'5574900000005'};
const now=Date.now();
const it=(amb,pedra,qtd,c,l)=>({ambiente:amb,pedra,pecas:[{qtd,comp_cm:c,larg_cm:l}]});
const BASE={
 renata:{id:501,nome:'Renata Lima',entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6,resumoApp:{pedra:'Branco Dallas',itens:[it('Cozinha','Branco Dallas',1,220,60)]}},
 poliano:{id:502,nome:'Poliano dos Anjos',fabResp:'1',resumoApp:{pedra:'Branco Prime',itens:[it('Lavatório','Branco Prime',1,90,45)]}},
 douglas:{id:503,nome:'Douglas Souza',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Preto São Gabriel',itens:[it('Peitoril','Preto São Gabriel',2,120,15)]}},
 cassio:{id:504,nome:'Cássio Borges',fabResp:'1',resumoApp:{pedra:'Bege Bahia',itens:[it('Lavatório','Bege Bahia',4,80,45),it('Área gourmet','Preto São Gabriel',1,200,60)]}},
 jailton:{id:505,nome:'Jailton (papinha)',fabResp:'1',fab2Resp:'4',acabResp:'3',entResp:'2',corteEm:now-9e6,resumoApp:{pedra:'Preto Absoluto',itens:[it('Cozinha','Preto Absoluto',1,250,60),it('Frontão','Preto Absoluto',3,100,10),it('Balcão','Preto Absoluto',1,150,60)]}},
 joel:{id:506,nome:'Joel Santos',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Verde Ubatuba',itens:[it('Peitoril','Verde Ubatuba',3,150,15),it('Soleira','Verde Ubatuba',3,80,12)]}},
 esio:{id:507,nome:'Ésio Caveira',fabResp:'1',fab2Resp:'4',acabResp:'3',resumoApp:{pedra:'Cinza Andorinha',itens:[it('Lavatório','Cinza Andorinha',2,90,45),it('Divisória','Cinza Andorinha',2,40,80)]}},
 osmailton:{id:508,nome:'Osmailton Souza',fabResp:'1',resumoApp:{pedra:'Verde Ubatuba',itens:[it('Balcão','Verde Ubatuba',1,150,60)]}},
 jacob:{id:509,nome:'Jacob da Mata',fabResp:'1',acabResp:'3',resumoApp:{pedra:'Preto São Gabriel',itens:[it('Peitoril','Preto São Gabriel',2,120,15)]}},
};
// [quem, legenda, cliente esperado, etapa esperada (cti|corte|aci|acab|ini|fim|foto|pergunta), ajustes]
const CASOS=[
 ['G','Serviço da Renata inicia','renata','ini'],
 ['J','Serviços da dona Renata','renata','foto|pergunta',{renata:{entAjud:['5']}}],
 ['F','Lavatório do branco prime já cortado  poliano','poliano','corte'],
 ['F','Peitoril cortado','douglas','corte',{jacob:{corteEm:now-5e6,fabProntoEm:now-4e6}}],
 ['L','Vou começar agora!!','douglas','aci|pergunta',{douglas:{corteEm:now-5e6},jacob:{corteEm:now-5e6,fabProntoEm:now-4e6,acabEm:now-3e6}}],
 ['F','dano  inicio os lavatório de Casio no bebê bahia','cassio','cti'],
 ['F','Começando corta os lavatório de Casio no beje bahia','cassio','cti'],
 ['L','Peitoril de Douglas finalizado!!','douglas','acab',{douglas:{corteEm:now-5e6}}],
 ['F','O lavatório do beje bahia de Casio já tá cortado','cassio','corte'],
 ['L','Frontan da cozinha de Papinho finalizados !!','jailton','acab'],
 ['G','Serviço de Renata finalizando','renata','fim',{renata:{instIniEm:now-5e6,instIniPor:'2'}}],
 ['F','Os peitoril e as soleiras do verde Ubatuba já estão cortados','joel','corte'],
 ['F','2 lavatório do cinza andorinha já cortado','esio','corte'],
 ['F','mais um lavatório do beje bahia cortado','cassio','corte'],
 ['L','Peitoril do Joel finalizado','joel','acab',{joel:{corteEm:now-5e6}}],
 ['L','3 peitoris de Joel finalizado!!!','joel','acab',{joel:{corteEm:now-5e6}}],
 ['G','Início do serviço de poliana','poliano','ini',{poliano:{nome:'Poliana dos Anjos',entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6}}],
 ['G','Continuação do serviço de poliana','poliano','foto',{poliano:{nome:'Poliana dos Anjos',entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6,instIniEm:now-5e6,instIniPor:'2'}}],
 ['F','Um balcão  do verde Ubatuba já cortado','osmailton','corte'],
 ['G','Finalizando o serviço de poliano','poliano','fim',{poliano:{entResp:'2',corteEm:now-9e6,fabProntoEm:now-8e6,entregaEnviadaEm:now-7e6,instIniEm:now-5e6,instIniPor:'2'}}],
 ['G','Início do serviço de papinha','jailton','ini',{jailton:{fabProntoEm:now-8e6,acabEm:now-8e6,entregaEnviadaEm:now-7e6}}],
 ['H','2 lavatório finalizado ! \nCliente Esio caveira','esio','acab',{esio:{corteEm:now-5e6}}],
 ['F','a cozinha do preto são Gabriel já cortada','cassio','corte'],
 ['L','Divisórias do Ezio caveira finalizadas','esio','acab',{esio:{corteEm:now-5e6}}],
 ['F','dois peitoril de preto são Gabriel já cortado','jacob','corte',{douglas:{corteEm:now-5e6}}],
 ['G','Finalizando serviço de papinha','jailton','fim',{jailton:{fabProntoEm:now-8e6,acabEm:now-8e6,entregaEnviadaEm:now-7e6,instIniEm:now-5e6,instIniPor:'2'}}],
 ['L','Peitoril finalizadosn','jacob','acab|pergunta',{jacob:{corteEm:now-5e6},douglas:{corteEm:now-5e6,acabEm:now-4e6,fabProntoEm:now-4e6}}],
 ['F','Lavatório do branco pintar verde já cortado de cassio','cassio','corte',{cassio:{resumoApp:{pedra:'Branco Pinta Verde',itens:[it('Lavatório','Branco Pinta Verde',4,80,45),it('Área gourmet','Preto São Gabriel',1,200,60)]}}}],
 ['F','','osmailton','pergunta'],
];
const CAMPOS=['corteIniEm','corteEm','acabIniEm','acabEm','fabProntoEm','instIniEm','entregueEm'];
const etapaDe=(a,b)=>{ const o=[]; if(!a.corteIniEm&&b.corteIniEm)o.push('cti'); if((!a.corteEm&&b.corteEm)||((b.prodLog||[]).length>(a.prodLog||[]).length&&(b.prodLog||[]).slice(-1)[0].e==='corte'))o.push('corte'); if(!a.acabIniEm&&b.acabIniEm)o.push('aci'); if((!a.acabEm&&b.acabEm)||((b.prodLog||[]).slice((a.prodLog||[]).length).some(x=>['acabamento','fabricacao','polimento'].includes(x.e))))o.push('acab'); if(!a.fabProntoEm&&b.fabProntoEm&&!o.length)o.push('corte'); if(!a.instIniEm&&b.instIniEm)o.push('ini'); if(!a.entregueEm&&b.entregueEm)o.push('fim'); return [...new Set(o)]; };
const out=[]; let ok=0;
for (const [k,leg,cli,esp,aj] of CASOS){
  KV.clear(); globalThis.__fotoAlvo=null; globalThis.__fotoCerteza=null;
  KV.set('ponto:cfg',JSON.stringify({funcs:[{id:'1',nome:'Fabrício Morais',tel:'74900000001'},{id:'2',nome:'Gibson',tel:'74900000002'},{id:'3',nome:'Lucas',tel:'74900000003'},{id:'4',nome:'Hugo',tel:'74900000004'},{id:'5',nome:'Jefferson',tel:'74900000005'}]}));
  KV.set('equipe:numeros',JSON.stringify({fabrica:N.F,entrega:N.G}));
  for (const [nm,b] of Object.entries(BASE)) await T.salvarPedido(env,{criado:now-86400000,status:'fechado',fichaEnviadaEm:now-36e5,...JSON.parse(JSON.stringify(b)),...((aj||{})[nm]||{})});
  const antes={}; for (const [nm,b] of Object.entries(BASE)) antes[nm]=await T.lerPedido(env,b.id);
  const r=await msg(N[k],'',{type:'image',image:{id:'i'+Math.random().toString(36).slice(2,7),mime_type:'image/jpeg',...(leg?{caption:leg}:{})}});
  const mud=[]; for (const [nm,b] of Object.entries(BASE)){ const d=await T.lerPedido(env,b.id), e=etapaDe(antes[nm]||{},d||{}); if(e.length) mud.push(nm+':'+e.join('+')); }
  const pergunta=/É de qual serviço|de qual cliente|qual item|É isso\?|me diga o nome/i.test(r), fotoG=/[Ff]oto guardada/.test(r);
  const got=mud.length?mud.join(' '):pergunta?'pergunta':fotoG?'foto':'nada';
  const bom=esp.split('|').some(e=> e==='pergunta'?(pergunta&&!mud.length): e==='foto'?(fotoG&&!mud.length)||(mud.length===0&&/guard/i.test(r)) : mud.length===1&&mud[0].startsWith(cli+':')&&mud[0].split(':')[1].split('+').includes(e));
  if(bom) ok++;
  out.push(`${bom?'✅':'❌'} [${k}] "${leg.replace(/\n/g,' ')}" → esperado ${cli}:${esp} · obtido ${got}\n     ${r.replace(/\n/g,' ⏎ ').replace(/→ined: undefined ⏎ /,'').slice(0,330)}`);
}
out.unshift(`ACERTOS: ${ok}/${CASOS.length}`);
fs.writeFileSync(new URL('./fotos_reais.txt',import.meta.url).pathname,out.join('\n')); console.log(out[0]); process.exit(0);
