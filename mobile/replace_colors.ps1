# Script PowerShell pour remplacer les couleurs hardcodées par theme.*
# Usage: .\replace_colors.ps1

$files = @(
    "src\app\(tabs)\index.jsx",
    "src\app\(tabs)\trajets.jsx",
    "src\app\(tabs)\compagnies.jsx",
    "src\app\(tabs)\favoris.jsx",
    "src\app\(tabs)\mes-reservations.jsx",
    "src\app\(tabs)\trajet\[id].jsx",
    "src\app\(tabs)\compagnie\[id].jsx"
)

$replacements = @{
    '"#FFFFFF"' = 'theme.background'
    "'#FFFFFF'" = 'theme.background'
    '"#F9FAFB"' = 'theme.backgroundSecondary'
    "'#F9FAFB'" = 'theme.backgroundSecondary'
    '"#F3F4F6"' = 'theme.surfaceSecondary'
    "'#F3F4F6'" = 'theme.surfaceSecondary'
    '"#1F2937"' = 'theme.text'
    "'#1F2937'" = 'theme.text'
    '"#374151"' = 'theme.text'
    "'#374151'" = 'theme.text'
    '"#6B7280"' = 'theme.textSecondary'
    "'#6B7280'" = 'theme.textSecondary'
    '"#9CA3AF"' = 'theme.textTertiary'
    "'#9CA3AF'" = 'theme.textTertiary'
    '"#E5E7EB"' = 'theme.border'
    "'#E5E7EB'" = 'theme.border'
    '"#D1D5DB"' = 'theme.borderLight'
    "'#D1D5DB'" = 'theme.borderLight'
    '"#1E88E5"' = 'theme.primary'
    "'#1E88E5'" = 'theme.primary'
    '"#10B981"' = 'theme.success'
    "'#10B981'" = 'theme.success'
    '"#EF4444"' = 'theme.error'
    "'#EF4444'" = 'theme.error'
    '"#F59E0B"' = 'theme.warning'
    "'#F59E0B'" = 'theme.warning'
}

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Traitement de $file..." -ForegroundColor Cyan
        
        $content = Get-Content $fullPath -Raw
        $modified = $false
        
        foreach ($old in $replacements.Keys) {
            $new = $replacements[$old]
            if ($content -match [regex]::Escape($old)) {
                $content = $content -replace [regex]::Escape($old), $new
                $modified = $true
            }
        }
        
        if ($modified) {
            Set-Content $fullPath -Value $content -NoNewline
            Write-Host "  ✓ Modifié" -ForegroundColor Green
        } else {
            Write-Host "  - Aucun changement" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ Fichier introuvable: $file" -ForegroundColor Red
    }
}

Write-Host "`nTerminé !" -ForegroundColor Green
