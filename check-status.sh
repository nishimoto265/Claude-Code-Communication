#!/bin/bash

# 🔍 Multi-Agent状態確認スクリプト

set -euo pipefail

# 色定義
COLOR_GREEN='\033[1;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[1;31m'
COLOR_BLUE='\033[1;34m'
COLOR_MAGENTA='\033[1;35m'
COLOR_RESET='\033[0m'

# ログ関数
log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $1"
}

log_warn() {
    echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

# セッション状態表示
show_session_status() {
    echo "📊 Tmuxセッション状態"
    echo "===================="
    
    # presidentセッション
    echo -e "\n${COLOR_MAGENTA}PRESIDENTセッション:${COLOR_RESET}"
    if tmux has-session -t president 2>/dev/null; then
        log_success "president - 起動中"
        # Claude起動確認
        if tmux capture-pane -t president -p | tail -10 | grep -q -E "(Claude|claude)"; then
            echo "   └─ Claude: 起動済み"
        else
            echo "   └─ Claude: 未起動"
        fi
    else
        log_error "president - 未作成"
    fi
    
    # multiagentセッション
    echo -e "\n${COLOR_RED}MULTIAGENTセッション:${COLOR_RESET}"
    if tmux has-session -t multiagent 2>/dev/null; then
        log_success "multiagent - 起動中"
        
        # 各ペインの状態
        local pane_names=("boss1" "worker1" "worker2" "worker3")
        for i in {0..3}; do
            if tmux capture-pane -t "multiagent:0.$i" -p &>/dev/null; then
                echo -n "   ├─ ${pane_names[$i]}: 存在"
                # Claude起動確認
                if tmux capture-pane -t "multiagent:0.$i" -p | tail -10 | grep -q -E "(Claude|claude)"; then
                    echo " (Claude起動済み)"
                else
                    echo " (Claude未起動)"
                fi
            else
                echo "   ├─ ${pane_names[$i]}: エラー"
            fi
        done
    else
        log_error "multiagent - 未作成"
    fi
}

# 作業ファイル状態
show_work_status() {
    echo -e "\n📁 作業ファイル状態"
    echo "=================="
    
    # tmpディレクトリ確認
    if [ -d "./tmp" ]; then
        log_success "./tmp ディレクトリ存在"
        
        # 完了ファイル確認
        local completed_workers=()
        for i in {1..3}; do
            if [ -f "./tmp/worker${i}_done.txt" ]; then
                completed_workers+=("worker$i")
            fi
        done
        
        if [ ${#completed_workers[@]} -gt 0 ]; then
            echo "   完了済みworker: ${completed_workers[*]}"
        else
            echo "   完了ファイルなし"
        fi
    else
        log_warn "./tmp ディレクトリが存在しません"
    fi
}

# ログ状態
show_log_status() {
    echo -e "\n📝 ログ状態"
    echo "==========="
    
    if [ -d "./logs" ] && [ -f "./logs/send_log.txt" ]; then
        log_success "送信ログ存在"
        local log_lines=$(wc -l < "./logs/send_log.txt" 2>/dev/null || echo "0")
        echo "   └─ 記録数: ${log_lines}行"
        
        # 最新5件表示
        if [ "$log_lines" -gt 0 ]; then
            echo -e "\n   最新5件のメッセージ:"
            tail -5 "./logs/send_log.txt" | while IFS= read -r line; do
                echo "     $line"
            done
        fi
    else
        log_warn "送信ログなし"
    fi
}

# システム情報
show_system_info() {
    echo -e "\n💻 システム情報"
    echo "=============="
    
    # tmuxバージョン
    if command -v tmux &>/dev/null; then
        local tmux_version=$(tmux -V)
        echo "   tmux: $tmux_version"
    else
        echo "   tmux: 未インストール"
    fi
    
    # Claude CLIバージョン
    if command -v claude &>/dev/null; then
        echo "   claude: $(which claude)"
    else
        echo "   claude: 未インストール"
    fi
    
    # 作業ディレクトリ
    echo "   作業Dir: $(pwd)"
}

# クイックアクション提案
show_quick_actions() {
    echo -e "\n⚡ クイックアクション"
    echo "==================="
    
    # セッション未作成の場合
    if ! tmux has-session -t president 2>/dev/null || ! tmux has-session -t multiagent 2>/dev/null; then
        echo "1. 環境構築: ./setup.sh"
    else
        echo "1. Claude起動: ./start-agents.sh"
    fi
    
    echo "2. メッセージ送信: ./agent-send.sh [エージェント] \"[メッセージ]\""
    echo "3. セッションアタッチ:"
    echo "   - tmux attach -t president"
    echo "   - tmux attach -t multiagent"
    
    # 完了ファイルがある場合
    if ls ./tmp/worker*_done.txt 2>/dev/null | grep -q .; then
        echo "4. 完了ファイルクリア: rm -f ./tmp/worker*_done.txt"
    fi
}

# メイン処理
main() {
    echo "🔍 Multi-Agent Communication 状態確認"
    echo "====================================="
    echo "実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    show_session_status
    show_work_status
    show_log_status
    show_system_info
    show_quick_actions
    
    echo -e "\n✅ 状態確認完了"
}

# 実行
main "$@"