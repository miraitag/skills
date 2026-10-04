#!/usr/bin/env bash
# Instala los skills y agentes de Scotia Móvil MX en GitHub Copilot (VS Code).
#
#   ./install.sh                      instalación personal → ~/.copilot/skills + ~/.copilot/agents
#   ./install.sh --project <ruta>     en un proyecto     → <ruta>/.github/skills + <ruta>/.github/agents
#   ./install.sh --link               enlaces simbólicos en vez de copias (mantenedores: git pull = actualizado)
#   ./install.sh --aliases            agrega también los alias de terminal scotia-arch / scotia-quality
#   ./install.sh --uninstall          elimina lo que este script instaló
#   ./install.sh --dry-run            muestra lo que haría, sin cambiar nada
#
# Volver a correrlo actualiza la instalación. Compatible con el bash 3.2 de macOS.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$REPO_DIR/skills"
AGENTS_SRC="$REPO_DIR/agents"

MODE="copy"; PROJECT=""; ALIASES=0; UNINSTALL=0; DRY=0

usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --project) [ $# -ge 2 ] || { echo "error: --project necesita una ruta"; exit 1; }; PROJECT="$2"; shift ;;
    --link) MODE="link" ;;
    --aliases) ALIASES=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) usage 0 ;;
    *) echo "error: opción desconocida '$1'"; usage 1 ;;
  esac
  shift
done

if [ -n "$PROJECT" ]; then
  [ -d "$PROJECT" ] || { echo "error: no existe la carpeta del proyecto: $PROJECT"; exit 1; }
  PROJECT="$(cd "$PROJECT" && pwd)"
  SKILLS_DST="$PROJECT/.github/skills"; AGENTS_DST="$PROJECT/.github/agents"; WHERE="proyecto $PROJECT"
else
  SKILLS_DST="$HOME/.copilot/skills"; AGENTS_DST="$HOME/.copilot/agents"; WHERE="personal (~/.copilot)"
fi

run() { if [ "$DRY" -eq 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }
ok() { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

[ -d "$SKILLS_SRC" ] || { echo "error: no existe $SKILLS_SRC (corre el script desde el repositorio clonado)"; exit 1; }

echo "Skills Scotia Móvil MX → $WHERE (modo: $MODE)"

# ── skills ────────────────────────────────────────────────────────────────
SKILL_NAMES=""
for dir in "$SKILLS_SRC"/*/; do
  dir="${dir%/}"; name="$(basename "$dir")"
  [ -f "$dir/SKILL.md" ] || continue
  declared="$(sed -n 's/^name:[[:space:]]*//p' "$dir/SKILL.md" | head -n 1 | tr -d "\"'\r")"
  if [ "$declared" != "$name" ]; then
    warn "se omite $name: SKILL.md declara name '$declared' (VS Code exige carpeta = name)"; continue
  fi
  SKILL_NAMES="$SKILL_NAMES $name"
done
[ -n "$SKILL_NAMES" ] || { echo "error: no hay skills válidos en $SKILLS_SRC"; exit 1; }

if [ "$UNINSTALL" -eq 1 ]; then
  for name in $SKILL_NAMES; do
    if [ -e "$SKILLS_DST/$name" ] || [ -L "$SKILLS_DST/$name" ]; then run rm -rf "$SKILLS_DST/$name"; ok "skill eliminado: $name"; fi
  done
  for f in "$AGENTS_SRC"/*.agent.md; do
    [ -e "$f" ] || continue; base="$(basename "$f")"
    if [ -e "$AGENTS_DST/$base" ] || [ -L "$AGENTS_DST/$base" ]; then run rm -f "$AGENTS_DST/$base"; ok "agente eliminado: $base"; fi
  done
  echo "Listo. Si agregaste alias de terminal, borra a mano las líneas 'scotia-' de tu perfil de shell."
  exit 0
fi

run mkdir -p "$SKILLS_DST" "$AGENTS_DST"

for name in $SKILL_NAMES; do
  src="$SKILLS_SRC/$name"; dst="$SKILLS_DST/$name"
  run rm -rf "$dst"
  if [ "$MODE" = "link" ]; then
    run ln -s "$src" "$dst"
  else
    run cp -R "$src" "$dst"
    # archivos del repositorio que Copilot no necesita
    run find "$dst" \( -name '.DS_Store' -o -name '*.tar.gz' \) -type f -delete
  fi
  ok "skill  $name"
done

# ── agentes ───────────────────────────────────────────────────────────────
if [ -d "$AGENTS_SRC" ]; then
  for f in "$AGENTS_SRC"/*.agent.md; do
    [ -e "$f" ] || continue; base="$(basename "$f")"
    run rm -f "$AGENTS_DST/$base"
    if [ "$MODE" = "link" ]; then run ln -s "$f" "$AGENTS_DST/$base"; else run cp "$f" "$AGENTS_DST/$base"; fi
    ok "agent  ${base%.agent.md}"
  done
else
  warn "no hay carpeta agents/ en el repositorio: no se instalaron agentes"
fi

# ── verificación de Node (los escáneres requieren Node >= 18) ─────────────
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$major" -ge 18 ] 2>/dev/null; then ok "node $(node -v)"; else warn "se encontró node $(node -v); los escáneres requieren Node >= 18"; fi
else
  warn "node no está en el PATH: instala Node >= 18 (los skills ejecutan scripts/scan.mjs)"
fi

# ── alias de terminal opcionales ──────────────────────────────────────────
if [ "$ALIASES" -eq 1 ]; then
  case "${SHELL:-}" in */zsh) RC="$HOME/.zshrc" ;; *) RC="$HOME/.bashrc" ;; esac
  for pair in "scotia-arch:react-native-scotia-movil-mx-architecture-skills" "scotia-quality:react-native-scotia-movil-mx-code-quality-skills"; do
    alias_name="${pair%%:*}"; skill="${pair#*:}"
    line="alias $alias_name='node \"$SKILLS_DST/$skill/scripts/scan.mjs\"'"
    if [ -f "$RC" ] && grep -q "alias $alias_name=" "$RC"; then
      ok "el alias $alias_name ya existe en $RC"
    elif [ "$DRY" -eq 1 ]; then
      echo "  [dry-run] agregar a $RC: $line"
    else
      printf '%s\n' "$line" >> "$RC"; ok "alias $alias_name → $RC"
    fi
  done
  echo "  Abre una terminal nueva (o corre: source $RC) para usar los alias."
fi

cat <<EOF

Siguientes pasos
  1. En VS Code ejecuta "Developer: Reload Window".
  2. En Copilot Chat (modo Agent) escribe "/" → aparecen los skills como slash commands.
  3. En el selector Agent → "Architecture Reviewer" y "Refactor Reviewer".
  4. Una vez por proyecto, desde su raíz:
     node "$SKILLS_DST/react-native-scotia-movil-mx-architecture-skills/scripts/scan.mjs" --init-profile
Para actualizar: git pull en el repositorio y vuelve a correr este script.
EOF
