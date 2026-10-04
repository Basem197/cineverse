# ============================================================
# CineVerse — Local Backup Script
# ============================================================
# Run before deployment or before major changes.
# ============================================================

$ErrorActionPreference = "Stop"

# Config
$ProjectRoot  = "C:\xampp\htdocs\cineverse"
$BackupRoot   = "$ProjectRoot\backups"
$Timestamp    = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupDir    = "$BackupRoot\$Timestamp"

$DBName       = "cineverse"
$DBUser       = "root"
$DBPass       = ""  # XAMPP default: empty
$MySQLDump    = "C:\xampp\mysql\bin\mysqldump.exe"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  CineVerse Backup - $Timestamp" -ForegroundColor Cyan
Write-Host "=======================================`n" -ForegroundColor Cyan

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Write-Host "Created: $BackupDir" -ForegroundColor Green

# 1. Database
Write-Host "`nBacking up database '$DBName'..." -ForegroundColor Yellow
$dumpFile = "$BackupDir\database.sql"

if ($DBPass -eq "") {
    & $MySQLDump -u $DBUser $DBName --routines --triggers > $dumpFile
} else {
    & $MySQLDump -u $DBUser -p$DBPass $DBName --routines --triggers > $dumpFile
}

if (Test-Path $dumpFile) {
    $size = "{0:N0}" -f (Get-Item $dumpFile).Length
    Write-Host "   database.sql ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "   Failed to dump database" -ForegroundColor Red
}

# 2. .env
Write-Host "`nBacking up .env..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\api\.env") {
    Copy-Item "$ProjectRoot\api\.env" "$BackupDir\.env" -Force
    Write-Host "   .env" -ForegroundColor Green
}

# 3. Storage cache
Write-Host "`nBacking up storage/cache..." -ForegroundColor Yellow
$cacheSrc = "$ProjectRoot\api\storage\cache"
if (Test-Path $cacheSrc) {
    $cacheDst = "$BackupDir\cache"
    Copy-Item $cacheSrc $cacheDst -Recurse -Force
    Write-Host "   cache/" -ForegroundColor Green
}

# 4. Compress
Write-Host "`nCompressing..." -ForegroundColor Yellow
$zipFile = "$BackupRoot\cineverse-$Timestamp.zip"
Compress-Archive -Path "$BackupDir\*" -DestinationPath $zipFile -Force
Remove-Item $BackupDir -Recurse -Force
Write-Host "   $zipFile" -ForegroundColor Green

$zipSize = "{0:N0}" -f (Get-Item $zipFile).Length
Write-Host "`nBackup complete: $(Split-Path $zipFile -Leaf) ($zipSize bytes)" -ForegroundColor Cyan
Write-Host "   Location: $BackupRoot" -ForegroundColor Gray