#!/bin/bash

# 🔄 環境完全リセットスクリプト

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

main() {
    echo "🔄 Multi-Agent Environment 完全リセット"
    echo "====================================="
    echo ""
    
    log_warn "この操作は以下を削除します："
    echo "  - multiagentセッション"
    echo "  - presidentセッション"
    echo "  - 作業ファイル (./tmp/worker*_done.txt)"
    echo "  - ログファイル (./logs/send_log.txt)"
    echo ""
    
    read -p "続行しますか？ (y/N): " -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "操作がキャンセルされました。"
        exit 0
    fi
    
    echo ""
    log_info "🧹 リセット開始..."
    
    # tmuxセッション削除
    log_info "tmuxセッション削除中..."
    tmux kill-session -t multiagent 2>/dev/null && log_info "✅ multiagentセッション削除" || log_info "multiagentセッションは存在しませんでした"
    tmux kill-session -t president 2>/dev/null && log_info "✅ presidentセッション削除" || log_info "presidentセッションは存在しませんでした"
    
    # 作業ファイル削除
    log_info "作業ファイル削除中..."
    if ls ./tmp/worker*_done.txt 1> /dev/null 2>&1; then
        rm -f ./tmp/worker*_done.txt
        log_info "✅ 完了ファイル削除"
    else
        log_info "完了ファイルは存在しませんでした"
    fi
    
    # ログファイル削除
    log_info "ログファイル削除中..."
    if [ -f "./logs/send_log.txt" ]; then
        rm -f ./logs/send_log.txt
        log_info "✅ 送信ログ削除"
    else
        log_info "送信ログは存在しませんでした"
    fi
    
    # 空ディレクトリ削除
    if [ -d "./logs" ] && [ -z "$(ls -A ./logs)" ]; then
        rmdir ./logs
        log_info "✅ 空のlogsディレクトリ削除"
    fi
    
    echo ""
    log_info "🎉 リセット完了！"
    echo ""
    echo "📋 次のステップ："
    echo "  1. 環境再構築: ./setup.sh"
    echo "  2. エージェント起動: ./start-agents.sh"
    echo "  3. 状態確認: ./check-status.sh"
    echo ""
}

main "$@"