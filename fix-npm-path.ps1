# Finds where node.exe lives and adds that folder to your user PATH
# Right-click this file → "Run with PowerShell"

$nodePath = (Get-Command node -ErrorAction Stop).Source | Split-Path

$userPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)

if ($userPath -like "*$nodePath*") {
    Write-Host "✓ $nodePath is already in your PATH." -ForegroundColor Green
} else {
    [Environment]::SetEnvironmentVariable("Path", $userPath + ";$nodePath", [System.EnvironmentVariableTarget]::User)
    Write-Host "✓ Added $nodePath to your user PATH." -ForegroundColor Green
}

Write-Host ""
Write-Host "Close this window, open a fresh terminal, then run:" -ForegroundColor Yellow
Write-Host "  npm --version" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
