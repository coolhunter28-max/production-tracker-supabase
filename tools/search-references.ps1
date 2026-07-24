<#
.SYNOPSIS
    Busca referencias a un patrón dentro del proyecto.

.DESCRIPTION
    Recorre el proyecto de forma recursiva, excluyendo las carpetas
    que normalmente no contienen código fuente relevante
    (node_modules, .next, .git, coverage y dist).

.PARAMETER Pattern
    Expresión regular que se desea buscar.

.PARAMETER Path
    Carpeta desde la que comienza la búsqueda.
    Por defecto, la raíz del proyecto.

.EXAMPLE
    .\tools\search-references.ps1 "mv_fact_operacion_linea"

.EXAMPLE
    .\tools\search-references.ps1 "mv_fact_operacion_linea|mv_fact_operacion_linea_v2"

.EXAMPLE
    .\tools\search-references.ps1 "lineas_pedido" -Path ".\src"

.NOTES
    Production Tracker
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Pattern,

    [string]$Path = "."
)

$Excluded = '\\node_modules\\|\\.next\\|\\.git\\|\\coverage\\|\\dist\\'

Write-Host ""
Write-Host "Production Tracker - Search References" -ForegroundColor Cyan
Write-Host "--------------------------------------"
Write-Host "Pattern : $Pattern"
Write-Host "Path    : $Path"
Write-Host ""

$results = Get-ChildItem -Path $Path -Recurse -File |
Where-Object {
    $_.FullName -notmatch $Excluded
} |
Select-String -Pattern $Pattern |
Sort-Object Path, LineNumber

if ($results.Count -eq 0) {
    Write-Host "No se encontraron referencias." -ForegroundColor Yellow
    exit
}

foreach ($result in $results) {

    Write-Host "$($result.Path):$($result.LineNumber)" -ForegroundColor Green
    Write-Host "    $($result.Line.Trim())"
    Write-Host ""
}

Write-Host "--------------------------------------"
Write-Host "Referencias encontradas: $($results.Count)" -ForegroundColor Cyan