// motor de vídeo: shader SDF (pedra, cuba, torneira, gotas) + legendas em HTML; window.frame(t) desenha o quadro t
window.VID = { W: 1280, H: 720 };
function mk(src) { return src; }
var FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 R; uniform vec3 camP, camT; uniform float uExp, uHi, uWater, uT;
uniform vec4 uDrop[6];
const vec3 L = normalize(vec3(-0.5, 0.9, 0.55));
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p,b-r)-r; }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
vec2 U(vec2 a, vec2 b){ return a.x<b.x?a:b; }
vec3 BAN(){ return vec3(0., 88.5 + uExp*30., 0.); }
vec3 CUB(){ return vec3(0., 75. - uExp*14., -2.); }
float TAM(){ return uExp*10.; }
vec2 map(vec3 p){
  vec2 r = vec2(p.y, 3.);
  r = U(r, vec2(p.z+31., 2.));
  float cab = sdBox(p-vec3(0,43,1), vec3(78,42.5,27));
  cab = max(cab, -sdBox(p-vec3(0,50,1), vec3(76,40,25)));
  cab = max(cab, -sdBox(vec3(p.x, p.y-3., p.z-28.), vec3(80., 3., 1.5)));
  cab = max(cab, -sdBox(vec3(p.x, p.y-82.5, p.z-28.), vec3(80., 0.25, 1.5)));
  if (uExp > 0.001) cab = max(cab, -sdBox(p-vec3(0,50,28.), vec3(82,46,34.*uExp)));
  r = U(r, vec2(cab, 7.));
  vec3 q = p - BAN();
  float ban = sdBox(q, vec3(80,1.5,30));
  ban = max(ban, -sdRBox(q - vec3(0,0,-1), vec3(28, 4., 19), 1.5));
  r = U(r, vec2(ban, 1.));
  vec3 t = p - vec3(0, 86. + TAM(), -1);
  float tam = sdBox(t, vec3(32,1,23));
  tam = max(tam, -sdRBox(p - vec3(0,86. + TAM(),-2), vec3(20, 3., 14), 3.));
  r = U(r, vec2(tam, 8.));
  vec3 c = p - CUB();
  float cub = max(sdRBox(c, vec3(21,10,15), 3.), -sdRBox(c - vec3(0,1.2,0), vec3(20.2,10.,14.2), 2.4));
  r = U(r, vec2(cub, 4.));
  r = U(r, vec2(length(c - vec3(0,-8.9,0)) - 2.2, 9.));
  vec3 b = BAN() + vec3(0, 1.5, -25.5);
  float fa = sdCap(p, b, b + vec3(0,22,0), 1.4);
  fa = min(fa, sdCap(p, b + vec3(0,22,0), b + vec3(0,25.5,5), 1.4));
  fa = min(fa, sdCap(p, b + vec3(0,25.5,5), b + vec3(0,24,13), 1.4));
  fa = min(fa, sdCap(p, b + vec3(0,24,13), b + vec3(0,19.5,15), 1.3));
  fa = min(fa, sdCap(p, b + vec3(0,0.5,0), b + vec3(0,2.5,0), 3.));
  fa = min(fa, sdCap(p, b + vec3(4.5,12,0), b + vec3(8,15,0), 0.9));
  r = U(r, vec2(fa, 5.));
  for (int i=0;i<6;i++){ if (uDrop[i].w > 0.) r = U(r, vec2(length((p-uDrop[i].xyz)*vec3(1.,1.15,1.)) - uDrop[i].w, 6.)); }
  if (uWater > 0.01) r = U(r, vec2(sdBox(p - vec3(0, 87.05, -1), vec3(27.5*uWater, 0.12, 18.5*uWater)) , 6.));
  return r;
}
vec3 nor(vec3 p){ vec2 e=vec2(0.02,0); return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x)); }
float sombra(vec3 ro, vec3 rd){ float res=1., t=0.3; for(int i=0;i<40;i++){ float h=map(ro+rd*t).x; res=min(res, 10.*h/t); t+=clamp(h,0.4,12.); if(res<0.02||t>260.) break; } return clamp(res,0.,1.); }
float ao(vec3 p, vec3 n){ float s=0., w=1.; for(int i=1;i<=5;i++){ float h=0.6*float(i); s+=(h-map(p+n*h).x)*w; w*=0.6; } return clamp(1.-0.35*s,0.,1.); }
vec3 ceu(vec3 d){ vec3 c = mix(vec3(.33,.32,.31), vec3(.95,.94,.92), clamp(d.y*.6+.45,0.,1.)); c += vec3(1.,.95,.85)*pow(max(dot(d,L),0.),40.)*3.; c += vec3(1.)*smoothstep(.96,.99,abs(d.x))*0.5; return c; }
vec3 granito(vec3 p){
  vec3 base = vec3(.80,.76,.70);
  float n = noise(p*0.9), m = noise(p*2.3+11.), k = noise(p*4.7+3.);
  float g = noise(p*1.6+5.);
  vec3 c = base*(0.93+0.1*n);
  c = mix(c, vec3(.60,.57,.53), smoothstep(.52,.66,m)*0.7);
  c = mix(c, vec3(.30,.28,.26), smoothstep(.70,.78,g)*0.75);
  c = mix(c, vec3(.08,.07,.06), smoothstep(.80,.86,k)*0.85);
  c = mix(c, vec3(.62,.45,.36), smoothstep(.78,.84,noise(p*2.1+21.))*0.5);
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - R*.5)/R.y;
  vec3 f = normalize(camT-camP), ri = normalize(cross(f, vec3(0,1,0))), up = cross(ri, f);
  vec3 rd = normalize(uv.x*ri + uv.y*up + 1.8*f), ro = camP;
  float t = 0.; vec2 h = vec2(0.,-1.);
  for (int i=0;i<160;i++){ h = map(ro+rd*t); if (h.x < 0.004*t) break; t += h.x*0.9; if (t>700.) { h.y=-1.; break; } }
  vec3 col;
  if (h.y < 0.) col = ceu(rd)*.6;
  else {
    vec3 p = ro+rd*t, n = nor(p), refl = reflect(rd, n);
    float m = h.y, sp = 0.2, sh = 32., kr = 0.04;
    vec3 alb;
    if (m == 1. || m == 8.) { alb = granito(p); sp = 0.9; sh = 90.; kr = 0.08;
      if (m == 1.) { vec3 q = p - BAN(); float dh = abs(sdRBox(q - vec3(0,0,-1), vec3(28, 4., 19), 1.5)); alb = mix(alb, vec3(1.,.78,.25), uHi*smoothstep(1.2,0.,dh)*0.9); }
      if (m == 8.) { alb *= 0.97; }
    }
    else if (m == 2.) { alb = vec3(.87,.86,.83); sp=.05; }
    else if (m == 3.) { alb = vec3(.62,.60,.57); float g = max(smoothstep(.2,0.,abs(fract(p.x/60.)-.5)*60.-29.6), smoothstep(.2,0.,abs(fract(p.z/60.)-.5)*60.-29.6)); alb *= 1.-0.4*g; sp=.4; sh=40.; kr=.05; }
    else if (m == 4.) { alb = vec3(.62,.64,.66)*(0.9+0.1*noise(vec3(p.x*8.,0.,p.z*.2))); sp=1.; sh=50.; kr=.55; }
    else if (m == 5.) { alb = vec3(.75); sp=2.; sh=200.; kr=.85; }
    else if (m == 6.) { alb = vec3(.35,.55,.75); sp=2.; sh=180.; kr=.6; }
    else if (m == 7.) { float w = noise(vec3(p.x*.15, p.y*3., p.z*.15)); alb = mix(vec3(.38,.25,.16), vec3(.5,.35,.22), w); sp=.15; sh=20.; }
    else { alb = vec3(.05); }
    float dif = max(dot(n,L),0.), s = sombra(p+n*0.05, L), a = ao(p,n);
    float fr = kr + (1.-kr)*pow(1.-max(dot(n,-rd),0.),5.)*(m==2.||m==7.?0.15:1.);
    vec3 amb = mix(vec3(.30,.29,.28), vec3(.55,.55,.56), n.y*.5+.5);
    col = alb*(amb*a + vec3(1.,.96,.9)*dif*s*1.25);
    col += vec3(1.,.97,.9)*pow(max(dot(refl,L),0.),sh)*sp*s;
    col = mix(col, ceu(refl)*(m==4.||m==5.?alb*1.4:vec3(1.)), fr*(m==4.||m==5.?1.:.6));
    col = mix(col, vec3(.6,.6,.62), 1.-exp(-0.0000025*t*t));
  }
  col = col*(2.51*col+.03)/(col*(2.43*col+.59)+.14);
  col = pow(clamp(col,0.,1.), vec3(1./2.2));
  vec2 q = gl_FragCoord.xy/R; col *= 0.75 + 0.25*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y), 0.2);
  o = vec4(col,1);
}`;
var VS = '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}';
var cv = document.getElementById('c'), gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
cv.width = VID.W; cv.height = VID.H;
function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) { document.title = 'ERRO ' + gl.getShaderInfoLog(x); throw new Error(gl.getShaderInfoLog(x)); } return x; }
var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
var al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
function U(n) { return gl.getUniformLocation(pr, n); }
var cam = { P: [0, 0, 0], T: [0, 0, 0] };
function desenha(par) {
  gl.viewport(0, 0, VID.W, VID.H);
  gl.uniform2f(U('R'), VID.W, VID.H); gl.uniform3fv(U('camP'), par.camP); gl.uniform3fv(U('camT'), par.camT);
  gl.uniform1f(U('uExp'), par.exp || 0); gl.uniform1f(U('uHi'), par.hi || 0); gl.uniform1f(U('uWater'), par.water || 0); gl.uniform1f(U('uT'), par.t || 0);
  var d = new Float32Array(24); (par.drops || []).slice(0, 6).forEach(function (x, i) { d.set(x, i * 4); }); gl.uniform4fv(U('uDrop'), d);
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish(); cam.P = par.camP; cam.T = par.camT;
}
// ponto 3D → pixel na tela (para as etiquetas)
function proj(X) {
  var P = cam.P, T = cam.T, sub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }, dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }, nrm = function (a) { var l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }, cr = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
  var f = nrm(sub(T, P)), r = nrm(cr(f, [0, 1, 0])), u = cr(r, f), d = sub(X, P), z = dot(d, f);
  return [dot(d, r) / z * 1.8 * VID.H + VID.W / 2, VID.H / 2 - dot(d, u) / z * 1.8 * VID.H];
}
function mix(a, b, k) { return Array.isArray(a) ? a.map(function (x, i) { return x + (b[i] - x) * k; }) : a + (b - a) * k; }
function suave(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function entre(t, a, b) { return suave((t - a) / (b - a)); }
