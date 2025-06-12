#!/bin/bash

# セッションが既存の場合、削除
tmux kill-session -t workers 2>/dev/null
tmux kill-session -t president 2>/dev/null

# --- presidentセッション作成 ---
echo "🛠️ Creating 'president' session..."
tmux new-session -d -s president -n "main"

# --- workersセッション作成 (4ペイン, 2x2) ---
echo "🛠️ Creating 2x2 'workers' session..."
# 最初のペイン(0)を作成
tmux new-session -d -s workers -n "workers"
# ペイン1を下に作成
tmux split-window -v -t workers:0.0
# ペイン0を選択し、右にペイン2を作成
tmux select-pane -t workers:0.0
tmux split-window -h -t workers:0.0
# ペイン1を選択し、右にペイン3を作成
tmux select-pane -t workers:0.1
tmux split-window -h -t workers:0.1
# レイアウトを整える
tmux select-layout -t workers:0 tiled

# --- 全エージェントの起動 ---
echo "🚀 Starting claude in all agent panes..."

# Presidentを起動
tmux send-keys -t president:0.0 'claude --dangerously-skip-permissions' C-m
sleep 0.2

# 4人のWorkersを起動
for i in {0..3}; do
    tmux send-keys -t workers:0.$i 'claude --dangerously-skip-permissions' C-m
    sleep 0.2
done

echo ""
echo "✅ tmux sessions 'workers' (4 panes) and 'president' created."
echo "✅ All agents are starting up..."
echo "Attach with 'tmux attach -t workers' or 'tmux attach -t president'" 