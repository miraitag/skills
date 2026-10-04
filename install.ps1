<#
.SYNOPSIS
  Instala los skills y agentes de Scotia Móvil MX en GitHub Copilot (VS Code) en Windows.

.EXAMPLE
  .\install.ps1                          # instalación personal → ~\.copilot\skills + ~\.copilot\agents
  .\install.ps1 -Project C:\repos\app    # en un proyecto     → <ruta>\.github\skills + <ruta>\.github\agents
  .\install.ps1 -Aliases                 # agrega las funciones de terminal scotia-arch / scotia-quality
  .\install.ps1 -Uninstall               # elimina lo que este script instaló
  .\install.ps1 -DryRun                  # muestra lo que haría, sin cambiar nada

.NOTES
  Volver a correrlo actualiza la instalación. Copia los archivos (no usa enlaces simbólicos,
  que en Windows requieren permisos de administrador o modo desarrollador).
  Si la ejecución de scripts está bloqueada:  powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
[CmdletBinding()]
param(
  [string]$Project = '',
  [switch]$Aliases,
  [switch]$Uninstall,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$RepoDir = $PSScriptRoot
$SkillsSrc = Join-Path $RepoDir 'skills'
$AgentsSrc = Join-Path $RepoDir 'agents'

function Ok([string]$m) { Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn([string]$m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Run([string]$desc, [scriptblock]$action) {
  if ($DryRun) { Write-Host "  [dry-run] $desc" } else { & $action }
}

if ($Project) {
  if (-not (Test-Path $Project -PathType Container)) { throw "No existe la carpeta del proyecto: $Project" }
  $Project = (Resolve-Path $Project).Path
  $SkillsDst = Join-Path $Project '.github/skills'
  $AgentsDst = Join-Path $Project '.github/agents'
  $Where = "proyecto $Project"
} else {
  $SkillsDst = Join-Path $HOME '.copilot/skills'
  $AgentsDst = Join-Path $HOME '.copilot/agents'
  $Where = 'personal (~/.copilot)'
}

if (-not (Test-Path $SkillsSrc -PathType Container)) { throw "No existe $SkillsSrc (corre el script desde el repositorio clonado)" }
Write-Host "Skills Scotia Móvil MX -> $Where"

# ── skills válidos: carpeta con SKILL.md cuyo name coincide con el nombre de la carpeta ──
$skills = @()
foreach ($dir in Get-ChildItem $SkillsSrc -Directory) {
  $skillMd = Join-Path $dir.FullName 'SKILL.md'
  if (-not (Test-Path $skillMd)) { continue }
  $line = Select-String -Path $skillMd -Pattern '^name:\s*(.+)$' | Select-Object -First 1
  $declared = if ($line) { $line.Matches[0].Groups[1].Value.Trim().Trim('"', "'") } else { '' }
  if ($declared -ne $dir.Name) {
    Warn "se omite $($dir.Name): SKILL.md declara name '$declared' (VS Code exige carpeta = name)"
    continue
  }
  $skills += $dir
}
if ($skills.Count -eq 0) { throw "No hay skills válidos en $SkillsSrc" }
$agents = if (Test-Path $AgentsSrc) { @(Get-ChildItem $AgentsSrc -Filter '*.agent.md' -File) } else { @() }

# ── desinstalar ──
if ($Uninstall) {
  foreach ($s in $skills) {
    $dst = Join-Path $SkillsDst $s.Name
    if (Test-Path $dst) { Run "Remove-Item $dst" { Remove-Item $dst -Recurse -Force }; Ok "skill eliminado: $($s.Name)" }
  }
  foreach ($a in $agents) {
    $dst = Join-Path $AgentsDst $a.Name
    if (Test-Path $dst) { Run "Remove-Item $dst" { Remove-Item $dst -Force }; Ok "agente eliminado: $($a.Name)" }
  }
  Write-Host "Listo. Si agregaste funciones de terminal, borra a mano las líneas 'scotia-' de tu perfil ($PROFILE)."
  return
}

Run "New-Item $SkillsDst, $AgentsDst" { New-Item -ItemType Directory -Force -Path $SkillsDst, $AgentsDst | Out-Null }

# ── skills ──
foreach ($s in $skills) {
  $dst = Join-Path $SkillsDst $s.Name
  Run "Copy-Item $($s.FullName) -> $dst" {
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    Copy-Item $s.FullName $dst -Recurse -Force
    # archivos del repositorio que Copilot no necesita
    Get-ChildItem $dst -Recurse -File -Force |
      Where-Object { $_.Name -eq '.DS_Store' -or $_.Name -like '*.tar.gz' } |
      Remove-Item -Force
  }
  Ok "skill  $($s.Name)"
}

# ── agentes ──
if ($agents.Count -eq 0) { Warn 'no hay carpeta agents/ en el repositorio: no se instalaron agentes' }
foreach ($a in $agents) {
  $dst = Join-Path $AgentsDst $a.Name
  Run "Copy-Item $($a.FullName) -> $dst" { Copy-Item $a.FullName $dst -Force }
  Ok "agent  $($a.BaseName -replace '\.agent$', '')"
}

# ── verificación de Node (los escáneres requieren Node >= 18) ──
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $ver = (& node -v).TrimStart('v')
  if ([int]($ver.Split('.')[0]) -ge 18) { Ok "node v$ver" } else { Warn "se encontró node v$ver; los escáneres requieren Node >= 18" }
} else {
  Warn 'node no está en el PATH: instala Node >= 18 (los skills ejecutan scripts/scan.mjs)'
}

# ── funciones de terminal opcionales ──
if ($Aliases) {
  $profileDir = Split-Path $PROFILE -Parent
  $existing = if (Test-Path $PROFILE) { Get-Content $PROFILE -Raw } else { '' }
  $pairs = @(
    @{ Name = 'scotia-arch'; Skill = 'react-native-scotia-movil-mx-architecture-skills' },
    @{ Name = 'scotia-quality'; Skill = 'react-native-scotia-movil-mx-code-quality-skills' }
  )
  foreach ($p in $pairs) {
    $script = Join-Path (Join-Path $SkillsDst $p.Skill) 'scripts/scan.mjs'
    $line = "function $($p.Name) { node `"$script`" @args }"
    if ($existing -match "function $([regex]::Escape($p.Name)) ") {
      Ok "la función $($p.Name) ya existe en $PROFILE"
    } else {
      Run "Add-Content $PROFILE '$line'" {
        if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Force -Path $profileDir | Out-Null }
        Add-Content -Path $PROFILE -Value $line
      }
      Ok "función $($p.Name) -> $PROFILE"
    }
  }
  Write-Host "  Abre una terminal nueva (o corre: . `$PROFILE) para usar las funciones."
}

$scan = Join-Path (Join-Path $SkillsDst 'react-native-scotia-movil-mx-architecture-skills') 'scripts/scan.mjs'
Write-Host @"

Siguientes pasos
  1. En VS Code ejecuta "Developer: Reload Window".
  2. En Copilot Chat (modo Agent) escribe "/" -> aparecen los skills como slash commands.
  3. En el selector Agent -> "Architecture Reviewer" y "Refactor Reviewer".
  4. Una vez por proyecto, desde su raíz:
     node "$scan" --init-profile
Para actualizar: git pull en el repositorio y vuelve a correr este script.
"@
