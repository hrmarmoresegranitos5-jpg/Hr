# HR Mármores e Granitos — servidor das gravações (só no próprio PC; o túnel da Cloudflare leva até o app)
# Toda requisição precisa da chave ?t=... (o bot só entrega ao app da HR)
param([string]$D, [int]$porta, [string]$tok)
$G = Join-Path $D 'gravacoes'
$h = New-Object Net.HttpListener; $h.Prefixes.Add("http://localhost:$porta/"); $h.Start()
function Json($rs, $o) { $b = [Text.Encoding]::UTF8.GetBytes(($o | ConvertTo-Json -Depth 6 -Compress)); $rs.ContentType = 'application/json; charset=utf-8'; $rs.ContentLength64 = $b.Length; $rs.OutputStream.Write($b, 0, $b.Length) }
while ($h.IsListening) {
  $ctx = $h.GetContext(); $rq = $ctx.Request; $rs = $ctx.Response
  try {
    $rs.AddHeader('Access-Control-Allow-Origin', '*'); $rs.AddHeader('Access-Control-Allow-Headers', 'Range'); $rs.AddHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
    if ($rq.HttpMethod -eq 'OPTIONS') { $rs.StatusCode = 204; continue }
    if ($rq.QueryString['t'] -ne $tok) { $rs.StatusCode = 403; continue }
    $p = [uri]::UnescapeDataString($rq.Url.AbsolutePath)
    if ($p -eq '/lista') {
      $out = @{}
      Get-ChildItem $G -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $cam = $_.Name; $l = @()
        Get-ChildItem $_.FullName -Filter *.mp4 | Sort-Object Name | ForEach-Object { if ($_.Name -match '^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$') { $l += @{ f = $_.Name; d = $matches[1]; h = "$($matches[2]):$($matches[3])"; mb = [math]::Round($_.Length / 1MB, 1) } } }
        $out[$cam] = $l
      }
      $dr = Get-PSDrive ([IO.Path]::GetPathRoot($D).Substring(0, 1)) -ErrorAction SilentlyContinue
      Json $rs @{ cams = $out; livreGB = $(if ($dr) { [math]::Round($dr.Free / 1GB, 1) } else { $null }) }
    }
    elseif ($p -match '^/v/([\w-]+)/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.mp4)$') {
      $f = Join-Path (Join-Path $G $matches[1]) $matches[2]
      if (!(Test-Path $f)) { $rs.StatusCode = 404; continue }
      $fs = [IO.File]::Open($f, 'Open', 'Read', 'ReadWrite'); $tam = $fs.Length
      $ini = 0; $fim = $tam - 1
      $rg = $rq.Headers['Range']
      if ($rg -match 'bytes=(\d*)-(\d*)') { if ($matches[1]) { $ini = [int64]$matches[1] }; if ($matches[2]) { $fim = [int64]$matches[2] } }
      if ($fim - $ini + 1 -gt 4MB) { $fim = $ini + 4MB - 1 }   # pedaços curtos: o servidor atende um pedido por vez
      if ($fim -ge $tam) { $fim = $tam - 1 }
      $n = $fim - $ini + 1
      $rs.ContentType = 'video/mp4'; $rs.AddHeader('Accept-Ranges', 'bytes')
      if ($rg) { $rs.StatusCode = 206; $rs.AddHeader('Content-Range', "bytes $ini-$fim/$tam") }
      $rs.ContentLength64 = $n
      $fs.Seek($ini, 'Begin') | Out-Null; $buf = New-Object byte[] 65536; $falta = $n
      while ($falta -gt 0) { $r = $fs.Read($buf, 0, [math]::Min(65536, $falta)); if ($r -le 0) { break }; $rs.OutputStream.Write($buf, 0, $r); $falta -= $r }
      $fs.Close()
    }
    else { $rs.StatusCode = 404 }
  } catch { try { $rs.StatusCode = 500 } catch {} } finally { try { $rs.Close() } catch {} }
}
