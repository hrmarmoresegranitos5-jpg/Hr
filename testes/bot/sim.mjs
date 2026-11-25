import fs from 'fs'; import vm from 'vm';
let src=fs.readFileSync(new URL('../../worker/hr-bot.js', import.meta.url),'utf8').replace(/^export default/m,'globalThis.__W=');
src+=`\n;globalThis.__T={premioMes,corridaTexto,premioCfg,fix353Fabricio,prodLixoChecar,agoraBahia,clienteCitado,vozCorrigirNomes,fonetico,producaoStatusTool,fichaTecnicaTool,appPecasDoAmb,fichaCortePdf,appBuscarTool,appDetalheTool,appResumoPrompt,metasPontos,aprovListar,corrigirPagamentoCliente,correcoesPendentes,pedConflitoTxt,pedPorItemPedra,nomeClienteValido,acharPorNome,fixCassioV323,etapaPedirConfirmacao,pdfSaldoCliente,interpretarLancamento,producaoStatusTool,prodDuplicadosDono,lerPedido,chamarIA,tratarMensagem,salvarPedido,pedidosProducao,ptsEtapa,metaPainel,totemToken,auditoriaTexto,despacharPedidoDireto,horasDetalhe,explicarPontos,retroBonificacao};`;
const KV=new Map(); const KVM=new Map(); const sent=[]; const ai=[];
const kv={async get(k){return KV.has(k)?KV.get(k):null}, async getWithMetadata(k){return {value:KV.has(k)?KV.get(k):null,metadata:KVM.get(k)||null}}, async put(k,v,o){KV.set(k,(v instanceof ArrayBuffer||ArrayBuffer.isView(v))?v:String(v)); if(o&&o.metadata)KVM.set(k,o.metadata)}, async delete(k){KV.delete(k)}, async list({prefix='',limit=1000}={}){return {keys:[...KV.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(name=>({name})),list_complete:true}}};
const stmt={bind(){return stmt},async run(){return {meta:{changes:1}}},async all(){return {results:[]}},async first(){return null}};
const db={prepare(){return stmt},batch:async()=>[]};
function aiResp(sys,user){
  if(/Você interpreta mensagens de funcionários/.test(sys)) return JSON.stringify(globalThis.__interpResp||{tipo:'outro'});
  if(/Você corrige transcrições/.test(sys)&&globalThis.__vozResp) return JSON.stringify(globalThis.__vozResp);
  if(/Você identifica fotos de serviço/.test(sys)){ // simula a IA de visão usando o que a legenda e os serviços dizem (a foto em si não existe no teste)
    const nz=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); const leg=nz((user.match(/Legenda: "([^"]*)"/)||[])[1]||'');
    const blocos=user.split('\n- ').slice(1).map(b=>({b:nz(b),ids:[...b.matchAll(/"(fot\|[^"]+)"/g)].map(x=>x[1])}));
    const pal=leg.split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!/^(cortad|cortado|cortada|finaliz|inici|comec|pronto|servico|terminei|terminado|agora|ja|esta|estao|foto)/.test(w));
    const sc=blocos.map(x=>({...x,n:pal.filter(w=>x.b.includes(w.slice(0,5))).length})); const mx=Math.max(0,...sc.map(x=>x.n)), top=sc.filter(x=>x.n===mx);
    const want=/inici|comec|vou comec/.test(leg)?/\|(ini|cti|aci)$/:/finaliz|pront|cortad|termin|instal/.test(leg)?/\|(fim|pronto|acf)$/:/continua|andamento/.test(leg)?/\|foto$/:/\|(ini|cti|aci|pronto|acf|fim)$/;
    const alvo=globalThis.__fotoAlvo?sc.find(x=>x.ids.some(i=>i.includes('|'+globalThis.__fotoAlvo+'|'))):(top.length===1?top[0]:null);
    const ids=alvo?alvo.ids:sc.flatMap(x=>x.ids); const pick=ids.find(i=>want.test(i))||ids[0];
    return JSON.stringify({opcao:pick,certeza:globalThis.__fotoCerteza||(alvo&&(mx>0||sc.length===1)?'alta':'baixa'),vejo:'peças de pedra'}); }
  if(/Descubra de qual serviço ele fala/.test(sys)){ const m=['Jacó','Cássio','Osmailton'].find(n=>user.toLowerCase().includes(n.toLowerCase().slice(0,4))); return JSON.stringify({cliente:m||'',item:/peitor/i.test(user)?'peitoril':'',etapa:'corte',feito:/cortad|cortei/i.test(user)&&!/quero saber/i.test(user)}); }
  if(/secretária de RH/.test(sys)) return JSON.stringify({resposta:'[IA-RH] resposta com dados: '+(sys.match(/PONTOS DELE:[^\n]*/)||['sem pontos'])[0],escalar:false,assunto:'outro',acao:''});
  if(/pelo totem \(tablet\)/.test(sys)) return JSON.stringify({fala:'O m² do Preto São Gabriel tá R$ 450,00, mas o valor final depende das medidas.',abrir:'pedras:pretas'});
  if(/Reescreva|transforma uma resposta ESCRITA/.test(sys)) return JSON.stringify({fala:user,direcao:'',emocao:''});
  return '{}';
}
const fetchStub=async(url,opt={})=>{ url=String(url);
  if(url.includes('graph.facebook.com')&&/\/media$/.test(url.split('?')[0])&&opt.method==='POST'){ try{ const f=opt.body&&opt.body.get&&opt.body.get('file'); if(f) globalThis.__ultMidia=Buffer.from(await f.arrayBuffer()); }catch(e){} return new Response(JSON.stringify({id:'midia1'}),{status:200}); }
  if(url.includes('graph.facebook.com')&&url.includes('/messages')){ const b=JSON.parse(opt.body||'{}'); sent.push({to:b.to,type:b.type,txt:b.text?b.text.body:(b.interactive?b.interactive.body.text+' ['+((b.interactive.action.buttons||[]).map(x=>x.reply.title).join('|')||'lista')+']':(b.template?'[TEMPLATE '+b.template.name+']':b.type))}); return new Response(JSON.stringify({messages:[{id:'wamid.'+sent.length}]}),{status:200}); }
  if(url.includes('api.anthropic.com')){ const b=JSON.parse(opt.body); const sys=Array.isArray(b.system)?b.system.map(x=>x.text).join('\n'):String(b.system||''); const u=b.messages[b.messages.length-1]; const ut=typeof u.content==='string'?u.content:u.content.map(x=>x.text||'').join(''); ai.push(sys.slice(0,60)); return new Response(JSON.stringify({content:[{type:'text',text:aiResp(sys,ut)}],usage:{input_tokens:1,output_tokens:1}}),{status:200}); }
  if(url.includes('graph.facebook.com')&&/\/m\w+$/.test(url.split('?')[0])&&!url.includes('/messages')) return new Response(JSON.stringify({url:'https://lookaside.fbsbx.com/x',mime_type:'image/jpeg'}),{status:200});
  if(url.includes('lookaside')) return new Response(new Uint8Array([255,216,255,224,0,16]),{status:200,headers:{'content-type':'image/jpeg'}});
  return new Response('{}',{status:200}); };
const c={caches:{default:{match:async()=>null,put:async()=>{}}},console:process.env.LOG?console:{log:()=>{},error:()=>{}},URL,Response,Request,Headers,fetch:fetchStub,crypto,TextEncoder,TextDecoder,setTimeout:(f,ms)=>{const t=setTimeout(f,ms>=6000?ms:Math.min(ms||0,5)); if(ms>=6000&&t.unref)t.unref(); return t;},clearTimeout,setInterval:()=>0,clearInterval:()=>{},atob,btoa,FormData,Blob,AbortController,AbortSignal,structuredClone,queueMicrotask};c.globalThis=c;vm.createContext(c);vm.runInContext(src,c);
const T=c.__T;
export const env={HR_KV:kv,HR_DB:db,AI_PROVIDER:'anthropic',AI_KEY:'x',WHATSAPP_TOKEN:'t',PHONE_NUMBER_ID:'p',DONO_NUMERO:'74991484460',ATENDER_CLIENTES:'1',ESPERA_CLIENTE:'0',RITMO_HUMANO:'0',PARTIR_MSG:'0',VOZ_FUNC:'0'};
export {T,KV,sent,ai}; export const W=c.__W; export const ultMidia=()=>globalThis.__ultMidia;
export async function msg(from,body,extra={}){ sent.length=0; const m={from,id:'m'+Math.random(),timestamp:String(Date.now()/1000|0),type:'text',text:{body},...extra}; try{await T.tratarMensagem(env,m);}catch(e){sent.push({to:'ERRO',txt:e.stack.split('\n').slice(0,3).join(' | ')});} return sent.map(s=>`→${String(s.to).slice(-4)}: ${s.txt}`).join('\n'); }
