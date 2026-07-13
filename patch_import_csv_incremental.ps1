$ErrorActionPreference = "Stop"

$path = "src\app\api\import-csv\route.ts"

if (-not (Test-Path $path)) {
    throw "No existe $path"
}

$content = Get-Content $path -Raw

$lineCancellationPattern = '(?s)\r?\n\s*for \(const existingLine of \(existingLines \?\? \[\]\) as ExistingLine\[\]\) \{\r?\n\s*if \(matchedExistingLineIds\.has\(existingLine\.id\)\) continue;.*?\r?\n\s*\}\r?\n\r?\n\s*ok\+\+;'

if ($content -notmatch $lineCancellationPattern) {
    throw "No se encontró el bloque de cancelación automática de líneas. No se ha modificado el archivo."
}

$content = [regex]::Replace(
    $content,
    $lineCancellationPattern,
    "`r`n`r`n      // Importación incremental: las líneas ausentes del documento se conservan sin cambios.`r`n      ok++;",
    1
)

$poCancellationPattern = '(?s)\r?\n\s*if \(importedSeasons\.size > 0\) \{\r?\n.*?\r?\n\s*\}\r?\n\r?\n\s*await supabase\.from\("importaciones"\)\.insert'

if ($content -notmatch $poCancellationPattern) {
    throw "No se encontró el bloque de cancelación automática de POs. No se ha guardado ningún cambio."
}

$content = [regex]::Replace(
    $content,
    $poCancellationPattern,
    "`r`n`r`n    // Importación incremental: los POs ausentes del documento se conservan sin cambios.`r`n`r`n    await supabase.from(`"importaciones`").insert",
    1
)

Set-Content -Path $path -Value $content -Encoding UTF8

Write-Host "Import Spain corregido: ya no cancela líneas ni POs ausentes del archivo." -ForegroundColor Green
Write-Host "Archivo modificado: $path"
