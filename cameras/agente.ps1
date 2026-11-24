# HR Mármores e Granitos — agente das câmeras (roda escondido no PC da loja)
# go2rtc (vídeo ao vivo) + gravação contínua no PC (blocos de 10 min) + servidor das gravações (com chave)
# + túneis da Cloudflare (ver de fora) + movimento (alertas e fotos para o ponto). Não depende do app Yoosee.
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing
$D = Split-Path -Parent $MyInvocation.MyCommand.Path
$CFGF = "$D\config.json"
$C = Get-Content $CFGF -Raw | ConvertFrom-Json
$U = $C.url; $K = $C.k
$LOG = "$D\agente.log"
function Log($t) { $l = "$(Get-Date -Format 'dd/MM HH:mm:ss') $t"; Add-Content $LOG $l; if ((Get-Item $LOG).Length -gt 1MB) { Get-Content $LOG -Tail 400 | Set-Content $LOG } }
function Api($p, $obj) { try { return Invoke-RestMethod "$U$p`?k=$K" -Method Post -Body ($obj | ConvertTo-Json -Depth 5 -Compress) -ContentType 'application/json; charset=utf-8' -TimeoutSec 20 } catch { Log "api $p : $($_.Exception.Message)"; return $null } }
# só uma cópia rodando
$eu = $PID; Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.ProcessId -ne $eu -and $_.CommandLine -like '*HR-Cameras*agente.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-Process go2rtc, cloudflared, ffmpeg -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$D*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Log 'agente iniciando'
New-Item -ItemType Directory -Force "$D\tmp" | Out-Null

function TestaRtsp($ip) {
  $f = "$D\tmp\teste.jpg"; Remove-Item $f -ErrorAction SilentlyContinue
  $u = "rtsp://admin:$([uri]::EscapeDataString($C.senha))@$($ip):554/onvif1"
  $p = Start-Process "$D\ffmpeg.exe" -ArgumentList "-loglevel error -rtsp_transport tcp -i `"$u`" -frames:v 1 -y `"$f`"" -WindowStyle Hidden -PassThru
  if (!$p.WaitForExit(12000)) { $p.Kill() }
  return (Test-Path $f)
}
function Descobrir {
  $ips = @()
  try { # ONVIF WS-Discovery (as câmeras Yoosee respondem)
    $probe = '<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:' + [guid]::NewGuid() + '</w:MessageID><w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>'
    $udp = New-Object System.Net.Sockets.UdpClient; $udp.Client.ReceiveTimeout = 3000
    $b = [Text.Encoding]::UTF8.GetBytes($probe); [void]$udp.Send($b, $b.Length, (New-Object System.Net.IPEndPoint ([Net.IPAddress]::Parse('239.255.255.250')), 3702))
    $fim = (Get-Date).AddSeconds(4)
    while ((Get-Date) -lt $fim) { try { $ep = New-Object System.Net.IPEndPoint ([Net.IPAddress]::Any), 0; [void]$udp.Receive([ref]$ep); if ($ips -notcontains $ep.Address.ToString()) { $ips += $ep.Address.ToString() } } catch { break } }
    $udp.Close()
  } catch { Log "descoberta: $($_.Exception.Message)" }
  if (!$ips.Count) { # procura a porta 554 na rede local
    $meu = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168|10\.|172\.)' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
    if ($meu) { $base = $meu -replace '\.\d+$', '.'; $tasks = @{}
      1..254 | ForEach-Object { $c = New-Object Net.Sockets.TcpClient; $tasks["$base$_"] = @($c, $c.ConnectAsync("$base$_", 554)) }
      Start-Sleep -Milliseconds 1500
      foreach ($k in $tasks.Keys) { if ($tasks[$k][1].Status -eq 'RanToCompletion' -and $tasks[$k][0].Connected) { $ips += $k }; $tasks[$k][0].Close() } }
  }
  Log "possiveis cameras: $($ips -join ', ')"
  $cams = @(); $n = 0
  foreach ($ip in $ips) { if (TestaRtsp $ip) { $n++; $cams += [pscustomobject]@{ id = "cam$n"; nome = "Camera $n"; ip = $ip } } else { Log "sem video em $ip (senha errada ou nao e camera)" } }
  return $cams
}

$cams = @($C.cams)
if (!$cams.Count -or !$cams[0].ip) { $cams = @(Descobrir); $C.cams = $cams; $C | ConvertTo-Json -Depth 5 | Set-Content $CFGF -Encoding UTF8 }
if (!$cams.Count) { Log 'nenhuma camera encontrada'; Api '/cam/registrar' @{ url = ''; cams = @(); erro = 'nenhuma camera encontrada (confira a senha e se o PC esta na mesma rede)' } | Out-Null; exit 1 }

# go2rtc: só leitura pelo túnel (sem as rotas de configuração)
$y = @"
api:
  listen: "127.0.0.1:1984"
  origin: "*"
  allow_paths: ["/stream.html", "/video-stream.js", "/video-rtc.js", "/api/ws", "/api/webrtc", "/api/frame.jpeg", "/api/stream.mp4", "/api/stream.m3u8", "/api/hls/playlist.m3u8", "/api/hls/segment.ts", "/api/hls/init.mp4", "/api/hls/segment.m4s"]
rtsp:
  listen: "127.0.0.1:8554"
webrtc:
  listen: ":8555"
ffmpeg:
  bin: "$($D -replace '\\','/')/ffmpeg.exe"
streams:
"@
foreach ($c in $cams) { $y += "  $($c.id): rtsp://admin:$([uri]::EscapeDataString($C.senha))@$($c.ip):554/onvif1`n  $($c.id)_sub: rtsp://admin:$([uri]::EscapeDataString($C.senha))@$($c.ip):554/onvif2`n" }
Set-Content "$D\go2rtc.yaml" $y -Encoding UTF8

$P = @{}
function Liga($nome, $exe, $argl, $err) { $P[$nome] = Start-Process $exe -ArgumentList $argl -WindowStyle Hidden -PassThru -RedirectStandardError $err -RedirectStandardOutput "$err.out"; Log "ligou $nome" }
function LigaGo { Liga 'go2rtc' "$D\go2rtc.exe" "-config `"$D\go2rtc.yaml`"" "$D\tmp\go2rtc.log" }
$URLT = ''
function LigaTunel { Remove-Item "$D\tmp\tunel.log" -ErrorAction SilentlyContinue; Liga 'tunel' "$D\cloudflared.exe" 'tunnel --no-autoupdate --url http://127.0.0.1:1984' "$D\tmp\tunel.log"; $script:URLT = ''; $script:tunelEm = Get-Date }
function LigaFf($c) { $f = "$D\tmp\$($c.id).jpg"; Liga "ff_$($c.id)" "$D\ffmpeg.exe" "-loglevel error -rtsp_transport tcp -i rtsp://127.0.0.1:8554/$($c.id)_sub -vf fps=1,scale=640:-2 -q:v 6 -update 1 -y `"$f`"" "$D\tmp\ff_$($c.id).log" }
# gravações: blocos de 10 min por câmera, apagando as mais antigas quando o disco aperta
$DIAS = $(if ($C.dias) { [int]$C.dias } else { 30 }); $MINLIVRE = $(if ($C.minLivreGB) { [int]$C.minLivreGB } else { 20 })
$GT = -join ((48..57) + (97..122) | Get-Random -Count 28 | ForEach-Object { [char]$_ }); $PORTAG = 1985
New-Item -ItemType Directory -Force "$D\gravacoes" | Out-Null
$URLG = ''
function LigaServ { $P['serv'] = Start-Process 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$D\servidor.ps1`" -D `"$D`" -porta $PORTAG -tok $GT" -WindowStyle Hidden -PassThru; Log 'ligou servidor das gravacoes' }
function LigaTunel2 { Remove-Item "$D\tmp\tunel2.log" -ErrorAction SilentlyContinue; Liga 'tunel2' "$D\cloudflared.exe" "tunnel --no-autoupdate --url http://localhost:$PORTAG" "$D\tmp\tunel2.log"; $script:URLG = ''; $script:tunel2Em = Get-Date }
function LigaRec($c) { New-Item -ItemType Directory -Force "$D\gravacoes\$($c.id)" | Out-Null; $q = $(if ($C.qualidade -eq 'baixa') { "$($c.id)_sub" } else { $c.id })
  Liga "rec_$($c.id)" "$D\ffmpeg.exe" "-loglevel error -rtsp_transport tcp -i rtsp://127.0.0.1:8554/$q -map 0:v -map 0:a? -c:v copy -c:a aac -b:a 32k -f segment -segment_time 600 -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 -segment_format_options movflags=+frag_keyframe+empty_moov+default_base_moof `"$D\gravacoes\$($c.id)\%Y-%m-%d_%H-%M-%S.mp4`"" "$D\tmp\rec_$($c.id).log" }
function Limpa {
  $lim = (Get-Date).AddDays(-$DIAS); Get-ChildItem "$D\gravacoes" -Recurse -Filter *.mp4 -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $lim } | Remove-Item -Force -ErrorAction SilentlyContinue
  $todos = @(Get-ChildItem "$D\gravacoes" -Recurse -Filter *.mp4 -ErrorAction SilentlyContinue | Sort-Object LastWriteTime); $i = 0
  while ($i -lt $todos.Count - 12 -and (Get-PSDrive $D.Substring(0, 1)).Free -lt $MINLIVRE * 1GB) { Remove-Item $todos[$i].FullName -Force -ErrorAction SilentlyContinue; $i++ }
  if ($i) { Log "apaguei $i gravacoes antigas (disco cheio)" }
}
LigaGo; Start-Sleep 3; LigaTunel; LigaServ; LigaTunel2; foreach ($c in $cams) { LigaFf $c; LigaRec $c }; $ultLimpa = [datetime]::MinValue

function Mini($f) { # 32x18 em cinza
  try { $fs = [IO.File]::Open($f, 'Open', 'Read', 'ReadWrite'); $img = [Drawing.Image]::FromStream($fs); $bmp = New-Object Drawing.Bitmap 32, 18; $g = [Drawing.Graphics]::FromImage($bmp); $g.DrawImage($img, 0, 0, 32, 18); $g.Dispose(); $img.Dispose(); $fs.Close()
    $a = New-Object int[] 576; for ($yy = 0; $yy -lt 18; $yy++) { for ($xx = 0; $xx -lt 32; $xx++) { $px = $bmp.GetPixel($xx, $yy); $a[$yy * 32 + $xx] = [int](($px.R * 3 + $px.G * 6 + $px.B) / 10) } }
    $bmp.Dispose(); return ,$a } catch { if ($fs) { $fs.Close() }; return $null }
}
$ant = @{}; $quente = @{}; $ultEv = @{}; $ultVivo = [datetime]::MinValue; $limiar = 0.05
while ($true) {
  try {
    # processos caídos voltam
    if ($P['go2rtc'].HasExited) { Log 'go2rtc caiu'; LigaGo; Start-Sleep 2 }
    if ($P['tunel'].HasExited -or ((Get-Date) - $tunelEm).TotalHours -gt 24) { if (!$P['tunel'].HasExited) { $P['tunel'].Kill() }; LigaTunel }
    foreach ($c in $cams) { if ($P["ff_$($c.id)"].HasExited) { Start-Sleep 2; LigaFf $c } }
    foreach ($c in $cams) { if ($P["rec_$($c.id)"].HasExited) { Start-Sleep 2; LigaRec $c } }
    if ($P['serv'].HasExited) { LigaServ }
    if ($P['tunel2'].HasExited -or ((Get-Date) - $tunel2Em).TotalHours -gt 24) { if (!$P['tunel2'].HasExited) { $P['tunel2'].Kill() }; LigaTunel2 }
    if (((Get-Date) - $ultLimpa).TotalMinutes -ge 10) { $ultLimpa = Get-Date; Limpa }
    # túnel novo → avisa o bot
    $novo = $false
    if (!$URLT -and (Test-Path "$D\tmp\tunel.log")) { $m = Select-String -Path "$D\tmp\tunel.log" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $URLT = $m.Matches[0].Value; Log "tunel $URLT"; $novo = $true } }
    if (!$URLG -and (Test-Path "$D\tmp\tunel2.log")) { $m = Select-String -Path "$D\tmp\tunel2.log" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if ($m) { $URLG = $m.Matches[0].Value; Log "tunel gravacoes $URLG"; $novo = $true } }
    if ($novo -and $URLT) { Api '/cam/registrar' @{ url = $URLT; cams = $cams; grav = @{ url = $URLG; tok = $GT } } | Out-Null }
    if (((Get-Date) - $ultVivo).TotalMinutes -ge 5) { $ultVivo = Get-Date; Api '/cam/vivo' @{ n = $cams.Count } | Out-Null }
    # movimento
    foreach ($c in $cams) {
      $f = "$D\tmp\$($c.id).jpg"; if (!(Test-Path $f)) { continue }
      $a = Mini $f; if (!$a) { continue }
      $b = $ant[$c.id]; $ant[$c.id] = $a; if (!$b) { continue }
      $dif = 0; for ($i = 0; $i -lt 576; $i++) { if ([math]::Abs($a[$i] - $b[$i]) -gt 28) { $dif++ } }
      $sc = $dif / 576
      if ($sc -gt 0.6) { continue } # luz acendeu / câmera trocou para noturno
      if ($sc -gt $limiar) { $quente[$c.id] = 1 + [int]$quente[$c.id] } else { $quente[$c.id] = 0 }
      if ($quente[$c.id] -ge 2 -and (!$ultEv[$c.id] -or ((Get-Date) - $ultEv[$c.id]).TotalSeconds -ge 60)) {
        $ultEv[$c.id] = Get-Date
        try { $fs = [IO.File]::Open($f, 'Open', 'Read', 'ReadWrite'); $ms = New-Object IO.MemoryStream; $fs.CopyTo($ms); $fs.Close(); $j = [Convert]::ToBase64String($ms.ToArray())
          Api '/cam/evento' @{ cam = $c.id; score = [math]::Round($sc, 3); jpg = $j } | Out-Null } catch { Log "evento: $($_.Exception.Message)" }
      }
    }
  } catch { Log "laco: $($_.Exception.Message)" }
  Start-Sleep -Milliseconds 1000
}
