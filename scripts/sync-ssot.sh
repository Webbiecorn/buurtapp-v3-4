#!/usr/bin/env bash
# sync-ssot.sh — Synchroniseer PROJECT_HANDOFF.md naar de SSOT-map op schijf
#
# Gebruik: ./scripts/sync-ssot.sh
# Optioneel: ./scripts/sync-ssot.sh --dry-run

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSOT_DIR="$HOME/Webbiecorn-bedrijf/WEBBIECORN-SSOT/buurtapp-v3-4"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "▶ DRY RUN — geen bestanden worden gewijzigd"
fi

# Bestanden om te synchroniseren: bron (relatief aan repo root) → doel (relatief aan SSOT_DIR)
declare -A FILES=(
  ["docs/ai/PROJECT_HANDOFF.md"]="PROJECT_HANDOFF.md"
  ["docs/ai/CURRENT_TASK.md"]="CURRENT_TASK.md"
  [".github/copilot-instructions.md"]="copilot-instructions.md"
)

echo "▶ Synchroniseer naar: $SSOT_DIR"
echo ""

mkdir -p "$SSOT_DIR"

for SRC_REL in "${!FILES[@]}"; do
  SRC="$REPO_ROOT/$SRC_REL"
  DEST="$SSOT_DIR/${FILES[$SRC_REL]}"

  if [[ ! -f "$SRC" ]]; then
    echo "  ⚠️  Overgeslagen (niet gevonden): $SRC_REL"
    continue
  fi

  if $DRY_RUN; then
    echo "  [dry] cp $SRC_REL → $SSOT_DIR/${FILES[$SRC_REL]}"
  else
    cp "$SRC" "$DEST"
    echo "  ✅  $SRC_REL → ${FILES[$SRC_REL]}"
  fi
done

echo ""
echo "▶ Klaar. SSOT bijgewerkt op: $(date '+%d-%m-%Y %H:%M')"
