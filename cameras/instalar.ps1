# HR Mármores e Granitos — instalador das câmeras no PC da loja
# Uso (o bot manda a linha certa): irm "https://.../cam/instalar?k=CHAVE" | iex
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$U = '__URL__'; $K = '__K__'
$D = Join-Path $env:LOCALAPPDATA 'HR-Cameras'
New-Item -ItemType Directory -Force $D | Out-Null
Write-Host ''
Write-Host '=== HR Cameras: instalando ===' -ForegroundColor Yellow
Write-Host "Pasta: $D"
$senha = Read-Host 'Senha das cameras (a senha do aparelho no app Yoosee)'
$cfg = [ordered]@{ url = $U; k = $K; senha = $senha; cams = @() }
if (Test-Path "$D\config.json") { try { $old = Get-Content "$D\config.json" -Raw | ConvertFrom-Json; if ($old.cams) { $cfg.cams = $old.cams } } catch {} }
if ($senha -ne ($old.senha)) { $cfg.cams = @() }
$cfg | ConvertTo-Json -Depth 5 | Set-Content "$D\config.json" -Encoding UTF8
function Baixa($u, $f) { if (!(Test-Path $f)) { Write-Host "Baixando $(Split-Path $f -Leaf)..."; Invoke-WebRequest $u -OutFile $f -UseBasicParsing } }
Get-Process go2rtc, cloudflared, ffmpeg -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$D*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*HR-Cameras*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (!(Test-Path "$D\go2rtc.exe")) { Baixa 'https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_win64.zip' "$D\go2rtc.zip"; Expand-Archive "$D\go2rtc.zip" $D -Force; Remove-Item "$D\go2rtc.zip" }
Baixa 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' "$D\cloudflared.exe"
if (!(Test-Path "$D\ffmpeg.exe")) {
  Baixa 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' "$D\ffmpeg.zip"
  Write-Host 'Abrindo o ffmpeg...'; Expand-Archive "$D\ffmpeg.zip" "$D\ff" -Force
  Copy-Item (Get-ChildItem "$D\ff" -Recurse -Filter ffmpeg.exe | Select-Object -First 1).FullName "$D\ffmpeg.exe"
  Remove-Item "$D\ff" -Recurse -Force; Remove-Item "$D\ffmpeg.zip"
}
Invoke-WebRequest "$U/cam/agente.ps1?k=$K" -OutFile "$D\agente.ps1" -UseBasicParsing
Invoke-WebRequest "$U/cam/servidor.ps1?k=$K" -OutFile "$D\servidor.ps1" -UseBasicParsing
# liga sozinho quando o PC liga (pasta Inicializar do usuario, sem precisar de administrador)
$vbs = "CreateObject(""WScript.Shell"").Run ""powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """"$D\agente.ps1"""""", 0, False"
$ini = Join-Path ([Environment]::GetFolderPath('Startup')) 'HR-Cameras.vbs'
Set-Content $ini $vbs -Encoding ASCII
Start-Process 'wscript.exe' -ArgumentList "`"$ini`""
Write-Host ''
Write-Host 'Pronto! O agente das cameras esta rodando escondido.' -ForegroundColor Green
Write-Host 'Em 1 a 2 minutos as cameras aparecem no app (Cameras). As gravacoes ficam neste PC, em blocos de 10 minutos.'
Write-Host 'Pode fechar esta janela.'
Write-Host "Se algo der errado, o registro fica em $D\agente.log"
