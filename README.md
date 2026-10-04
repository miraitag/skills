# Scotia Móvil MX — Skills y agentes de auditoría para React Native

Guía para instalar y usar, en cualquier proyecto React Native de Scotia Móvil MX,
los dos skills y los dos agentes de este repositorio con GitHub Copilot en VS Code.

| Pieza | Tipo | Qué hace | Cuándo usarla |
| --- | --- | --- | --- |
| `react-native-scotia-movil-mx-architecture-skills` | Skill | Audita **dónde vive el código y cómo se llama**: capas, nombres, mappers, view-models, `values/`, formularios, API pública y tamaño de pantallas | Primero, siempre |
| `react-native-scotia-movil-mx-code-quality-skills` | Skill | Audita **cómo está implementado**: efectos y cleanup, hooks, estilos, colores, listas, tipado, RHF/Yup, navegación, logs | Después de arquitectura |
| **Architecture Reviewer** (`architecture-reviewer.agent.md`) | Agente | Revisión de arquitectura en una sola pasada, sin diálogos (solo reporte o reporte + corrección) | Revisión rápida antes de un PR, o un reporte para compartir |
| **Refactor Reviewer** (`refactor-reviewer.agent.md`) | Agente | Divide pantallas o componentes grandes y extrae código a hook, util, view-model, UI mapper o `values/`, archivo por archivo y con aprobación | Sobre los archivos que el skill de arquitectura marca como candidatos |

## Estructura del repositorio

La estructura refleja cómo se instala en Copilot: lo que está en `skills/` va a
la carpeta de skills de Copilot y lo que está en `agents/` a la de agentes.

```
.
├── README.md        ← esta guía
├── install.sh       ← instalador macOS / Linux
├── install.ps1      ← instalador Windows
├── skills/
│   ├── react-native-scotia-movil-mx-architecture-skills/   (SKILL.md, rules/, scripts/)
│   └── react-native-scotia-movil-mx-code-quality-skills/   (SKILL.md, rules/, scripts/)
└── agents/
    ├── architecture-reviewer.agent.md
    └── refactor-reviewer.agent.md
```

Los agentes no dependen de dónde estén guardados aquí: al ejecutarse buscan el
skill de arquitectura **instalado** (en `~/.copilot/skills/` o en
`.github/skills/` del proyecto) y usan su escáner y sus reglas.

---

## 1. Requisitos

- VS Code con GitHub Copilot Chat en modo **Agent**.
- Node.js ≥ 18 (el mismo de cualquier proyecto React Native). Los escáneres son
  scripts de Node sin dependencias; funcionan en macOS, Linux y Windows.
- Git en el proyecto (para el modo `diff`; sin git se audita todo).
- Abrir en VS Code **la raíz del proyecto** que se va a auditar.

---

## 2. Instalación

VS Code busca los skills en `~/.copilot/skills/` y los agentes en
`~/.copilot/agents/` (instalación personal), o en `.github/skills/` y
`.github/agents/` dentro de un proyecto. Los scripts de instalación copian todo
al lugar correcto.

### Instalación con el script (recomendada)

**macOS / Linux:**

```bash
git clone <url-del-repositorio> ~/Repository/skills
cd ~/Repository/skills
./install.sh            # personal: para todos tus proyectos
```

**Windows (PowerShell):**

```powershell
git clone <url-del-repositorio> $HOME\Repository\skills
cd $HOME\Repository\skills
.\install.ps1
```

Si Windows bloquea la ejecución de scripts:
`powershell -ExecutionPolicy Bypass -File .\install.ps1`.

| Opción (`install.sh` / `install.ps1`) | Qué hace |
| --- | --- |
| *(sin opciones)* | Instalación personal en `~/.copilot/skills` y `~/.copilot/agents` |
| `--project <ruta>` / `-Project <ruta>` | Instala en `<ruta>/.github/skills` y `<ruta>/.github/agents` (para hacer commit en ese proyecto) |
| `--aliases` / `-Aliases` | Agrega los atajos de terminal `scotia-arch` y `scotia-quality` (sección 6) |
| `--link` *(solo macOS / Linux)* | Usa enlaces simbólicos en lugar de copias: un `git pull` actualiza la instalación. Útil para quien mantiene el repo |
| `--uninstall` / `-Uninstall` | Elimina los skills y agentes que instaló el script |
| `--dry-run` / `-DryRun` | Muestra lo que haría sin cambiar nada |

El script:
- valida que cada carpeta de skill se llame igual que el `name` de su
  `SKILL.md` (VS Code lo exige);
- reemplaza la versión anterior si ya existía;
- no copia archivos que Copilot no necesita (`.DS_Store`, respaldos `.tar.gz`);
- verifica que Node ≥ 18 esté instalado.

**Para actualizar:** `git pull` en el repositorio y vuelve a correr el script.

### Instalación manual (sin script)

Copia las carpetas tal cual:

| Del repositorio | A (personal) | O a (proyecto) |
| --- | --- | --- |
| `skills/<skill>/` (cada una) | `~/.copilot/skills/<skill>/` | `<proyecto>/.github/skills/<skill>/` |
| `agents/*.agent.md` | `~/.copilot/agents/` | `<proyecto>/.github/agents/` |

VS Code también acepta `.claude/skills/` o `.agents/skills/` (skills) y
`.claude/agents/` (agentes).

### Comprobar la instalación

1. Recarga VS Code (`Developer: Reload Window`).
2. En el chat escribe `/`: deben aparecer
   `/react-native-scotia-movil-mx-architecture-skills` y
   `/react-native-scotia-movil-mx-code-quality-skills`.
3. En el selector **Agent** del chat deben aparecer **Architecture Reviewer** y
   **Refactor Reviewer**.

---

## 3. Primera vez en un proyecto

Hazlo una sola vez por proyecto, desde su raíz:

```bash
node ~/.copilot/skills/react-native-scotia-movil-mx-architecture-skills/scripts/scan.mjs --init-profile
```

(Si no lo haces, el primer skill que corras lo crea y te pregunta solo los
valores que no pudo detectar.)

Esto crea `.scotia-audit/profile.md`. Revísalo, sobre todo:

| Clave | Para qué |
| --- | --- |
| `layers_root`, `values_root`, `src_root` | Rutas del proyecto (`src/private`, `src/private/values`, `src`) |
| `naming_variant` | `feature-library` o `design-system` (convención de nombres de archivos) |
| `base_branch` | Rama contra la que se calcula el modo `diff` (`origin/develop`, `origin/main`…) |
| `typecheck_cmd`, `lint_cmd` | Comandos de validación tras cada corrección |
| `theme_hook` | Hook de canvas-core que expone `canvasTheme` (`useCanvasCoreTheme`) |
| `max_component_lines`, `max_jsx_elements`, `max_state_hooks`, `max_handlers` | Umbrales para marcar pantallas o componentes grandes |
| `exclude`, `disabled_rules` | Archivos a ignorar y reglas que el equipo no aplica en este proyecto |

**Haz commit de `.scotia-audit/`.** Así el perfil y los hallazgos omitidos
(baselines) se comparten con todo el equipo.

---

## 4. Cómo correr cada pieza

### Skills

En el chat, en modo Agent, con el slash command y opcionalmente un argumento:

```
/react-native-scotia-movil-mx-architecture-skills
/react-native-scotia-movil-mx-architecture-skills --scope=full
/react-native-scotia-movil-mx-architecture-skills --scope=src/private/presentation/screens/transfers
/react-native-scotia-movil-mx-code-quality-skills --only=state,lists
/react-native-scotia-movil-mx-code-quality-skills --eslint
```

También se activan con lenguaje natural ("audita la arquitectura de este
proyecto", "revisa la calidad del código"), pero el slash command es más
predecible.

Qué esperar:

1. Un **summary** corto con los hallazgos reales por regla (sale del escáner;
   el agente no lee archivos para armarlo).
2. Un diálogo para elegir las categorías a revisar.
3. Por cada regla elegida: una tabla de hallazgos y un diálogo con las opciones
   `Apply all` · `Choose one by one` · `Skip all` · `Cancel audit`. Lo omitido
   va al baseline y no vuelve a aparecer.
4. Un resumen final.

| Argumento | Efecto |
| --- | --- |
| *(ninguno)* | `diff` contra `base_branch` si ya existe un baseline; si no, `full` |
| `--scope=full` / `diff` / `<ruta>` | Todo el proyecto / solo los cambios / una carpeta o archivo |
| `--only=<categoría o regla,…>` | Limitar a categorías (`Presentation`, `state`…) o reglas concretas |
| `--base=<ref>` | Rama base distinta para `diff` |
| `--eslint` *(calidad)* | Suma los resultados del ESLint del proyecto (más preciso) |

### Agentes

1. En el chat abre el selector **Agent** y elige el agente.
2. Escribe el encargo:

**Architecture Reviewer**

```
Revisa la arquitectura de src/private (solo reporte)
Revisa la arquitectura de los cambios de esta rama y corrige
```

**Refactor Reviewer**

```
candidates
Refactor src/private/presentation/screens/transfers/transfers.screen.tsx
```

`candidates` toma los archivos que el escáner marcó como grandes (máximo 3 por
sesión). El agente lee cada archivo completo, presenta un plan en tabla y no
edita nada hasta que lo apruebas.

---

## 5. Flujo recomendado

```
 ┌──────────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────────┐
 │ 1. Skill de arquitectura │──▶│ 2. Refactor Reviewer    │──▶│ 3. Skill de calidad       │
 │ nombres, capas, values,  │   │ pantallas grandes →     │   │ efectos, hooks, estilos,  │
 │ mappers, view-models     │   │ subcomponentes, hooks,  │   │ tipado, listas, colores   │
 │ (+ candidatos grandes)   │   │ utils                   │   │                           │
 └──────────────────────────┘   └─────────────────────────┘   └───────────────────────────┘
                                                                            │
                                     4. typecheck + lint + tests + commit ◀─┘
```

**Por qué ese orden.** Es como una remodelación: primero se mueven los muros
(arquitectura renombra y mueve archivos), luego se dividen los cuartos grandes
(el refactor crea subcomponentes, hooks y utils) y al final se pinta (calidad
pule la implementación). Si pintas antes de mover un muro, repintas: corregir
calidad en código que después se mueve o divide es trabajo y tokens perdidos.

### Primera auditoría de un proyecto

1. **Perfil:** sección 3.
2. **Arquitectura completa:** `/react-native-scotia-movil-mx-architecture-skills --scope=full`.
   Aplica o omite por regla. Si aparece `screen-decomposition-conventions`, elige
   *Hand off to Refactor Reviewer*: el skill imprime el prompt listo para el agente.
3. **Refactor:** abre un **chat nuevo**, elige **Refactor Reviewer** y pega ese
   prompt (o escribe `candidates`). Aprueba el plan archivo por archivo.
4. **Calidad completa:** chat nuevo,
   `/react-native-scotia-movil-mx-code-quality-skills --scope=full` (agrega
   `--eslint` si el perfil dice `eslint: available`).
5. **Verificación:** `typecheck`, `lint` y tests del proyecto. Haz commit del
   código y de `.scotia-audit/` (perfil + baselines).

### Día a día (cada rama o PR)

Con el baseline ya creado, los skills auditan **solo lo que cambió** respecto a
`base_branch`:

1. `/react-native-scotia-movil-mx-architecture-skills`
2. Refactor Reviewer, solo si marcó alguna pantalla nueva o que creció.
3. `/react-native-scotia-movil-mx-code-quality-skills`
4. `typecheck` + `lint` + tests → commit.

Para un vistazo rápido sin diálogos, usa el agente **Architecture Reviewer**
(*"solo reporte"*) o el escáner desde la terminal (sección 6).

### Consejos para gastar menos tokens

- **Un chat nuevo por paso.** Cada skill o agente arranca limpio y no arrastra
  el contexto del anterior.
- Acota cuando hay muchos hallazgos: `--only=...` o `--scope=<carpeta>`.
- Omite lo que el equipo acepta: queda en el baseline y no vuelve a costar.
- Ajusta umbrales y `disabled_rules` en el perfil en lugar de omitir lo mismo en
  cada ejecución.

---

## 6. Escáner desde la terminal (opcional, sin IA, cero tokens)

**No es un paso obligatorio.** Los skills ya ejecutan el escáner por ti. Usar la
terminal sirve para ver el panorama del proyecto antes de abrir el chat, o para
copiar el resultado en un PR, sin gastar tokens.

El escáner es un script de Node (`scan.mjs`) dentro de cada skill. Se ejecuta con
`node <ruta-al-script> <opciones>` **desde la raíz del proyecto que quieres
auditar**.

### Paso 1 — Crear atajos (una sola vez)

Para no escribir la ruta larga cada vez, crea dos atajos. Lo más simple es
correr el instalador con `./install.sh --aliases` (o `.\install.ps1 -Aliases`).
A mano sería así:

**macOS / Linux (zsh, el shell por defecto en macOS):**

```bash
echo "alias scotia-arch='node ~/.copilot/skills/react-native-scotia-movil-mx-architecture-skills/scripts/scan.mjs'" >> ~/.zshrc
echo "alias scotia-quality='node ~/.copilot/skills/react-native-scotia-movil-mx-code-quality-skills/scripts/scan.mjs'" >> ~/.zshrc
source ~/.zshrc
```

(Con bash, usa `~/.bashrc` en lugar de `~/.zshrc`.)

**Windows (PowerShell):**

```powershell
Add-Content $PROFILE 'function scotia-arch { node "$HOME\.copilot\skills\react-native-scotia-movil-mx-architecture-skills\scripts\scan.mjs" @args }'
Add-Content $PROFILE 'function scotia-quality { node "$HOME\.copilot\skills\react-native-scotia-movil-mx-code-quality-skills\scripts\scan.mjs" @args }'
. $PROFILE
```

Si instalaste con la Opción B (dentro del proyecto), la ruta es
`.github/skills/<skill>/scripts/scan.mjs` en lugar de `~/.copilot/skills/<skill>/...`.

### Paso 2 — Ejecutar desde la raíz del proyecto

```bash
cd ~/Repository/mi-proyecto-rn         # la carpeta que contiene package.json

scotia-arch --init-profile             # 1ª vez: crea .scotia-audit/profile.md
scotia-arch --scope=full               # summary de arquitectura de todo el proyecto
scotia-quality --scope=full            # summary de calidad de todo el proyecto
scotia-quality --scope=diff --eslint   # solo los cambios de tu rama (+ ESLint del proyecto)
scotia-quality --rule=state-useeffect-cleanup   # todos los hallazgos de una regla
```

| Opción | Qué hace |
| --- | --- |
| `--init-profile` | Crea (o muestra) el perfil del proyecto |
| `--scope=full` | Revisa todo `src/` |
| `--scope=diff` | Revisa solo lo que cambió contra `base_branch` |
| `--scope=src/private/presentation` | Revisa una carpeta o un archivo |
| `--only=Presentation,naming-conventions` | Solo esas categorías o reglas |
| `--rule=<regla>` | Lista cada hallazgo de esa regla (`archivo:línea`) |
| `--eslint` *(calidad)* | Suma los resultados del ESLint del proyecto |
| `--skip=<regla>:<archivo>:<línea>` | Manda ese hallazgo al baseline para que no vuelva a aparecer |

Ejemplo de `--skip`, copiando un hallazgo que mostró `--rule`:

```bash
scotia-quality --skip=conv-dev-logging:src/private/presentation/screens/home/home.screen.tsx:42
```

### Qué verás

```
ARCHITECTURE SCAN | scope: full | files: 128 | profile: feature-library · RN 0.79.2 · feature-library
IMPACT   HITS CATEGORY                RULE                                    FIRST HIT
CRITICAL 3    Presentation            presentation-view-model-conventions     src/private/.../transfer.view-model.ts:74
HIGH     5    Names                   naming-conventions                      src/private/domain/model/get-accounts.model.ts:1
clean: 18 | n/a: 2 (forms-dynamic-conventions, ...) | baseline-suppressed: 0
```

Cada fila es una regla con hallazgos. Para el detalle de una, usa
`--rule=<RULE>`. El escáner siempre termina con código 0: es un reporte, no un
gate de CI. Para **corregir**, usa los skills o agentes desde el chat (sección 4).

---

## 7. Archivos que se generan en el proyecto

| Archivo | Contenido | ¿Commit? |
| --- | --- | --- |
| `.scotia-audit/profile.md` | Perfil del proyecto, compartido por ambos skills y los agentes | Sí |
| `.scotia-audit/architecture-baseline.tsv` | Hallazgos de arquitectura que el equipo omitió | Sí |
| `.scotia-audit/code-quality-baseline.tsv` | Hallazgos de calidad que el equipo omitió | Sí |

Para volver a ver un hallazgo omitido, borra su línea del baseline.

---

## 8. Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| El slash command no aparece | La carpeta no se llama igual que el `name` del `SKILL.md`, o no está en una carpeta de skills reconocida. Recarga la ventana. |
| El agente no aparece en el selector | El `.agent.md` no está en `.github/agents/` ni en `~/.copilot/agents/`. |
| El agente dice que el skill no está instalado | Los agentes leen `scripts/` y `rules/` del skill de arquitectura instalado (personal o del proyecto). Instala ese skill. |
| `scope: full (no git base found)` | No existe `base_branch` localmente: haz `git fetch` o corrige `base_branch` en el perfil. |
| `node: command not found` | Instala Node ≥ 18 o abre VS Code desde una terminal con `nvm` activo. |
| Demasiados hallazgos en una regla | `--only=<regla>` y `--scope=<carpeta>`; el skill trabaja en lotes de 25. |
| Falso positivo | Elige *Skip*: queda en el baseline. Si se repite como patrón, ajusta el perfil (`exclude`, umbrales o `disabled_rules`). |
| `eslint: not available` | El proyecto no tiene ESLint instalado localmente; el escáner sigue sin él. |

---

## Referencias

- [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [Custom agents in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- Detalle de reglas: `README.md` de cada paquete.
