#!/usr/bin/env bash
# A Maestro flow file is exactly two YAML documents: the config header, then one
# flow. Any further `---` section is silently ignored — the flow still reports
# green while testing only its first scenario. Two files in this repo had
# accumulated extra scenarios that way (log-screen-back-navigation.yaml held
# four, log-emotion.yaml held six) and between them hid a real navigation
# defect. This guard makes that failure mode loud instead of silent.
set -euo pipefail

cd "$(dirname "$0")/.."

status=0
while IFS= read -r flow; do
  separators=$(grep -c '^---[[:space:]]*$' "$flow" || true)
  if [ "$separators" -gt 1 ]; then
    echo "$flow: $separators document separators — a flow file may hold only one flow."
    echo "  Everything after the second '---' never runs. Split the extra scenarios into their own files."
    status=1
  fi
done < <(find maestro -name '*.yaml' ! -name 'config.yaml')

if [ "$status" -eq 0 ]; then
  echo "Maestro flows OK — no multi-document files."
fi
exit "$status"
