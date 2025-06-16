#!/bin/bash

# 🚀 Claude Agents 起動スクリプト
# setup.sh実行後に使用してください

set -euo pipefail

# 色定義
COLOR_GREEN='\033[1;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[1;31m'
COLOR_RESET='\033[0m'

# ログ関数
log_info() {
    echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $1"
}

log_warn() {
    echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

# セッション存在確認
check_sessions() {
    local missing=0
    
    if ! tmux has-session -t president 2>/dev/null; then
        log_error "presidentセッションが見つかりません"
        missing=1
    fi
    
    if ! tmux has-session -t multiagent 2>/dev/null; then
        log_error "multiagentセッションが見つかりません"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        echo "先に ./setup.sh を実行してください"
        exit 1
    fi
    
    return 0
}

# Claude起動確認
check_claude_running() {
    local pane_id="$1"
    local output
    
    # ペインの最新出力を取得
    output=$(tmux capture-pane -t "$pane_id" -p | tail -20)
    
    # Claude起動の兆候を確認
    if echo "$output" | grep -q -E "(Claude|claude|Welcome|認証|Authentication)"; then
        return 0
    fi
    
    return 1
}

# メイン処理
main() {
    echo "🤖 Claude Agents 起動スクリプト"
    echo "================================="
    echo ""
    
    # セッション確認
    log_info "セッション確認中..."
    check_sessions
    log_info "✅ セッション確認完了"
    echo ""
    
    # Step 1: President認証
    echo "📋 Step 1: PRESIDENT認証"
    echo "========================"
    log_info "presidentセッションでClaude認証を開始します"
    
    # Claudeコマンド送信
    tmux send-keys -t president 'claude' C-m
    
    echo ""
    echo "⏳ 認証プロンプトが表示されるまで待機中..."
    echo "   ブラウザで認証を完了してください"
    echo ""
    echo "認証が完了したら、Enterキーを押してください..."
    read -r
    
    # 認証確認
    if check_claude_running "president"; then
        log_info "✅ PRESIDENT認証が完了しました"
    else
        log_warn "認証状態を確認できませんでした。続行しますか？ (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo ""
    
    # Step 2: Multiagent起動
    echo "📋 Step 2: Multiagent一括起動"
    echo "============================="
    log_info "boss1とworker1-3を起動します"
    
    # 各ペインでclaude起動
    for i in {0..3}; do
        pane_name=""
        case $i in
            0) pane_name="boss1" ;;
            1) pane_name="worker1" ;;
            2) pane_name="worker2" ;;
            3) pane_name="worker3" ;;
        esac
        
        log_info "起動中: $pane_name (pane $i)"
        tmux send-keys -t "multiagent:0.$i" 'claude' C-m
        sleep 0.5
    done
    
    echo ""
    log_info "✅ 全エージェントの起動が完了しました"
    echo ""
    
    # 使用方法の表示
    echo "📋 次のステップ:"
    echo "================"
    echo ""
    echo "1. PRESIDENTセッションにアタッチ:"
    echo "   tmux attach-session -t president"
    echo ""
    echo "2. 以下のメッセージを入力してデモ開始:"
    echo "   あなたはpresidentです。指示書に従って"
    echo ""
    echo "3. multiagentセッションで動作確認:"
    echo "   tmux attach-session -t multiagent"
    echo ""
    echo "💡 ヒント: tmuxでウィンドウ切り替え"
    echo "   - Ctrl+b → d: デタッチ"
    echo "   - Ctrl+b → [: スクロールモード"
    echo "   - Ctrl+b → 0-3: ペイン切り替え（multiagent内）"
    echo ""
    
    return 0
}

# 実行
main "$@"