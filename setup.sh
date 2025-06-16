#!/bin/bash

# 🚀 Multi-Agent Communication Demo 環境構築
# 参考: setup_full_environment.sh

set -euo pipefail  # エラー時に停止、未定義変数参照でエラー、パイプラインエラーも検知

# 色定義（ANSI カラーコード）
# 参考: \033[1;XXm で明るい色、\033[0m でリセット
COLOR_RED='\033[1;31m'      # 明るい赤（boss1用）
COLOR_BLUE='\033[1;34m'     # 明るい青（worker用）
COLOR_MAGENTA='\033[1;35m'  # 明るいマゼンタ（PRESIDENT用）
COLOR_GREEN='\033[1;32m'    # 明るい緑（ディレクトリ表示用）
COLOR_RESET='\033[0m'       # 色リセット

# 色付きログ関数
log_info() {
    echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_BLUE}[SUCCESS]${COLOR_RESET} $1"
}

# シェル判定関数
set_shell_prompt() {
    local pane_id="$1"
    local name="$2"
    local color="$3"
    
    # tmuxセッション内でシェルを判定してプロンプトを設定
    tmux send-keys -t "$pane_id" "
if [ -n \"\$ZSH_VERSION\" ]; then
    # zshの場合
    export PROMPT=\"(%F{$color}$name%f) %F{46}%~%f%# \"
elif [ -n \"\$BASH_VERSION\" ]; then
    # bashの場合
    case $color in
        196) export PS1='(\\[\\033[1;31m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        21)  export PS1='(\\[\\033[1;34m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        201) export PS1='(\\[\\033[1;35m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
    esac
else
    # その他のシェルの場合
    export PS1='($name) \\w\\$ '
fi
" C-m
}

echo "🤖 Multi-Agent Communication Demo 環境構築"
echo "==========================================="
echo ""

# 依存関係チェック
log_info "🔍 依存関係チェック中..."

# tmuxチェック
if ! command -v tmux &> /dev/null; then
    echo "❌ エラー: tmuxがインストールされていません"
    echo "   macOS: brew install tmux"
    echo "   Ubuntu: sudo apt-get install tmux"
    exit 1
fi

# Claude CLIチェック
if ! command -v claude &> /dev/null; then
    echo "⚠️  警告: Claude CLIがインストールされていません"
    echo "   インストール方法: https://github.com/anthropics/claude-cli"
    echo "   続行しますか？ (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_success "✅ 依存関係チェック完了"
echo ""

# STEP 1: 既存セッションクリーンアップ
log_info "🧹 既存セッションクリーンアップ開始..."

tmux kill-session -t multiagent 2>/dev/null && log_info "multiagentセッション削除完了" || log_info "multiagentセッションは存在しませんでした"
tmux kill-session -t president 2>/dev/null && log_info "presidentセッション削除完了" || log_info "presidentセッションは存在しませんでした"

# 完了ファイルクリア
mkdir -p ./tmp
rm -f ./tmp/worker*_done.txt 2>/dev/null && log_info "既存の完了ファイルをクリア" || log_info "完了ファイルは存在しませんでした"

log_success "✅ クリーンアップ完了"
echo ""

# STEP 2: multiagentセッション作成（4ペイン：boss1 + worker1,2,3）
log_info "📺 multiagentセッション作成開始 (4ペイン)..."

# 最初のペイン作成
tmux new-session -d -s multiagent -n "agents"

# 2x2グリッド作成（合計4ペイン）
tmux split-window -h -t multiagent:agents      # 水平分割（左右）
tmux select-pane -t multiagent:agents.0
tmux split-window -v                            # 左側を垂直分割
tmux select-pane -t multiagent:agents.2
tmux split-window -v                            # 右側を垂直分割

# ペインタイトル設定
log_info "ペインタイトル設定中..."
PANE_TITLES=("boss1" "worker1" "worker2" "worker3")

for i in {0..3}; do
    tmux select-pane -t "multiagent:agents.$i" -T "${PANE_TITLES[$i]}"
    
    # 作業ディレクトリ設定
    tmux send-keys -t "multiagent:agents.$i" "cd $(pwd)" C-m
    
    # カラープロンプト設定（シェル自動判定）
    if [ $i -eq 0 ]; then
        # boss1: 赤色
        set_shell_prompt "multiagent:agents.$i" "${PANE_TITLES[$i]}" "196"
    else
        # workers: 青色
        set_shell_prompt "multiagent:agents.$i" "${PANE_TITLES[$i]}" "21"
    fi
    
    # ウェルカムメッセージ
    tmux send-keys -t "multiagent:agents.$i" "echo '=== ${PANE_TITLES[$i]} エージェント ==='" C-m
    
    # デバッグ用：TERM環境変数確認（問題がある場合はコメントアウトを解除）
    # tmux send-keys -t "multiagent:agents.$i" "echo \"TERM: \$TERM\"" C-m
done

log_success "✅ multiagentセッション作成完了"
echo ""

# STEP 3: presidentセッション作成（1ペイン）
log_info "👑 presidentセッション作成開始..."

# presidentセッション作成
tmux new-session -d -s president -c "$(pwd)"

# 作業ディレクトリ確認（念のため）
tmux send-keys -t president "cd $(pwd)" C-m

# PRESIDENTのカラープロンプト設定（マゼンタ色）
set_shell_prompt "president:0" "PRESIDENT" "201"

# ウェルカムメッセージ
tmux send-keys -t president "echo '=== PRESIDENT セッション ==='" C-m
tmux send-keys -t president "echo 'プロジェクト統括責任者'" C-m
tmux send-keys -t president "echo '========================'" C-m

# セッション確認
if tmux has-session -t president 2>/dev/null; then
    log_success "✅ presidentセッション作成完了"
else
    log_error "❌ presidentセッション作成に失敗しました"
    exit 1
fi
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
echo "  multiagentセッション（4ペイン）:"
echo "    Pane 0: boss1     (チームリーダー)"
echo "    Pane 1: worker1   (実行担当者A)"
echo "    Pane 2: worker2   (実行担当者B)"
echo "    Pane 3: worker3   (実行担当者C)"
echo ""
echo "  presidentセッション（1ペイン）:"
echo "    Pane 0: PRESIDENT (プロジェクト統括)"

echo ""
log_success "🎉 Demo環境セットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "  1. 🔗 セッションアタッチ:"
echo "     tmux attach-session -t multiagent   # マルチエージェント確認"
echo "     tmux attach-session -t president    # プレジデント確認"
echo ""
echo "  2. 🤖 Claude Code起動:"
echo "     # 手順1: President認証"
echo "     tmux send-keys -t president 'claude' C-m"
echo "     # 手順2: 認証後、multiagent一括起動"
echo "     for i in {0..3}; do tmux send-keys -t multiagent:agents.\$i 'claude' C-m; done"
echo ""
echo "  3. 📜 指示書確認:"
echo "     PRESIDENT: instructions/president.md"
echo "     boss1: instructions/boss.md"
echo "     worker1,2,3: instructions/worker.md"
echo "     システム構造: CLAUDE.md"
echo ""
echo "  4. 🚀 推奨: 自動起動スクリプト使用"
echo "     ./start-agents.sh"
echo ""
echo "  5. 🎯 デモ実行: PRESIDENTに「あなたはpresidentです。指示書に従って」と入力"
echo ""
echo "🔍 状態確認: ./check-status.sh"
echo "📝 メッセージ履歴: ./agent-send.sh --history"
