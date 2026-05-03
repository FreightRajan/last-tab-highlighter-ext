# ===== CONFIG =====
$RepoPath    = "C:\Users\nijil\Downloads\last-tab-highlighter-ext-main"
$ExtensionId = "dljkjpphbcgbhlopijbepnolbiibikae"
# ==================

if (-not (Test-Path $RepoPath)) {
    Write-Host "Repo not found at $RepoPath" -ForegroundColor Red
    exit 1
}

Set-Location $RepoPath

if (-not (Test-Path ".git")) {
    Write-Host "This folder isn't a git repo. Re-clone it:" -ForegroundColor Yellow
    Write-Host "  Remove-Item -Recurse -Force `"$RepoPath`"" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/<USERNAME>/last-tab-highlighter-ext.git `"$RepoPath`"" -ForegroundColor Yellow
    exit 1
}

Write-Host "Pulling latest from GitHub..." -ForegroundColor Cyan
git pull --rebase
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Opening Chrome extension page..." -ForegroundColor Cyan
Start-Process "chrome.exe" "chrome://extensions/?id=$ExtensionId"

Write-Host ""
Write-Host "Pulled. Click the circular reload arrow on the extension card." -ForegroundColor Green
