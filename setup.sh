#!/bin/bash

# 🚀 Multi-Agent Communication Demo 環境構築
# 参考: setup_full_environment.sh

set -e  # エラー時に停止

# 色付きログ関数
log_info() {
    echo -e "\033[1;32m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[1;34m[SUCCESS]\033[0m $1"
}

echo "🤖 Multi-Agent Communication Demo 環境構築"
echo "==========================================="
echo ""

# STEP 1: 既存セッションクリーンアップ
log_info "🧹 既存セッションクリーンアップ開始..."

tmux kill-session -t multiagent 2>/dev/null && log_info "multiagentセッション削除完了" || log_info "multiagentセッションは存在しませんでした"

# 完了ファイルクリア
mkdir -p ./tmp

log_success "✅ クリーンアップ完了"
echo ""

# STEP 2: multiagentセッション作成（2ペイン：boss + worker）
log_info "📺 multiagentセッション作成開始 (2ペイン)..."

# 最初のペイン作成
tmux new-session -d -s multiagent -n "agents"

# 左右に分割（合計2ペイン）
tmux split-window -h -t "multiagent:0"      # 水平分割（左右）

# ペインタイトル設定
log_info "ペインタイトル設定中..."
PANE_TITLES=("boss" "worker")

for i in {0..1}; do
    tmux select-pane -t "multiagent:0.$i" -T "${PANE_TITLES[$i]}"
    
    # 作業ディレクトリ設定
    tmux send-keys -t "multiagent:0.$i" "cd $(pwd)" C-m
    
    # カラープロンプト設定
    if [ $i -eq 0 ]; then
        # boss: 赤色
        tmux send-keys -t "multiagent:0.$i" "export PS1='(\[\033[1;31m\]${PANE_TITLES[$i]}\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
    else
        # worker: 青色
        tmux send-keys -t "multiagent:0.$i" "export PS1='(\[\033[1;34m\]${PANE_TITLES[$i]}\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
    fi
    
    # ウェルカムメッセージ
    tmux send-keys -t "multiagent:0.$i" "echo '=== ${PANE_TITLES[$i]} エージェント ==='" C-m
done

log_success "✅ multiagentセッション作成完了"
echo ""

# STEP 4: 環境確認・表示
log_info "🔍 環境確認中..."

echo ""
echo "📊 セットアップ結果:"
echo "==================="

# tmuxセッション確認
echo "📺 Tmux Sessions:"
tmux list-sessions
echo ""

# ペイン構成表示
echo "📋 ペイン構成:"
echo "  multiagentセッション（2ペイン）:"
echo "    Pane 0: boss     (リーダー)"
echo "    Pane 1: worker   (実行担当者)"

echo ""
log_success "🎉 Demo環境セットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "  1. 🔗 セッションアタッチ:"
echo "     tmux attach-session -t multiagent   # boss/workerペイン確認"
echo ""
echo "  2. 🤖 Claude Code起動:"
echo "     # multiagentセッションの各ペインでClaude Codeを起動"
echo "     for i in {0..1}; do tmux send-keys -t multiagent:0.\$i 'claude' C-m; done"
echo ""
echo "  3. 📜 指示書確認:"
echo "     boss: instructions/boss.md"
echo "     worker: instructions/worker.md"
echo "     システム構造: CLAUDE.md"
echo ""
echo "  4. 🎯 デモ実行: bossペインに「あなたはbossです。指示書に従って」または具体的な指示を入力"
