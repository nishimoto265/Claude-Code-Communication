#!/bin/bash

# 🚀 Agent間メッセージ送信スクリプト（シナリオ対応版）

# 動的エージェントマッピングの読み込み
load_agent_mapping() {
    local mapping_file="./tmp/agent_mapping.sh"
    
    if [[ -f "$mapping_file" ]]; then
        source "$mapping_file"
        return 0
    else
        # フォールバック: デフォルトのhello-worldマッピング
        get_agent_target() {
            case "$1" in
                "president") echo "president" ;;
                "boss1") echo "multiagent:0.0" ;;
                "worker1") echo "multiagent:0.1" ;;
                "worker2") echo "multiagent:0.2" ;;
                "worker3") echo "multiagent:0.3" ;;
                *) echo "" ;;
            esac
        }
        return 1
    fi
}

# 現在のシナリオ情報を取得
get_current_scenario() {
    local scenario_file="./tmp/current_scenario.txt"
    if [[ -f "$scenario_file" ]]; then
        cat "$scenario_file"
    else
        echo "hello-world"
    fi
}

# 利用可能エージェントの説明取得
get_available_agents_description() {
    local scenario=$(get_current_scenario)
    case "$scenario" in
        "hello-world")
            echo "  president - プロジェクト統括責任者"
            echo "  boss1     - チームリーダー"
            echo "  worker1   - 実行担当者A"
            echo "  worker2   - 実行担当者B"
            echo "  worker3   - 実行担当者C"
            ;;
        "business-strategy")
            echo "  ceo                  - 最高経営責任者"
            echo "  cto                  - 最高技術責任者"
            echo "  cfo                  - 最高財務責任者"
            echo "  marketing_director   - マーケティング責任者"
            echo "  product_manager      - プロダクトマネージャー"
            echo "  data_analyst         - データアナリスト"
            ;;
        *)
            echo "  シナリオが設定されていません。./scenario-manager.sh set <シナリオ名> を実行してください"
            ;;
    esac
}

# メッセージ履歴表示
show_recent_logs() {
    if [ -f "logs/send_log.txt" ]; then
        echo "📝 最新メッセージ履歴（5件）:"
        echo "==========================="
        tail -5 logs/send_log.txt
        echo ""
    else
        echo "📝 メッセージ履歴がありません"
    fi
}

# シナリオ情報表示
show_scenario_info() {
    local scenario=$(get_current_scenario)
    echo "🎭 現在のシナリオ: $scenario"
    echo "=============================="
    echo ""
    echo "👥 利用可能エージェント:"
    get_available_agents_description
    echo ""
    
    # エージェントマッピング表示
    if [[ -f "./tmp/agent_mapping.sh" ]]; then
        echo "🔗 エージェント→tmuxターゲット マッピング:"
        load_agent_mapping
        case "$scenario" in
            "hello-world")
                local agents=("president" "boss1" "worker1" "worker2" "worker3")
                ;;
            "business-strategy")
                local agents=("ceo" "cto" "cfo" "marketing_director" "product_manager" "data_analyst")
                ;;
            *)
                echo "  マッピング情報が利用できません"
                return
                ;;
        esac
        
        for agent in "${agents[@]}"; do
            local target=$(get_agent_target "$agent")
            if [[ -n "$target" ]]; then
                echo "  $agent → $target"
            fi
        done
    else
        echo "⚠️  エージェントマッピングファイルが見つかりません"
        echo "   ./scenario-manager.sh set <シナリオ名> を実行してください"
    fi
    echo ""
}

show_usage() {
    cat << EOF
🤖 Agent間メッセージ送信

使用方法:
  $0 [エージェント名] [メッセージ]
  $0 --list
  $0 --history
  $0 --status
  $0 --scenario

現在のシナリオに応じた利用可能エージェント:
  $(get_available_agents_description)

使用例:
  # Hello Worldシナリオ
  $0 president "あなたはpresidentです。指示書に従って"
  $0 boss1 "Hello World プロジェクト開始指示"
  
  # Business Strategyシナリオ  
  $0 ceo "あなたはCEOです。新しい事業戦略について議論を開始してください"
  $0 cto "技術的な観点から提案をお願いします"

オプション:
  --history   最新メッセージ履歴を表示
  --scenario  現在のシナリオ情報を表示
  --status    システム状態確認（check-status.sh連携）
  --status   システム状態を表示
EOF
}

# エージェント一覧表示（シナリオ対応）
show_agents() {
    local scenario=$(get_current_scenario)
    echo "📋 利用可能なエージェント（シナリオ: $scenario）:"
    echo "================================================"
    
    # エージェントマッピング読み込み
    if load_agent_mapping; then
        case "$scenario" in
            "hello-world")
                local agents=("president" "boss1" "worker1" "worker2" "worker3")
                local descriptions=("プロジェクト統括責任者" "チームリーダー" "実行担当者A" "実行担当者B" "実行担当者C")
                ;;
            "business-strategy")
                local agents=("ceo" "cto" "cfo" "marketing_director" "product_manager" "data_analyst")
                local descriptions=("最高経営責任者" "最高技術責任者" "最高財務責任者" "マーケティング責任者" "プロダクトマネージャー" "データアナリスト")
                ;;
            *)
                echo "  未対応のシナリオ: $scenario"
                return
                ;;
        esac
        
        for i in "${!agents[@]}"; do
            local agent="${agents[$i]}"
            local desc="${descriptions[$i]}"
            local target=$(get_agent_target "$agent")
            if [[ -n "$target" ]]; then
                printf "  %-20s → %-15s (%s)\n" "$agent" "$target" "$desc"
            fi
        done
    else
        echo "  ⚠️  エージェントマッピングが見つかりません"
        echo "     ./scenario-manager.sh set <シナリオ名> を実行してください"
    fi
}

# ログ記録
log_send() {
    local agent="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p logs
    echo "[$timestamp] $agent: SENT - \"$message\"" >> logs/send_log.txt
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
    
    # オプション処理
    case "$1" in
        "--list")
            show_agents
            exit 0
            ;;
        "--history")
            show_recent_logs
            exit 0
            ;;
        "--scenario")
            show_scenario_info
            exit 0
            ;;
        "--status")
            if [[ -x "./check-status.sh" ]]; then
                echo "🔍 システム状態確認中..."
                ./check-status.sh
            else
                echo "⚠️  check-status.sh が見つかりません"
                show_scenario_info
            fi
            exit 0
            ;;
    esac
    
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi
    
    local agent_name="$1"
    local message="$2"
    
    # エージェントマッピング読み込み
    if ! load_agent_mapping; then
        echo "⚠️  エージェントマッピングが見つかりません。デフォルトマッピングを使用します。"
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