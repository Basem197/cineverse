# CineVerse Backup Script
$ErrorActionPreference = "Stop"
$ProjectRoot  = "C:\xampp\htdocs\cineverse"
$BackupRoot   = "$ProjectRoot\backups"
$Timestamp    = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupDir    = "$BackupRoot\$Timestamp"
$DBName       = "cineverse"
$DBUser       = "root"
$DBPass       = ""
$MySQLDump    = "C:\xampp\mysql\bin\mysqldump.exe"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  CineVerse Backup - $Timestamp" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Host "Created: $BackupDir" -ForegroundColor Green

Write-Host "`nBacking up database..." -ForegroundColor Yellow
$dumpFile = "$BackupDir\database.sql"
if ($DBPass -eq "") {
    & $MySQLDump -u $DBUser $DBName --routines --triggers > $dumpFile
} else {
    & $MySQLDump -u $DBUser -p$DBPass $DBName --routines --triggers > $dumpFile
}
if (Test-Path $dumpFile) {
    $size = "{0:N0}" -f (Get-Item $dumpFile).Length
    Write-Host "   database.sql ($size bytes)" -ForegroundColor Green
}

Write-Host "`nBacking up .env..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\api\.env") {
    Copy-Item "$ProjectRoot\api\.env" "$BackupDir\.env" -Force
    Write-Host "   .env" -ForegroundColor Green
}

Write-Host "`nBacking up storage/cache..." -ForegroundColor Yellow
$cacheSrc = "$ProjectRoot\api\storage\cache"
if (Test-Path $cacheSrc) {
    Copy-Item $cacheSrc "$BackupDir\cache" -Recurse -Force
    Write-Host "   cache/" -ForegroundColor Green
}

Write-Host "`nCompressing..." -ForegroundColor Yellow
$zipFile = "$BackupRoot\cineverse-$Timestamp.zip"
Compress-Archive -Path "$BackupDir\*" -DestinationPath $zipFile -Force
Remove-Item $BackupDir -Recurse -Force
Write-Host "   $zipFile" -ForegroundColor Green

$zipSize = "{0:N0}" -f (Get-Item $zipFile).Length
Write-Host "`nBackup complete: $(Split-Path $zipFile -Leaf) ($zipSize bytes)" -ForegroundColor Cyan
