$root = $PSScriptRoot
$port = 8765
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.png'  = 'image/png'
  '.mp4'  = 'video/mp4'
  '.woff2'= 'font/woff2'
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Output "listening on http://127.0.0.1:$port/"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000
    $buf = New-Object byte[] 8192
    $read = 0
    $header = ''
    while ($header -notmatch "`r`n`r`n" -and $read -lt 8192) {
      $n = $stream.Read($buf, $read, 8192 - $read)
      if ($n -le 0) { break }
      $read += $n
      $header = [Text.Encoding]::ASCII.GetString($buf, 0, $read)
    }
    $line = ($header -split "`r`n", 2)[0]
    $parts = $line -split ' '
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $pathOnly = ($rawPath -split '\?', 2)[0]
    $decoded = [Uri]::UnescapeDataString($pathOnly)
    if ($decoded -eq '/') { $decoded = '/index.html' }
    $rel = $decoded.TrimStart('/') -replace '/','\'
    $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $rootFull = [IO.Path]::GetFullPath($root)
    $ok = $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $file -PathType Leaf)
    if ($ok) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      $hb = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } else {
      $body = [Text.Encoding]::UTF8.GetBytes('Not found')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hb = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length)
      $stream.Write($body, 0, $body.Length)
    }
    $stream.Flush()
  } catch {
    Write-Output ("err " + $_.Exception.Message)
  } finally {
    $client.Close()
  }
}
