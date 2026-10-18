#!/bin/sh
# Sourced by test-dispatch.sh: model footer parser cases (fixture lines copied here).
. "$SCRIPTS/model-footer.sh"
TAB=$(printf '\t')
check_footer() {
  got=$(workers_parse_footer "$1" "$3")
  [ "$got" = "$2" ] || { printf 'footer mismatch %s: want [%s] got [%s]\n' "$1" "$2" "$got" >&2; exit 1; }
}
# Codex: first segment is "<model> <effort>[ fast]"; later segments are ignored.
check_footer codex "GPT-6.1-Sol${TAB}medium" '  GPT-6.1-Sol medium fast · ~/Workspace/the-great-dalmuti · Write patch report'
check_footer codex "GPT-6-Luna${TAB}max" '  GPT-6-Luna max · ~/Workspace/the-great-dalmuti · Write review report'
# OpenCode: "Build" or "Build auto", last segment is effort, middle is the full model.
check_footer opencode "DeepSeek V4.1 Flash 1017 Ollama Cloud${TAB}max" '  ┃  Build auto · DeepSeek V4.1 Flash 1017 Ollama Cloud · max'
check_footer opencode "DeepSeek V4.1 Flash${TAB}max" '  ┃ Build · DeepSeek V4.1 Flash · max'
check_footer opencode "Model A OpenCode${TAB}max" '  ┃ Build auto · Model A OpenCode · max'
# AGY behavior is unchanged.
check_footer agy "Gemini 3.8 Flash${TAB}medium" '? for shortcuts                                                                                                                                           accept-edits · Gemini 3.8 Flash · medium'
# Message metadata without the box border is not a footer.
check_footer opencode "?${TAB}?" '     Build · DeepSeek V4.1 Flash 1017 · 1m 34s · 167.5 tok/s'
# An unknown effort word is not recognized as an effort.
check_footer codex "?${TAB}?" '  GPT-6.1-Sol turbo fast · ~/Workspace/the-great-dalmuti · Write patch report'
# Conflicting footers are ambiguous.
check_footer codex "?${TAB}?" '  GPT-6.1-Sol medium fast · ~/Workspace/the-great-dalmuti · Write patch report
  GPT-6-Luna max fast · ~/Workspace/the-great-dalmuti · Write review report'
