#!/usr/bin/env bash

# 🚀 Agent間メッセージ送信スクリプト

# スクリプトの場所を基準にパスを解決する
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# ログファイルをスクリプトからの相対パスで指定
LOG_FILE="$SCRIPT_DIR/logs/send_log.txt"

# ログディレクトリが存在しない場合は作成
mkdir -p "$(dirname "$LOG_FILE")"

# エージェント→tmuxターゲット マッピング
get_agent_target() {
    case "$1" in
        "president") echo "chimera:0.0" ;;
        "worker1") echo "chimera:0.1" ;;
        "worker2") echo "chimera:0.2" ;;
        "worker3") echo "chimera:0.3" ;;
        "worker4") echo "chimera:0.4" ;;
        "worker5") echo "chimera:0.5" ;;
        "worker6") echo "chimera:0.6" ;;
        *) return 1 ;;
    esac
}

show_usage() {
    cat << EOF
🤖 Agent間メッセージ送信

使用方法:
  $0 [エージェント名] [メッセージ]
  $0 --list

利用可能エージェント:
  president - プロジェクト統括責任者
  worker1   - 実行担当者A
  worker2   - 実行担当者B
  worker3   - 実行担当者C
  worker4   - 実行担当者D
  worker5   - 実行担当者E
  worker6   - 実行担当者F
  all_workers - 全ての実行担当者

使用例:
  $0 president "指示書に従って"
  $0 worker1 "作業完了しました"
  $0 all_workers "注意: 全ての実行担当者に通知"
EOF
}

# エージェント一覧表示
show_agents() {
    echo "📋 利用可能なエージェント:"
    echo "=========================="
    echo "  president → chimera:0.0     (プロジェクト統括責任者)"
    echo "  worker1   → chimera:0.1     (実行担当者A)"
    echo "  worker2   → chimera:0.2     (実行担当者B)" 
    echo "  worker3   → chimera:0.3     (実行担当者C)"
    echo "  worker4   → chimera:0.4     (実行担当者D)"
    echo "  worker5   → chimera:0.5     (実行担当者E)"
    echo "  worker6   → chimera:0.6     (実行担当者F)"
    echo "  all_workers → 全ての実行担当者"
}

# ログ記録
log_send() {
    local agent="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] $agent: SENT - \"$message\"" >> "$LOG_FILE"
}

# メッセージ送信
send_message() {
    local target="$1"
    local message="$2"
    
    echo "📤 送信中: $target ← '$message'"
    
    # Claude Codeのプロンプトを一度クリア
    tmux send-keys -t "$target" C-c
    sleep 0.3
    
    # メッセージ送信
    tmux send-keys -t "$target" "$message"
    sleep 0.1
    
    # エンター押下
    tmux send-keys -t "$target" C-m
    sleep 0.5
}

# ターゲット存在確認
check_target() {
    local target="$1"
    local session_name="${target%%:*}"
    
    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "❌ セッション '$session_name' が見つかりません"
        return 1
    fi
    
    return 0
}

# メイン処理
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    # --listオプション
    if [[ "$1" == "--list" ]]; then
        show_agents
        exit 0
    fi
    
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi
    
    local agent_name="$1"
    local message="$2"
    
    # all_workersへの対応
    if [ "$agent_name" = "all_workers" ]; then
        echo "Sending to all workers..."
        for i in {1..6}; do
            TARGET=$(get_agent_target "worker$i")
            # メッセージ送信
            send_message "$TARGET" "$message"
            # ログ記録
            log_send "all_workers" "$message"
        done
        echo "Messages sent to all workers."
        exit 0
    fi
    
    # エージェントターゲット取得
    local target
    target=$(get_agent_target "$agent_name")
    
    if [[ -z "$target" ]]; then
        echo "❌ エラー: 不明なエージェント '$agent_name'"
        echo "利用可能エージェント: $0 --list"
        exit 1
    fi
    
    # ターゲット確認
    if ! check_target "$target"; then
        exit 1
    fi
    
    # メッセージ送信
    send_message "$target" "$message"
    
    # ログ記録
    log_send "$agent_name" "$message"
    
    echo "✅ 送信完了: $agent_name に '$message'"
    
    return 0
}

main "$@" 