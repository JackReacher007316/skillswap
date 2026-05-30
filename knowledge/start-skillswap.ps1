$ErrorActionPreference = "Stop"

function Get-FreePort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), 0)
  $listener.Start()
  $port = $listener.LocalEndpoint.Port
  $listener.Stop()
  return $port
}

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = Get-FreePort
$url = "http://127.0.0.1:$port"

Write-Host "Starting SkillSwap..."
Write-Host "A server window will open. Keep it open while using the app."

$serverCommand = "cd /d `"$projectPath`" && set PORT=$port&& node server.js"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $serverCommand

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing -TimeoutSec 2
    if ($response.Content -like "*SkillSwap API*") {
      $ready = $true
      break
    }
  } catch {
    continue
  }
}

if (-not $ready) {
  Write-Host ""
  Write-Host "SkillSwap did not start. Make sure Node.js is installed, then try again."
  exit 1
}

Write-Host "SkillSwap is ready: $url"
Start-Process $url
