$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 8788
$siteUrl = "http://127.0.0.1:$port"
$configUrl = "$siteUrl/api/chat-config"

Set-Location $projectRoot

if (-not (Test-Path ".dev.vars")) {
  if (Test-Path ".dev.vars.example") {
    Copy-Item ".dev.vars.example" ".dev.vars"
  }
}

if (-not (Test-Path "node_modules")) {
  Write-Host "首次运行，先安装依赖..." -ForegroundColor Cyan
  npm install
}

try {
  Invoke-WebRequest -Uri $configUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
  Start-Process $siteUrl
  Write-Host "检测到本地服务已经在运行，已直接打开网站。" -ForegroundColor Green
  exit 0
} catch {
}

$command = "Set-Location '$projectRoot'; npm run dev -- --port $port"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $command -WorkingDirectory $projectRoot | Out-Null

Write-Host "正在启动本地服务..." -ForegroundColor Cyan

for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
  Start-Sleep -Seconds 1

  try {
    Invoke-WebRequest -Uri $configUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
    Start-Process $siteUrl
    Write-Host "网站已打开：$siteUrl" -ForegroundColor Green
    exit 0
  } catch {
  }
}

Start-Process $siteUrl
Write-Host "服务还在继续启动中，已先尝试打开浏览器：$siteUrl" -ForegroundColor Yellow
