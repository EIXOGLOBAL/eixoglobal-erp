$src = "c:\Users\DANILO\OneDrive\EIXO GLOBAL\TI\SISTEMA\GOOGLE ANTIGRAVITY\EIXO GLOBAL - ERP"
$dest = "C:\Users\Danilo\OneDrive\Desktop\erp-eixo-global-backup.zip"

if (Test-Path $dest) { Remove-Item $dest -Force }

$tempDir = Join-Path $env:TEMP "erp-backup-temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }

# Copiar tudo
Copy-Item -Path $src -Destination $tempDir -Recurse

# Remover pastas grandes que podem ser recriadas
$removeDirs = @("node_modules", ".next", ".git")
foreach ($dir in $removeDirs) {
    $path = Join-Path $tempDir $dir
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
        Write-Host "Removido: $dir"
    }
}

# Também remover node_modules aninhados
Get-ChildItem -Path $tempDir -Directory -Recurse -Filter "node_modules" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Comprimir
Compress-Archive -Path "$tempDir\*" -DestinationPath $dest -Force
Write-Host "ZIP criado em: $dest"

# Tamanho do arquivo
$size = (Get-Item $dest).Length / 1MB
Write-Host "Tamanho: $([math]::Round($size, 2)) MB"

# Limpar temp
Remove-Item $tempDir -Recurse -Force
Write-Host "Backup concluido com sucesso!"
