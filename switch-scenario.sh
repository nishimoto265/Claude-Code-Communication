#!/bin/bash

# 🔄 Switch Scenario - 実行中シナリオ切り替えツール
# tmux環境を維持しながらシナリオを切り替える

set -euo pipefail

# 色定義
COLOR_GREEN='\033[1;32m'
COLOR_BLUE='\033[1;34m'
COLOR_RED='\033[1;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_MAGENTA='\033[1;35m'
COLOR_CYAN='\033[1;36m'
COLOR_RESET='\033[0m'

# ログ関数
log_info() { echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $1"; }
log_success() { echo -e "${COLOR_BLUE}[SUCCESS]${COLOR_RESET} $1"; }
log_warning() { echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"; }
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"; }
log_header() { echo -e "${COLOR_MAGENTA}[SWITCH]${COLOR_RESET} $1"; }

# 現在のシナリオファイル
CURRENT_SCENARIO_FILE="./tmp/current_scenario.txt"

# 使用方法
show_usage() {
    cat << 'EOF'
🔄 Switch Scenario - 実行中シナリオ切り替えツール

使用方法:
  ./switch-scenario.sh <新しいシナリオ名>
  ./switch-scenario.sh --list
  ./switch-scenario.sh --current

機能:
  ✅ Claude Code セッションを維持したままシナリオ切り替え
  ✅ エージェントマッピングの自動更新
  ✅ 指示書の動的切り替え
  ✅ 既存セッションの再利用（可能な場合）

シナリオ:
  hello-world          基本的なHello Worldデモ
  business-strategy    事業戦略ディスカッション
  collaborative-coding 共同コーディング
  market-analysis      市場分析・競合調査
  product-development  プロダクト開発

使用例:
  ./switch-scenario.sh business-strategy
  ./switch-scenario.sh hello-world
  ./switch-scenario.sh --current

注意事項:
  • 実行中のClaude Codeセッションは影響を受けません
  • エージェントマッピングのみが変更されます
  • 必要に応じて新しいtmuxセッションが作成されます
EOF
}

# 現在のシナリオ取得
get_current_scenario() {
    if [[ -f "$CURRENT_SCENARIO_FILE" ]]; then
        cat "$CURRENT_SCENARIO_FILE"
    else
        echo "none"
    fi
}

# 利用可能シナリオリスト
list_scenarios() {
    log_header "📋 利用可能シナリオ"
    echo ""
    
    local current=$(get_current_scenario)
    
    local scenarios=("hello-world" "business-strategy" "collaborative-coding" "market-analysis" "product-development")
    
    for scenario in "${scenarios[@]}"; do
        if [[ "$scenario" == "$current" ]]; then
            echo -e "  ${COLOR_CYAN}🎯 $scenario${COLOR_RESET} ${COLOR_GREEN}(現在)${COLOR_RESET}"
        else
            echo -e "  📦 $scenario"
        fi
        
        case $scenario in
            "hello-world")
                echo "     基本的なマルチエージェント通信デモ"
                ;;
            "business-strategy")
                echo "     事業戦略や経営方針を議論するシナリオ"
                ;;
            "collaborative-coding")
                echo "     複数の開発者でコーディングプロジェクトを進めるシナリオ"
                ;;
            "market-analysis")
                echo "     市場分析と競合調査を行うシナリオ"
                ;;
            "product-development")
                echo "     プロダクト開発チームでの協働シナリオ"
                ;;
        esac
        echo ""
    done
}

# 現在のシナリオ表示
show_current() {
    local current=$(get_current_scenario)
    if [[ "$current" == "none" ]]; then
        log_warning "現在設定されているシナリオはありません"
        log_info "シナリオを設定してください: ./scenario-manager.sh set <シナリオ名>"
    else
        log_info "現在のシナリオ: $current"
        
        # エージェント情報表示
        if [[ -x "./agent-send.sh" ]]; then
            echo ""
            ./agent-send.sh --scenario
        fi
    fi
}

# シナリオ妥当性チェック
validate_scenario() {
    local scenario="$1"
    local valid_scenarios=("hello-world" "business-strategy" "collaborative-coding" "market-analysis" "product-development")
    
    for valid in "${valid_scenarios[@]}"; do
        if [[ "$scenario" == "$valid" ]]; then
            return 0
        fi
    done
    
    log_error "無効なシナリオ: $scenario"
    log_info "利用可能シナリオ: ${valid_scenarios[*]}"
    return 1
}

# tmuxセッション存在確認
check_tmux_sessions() {
    local scenario="$1"
    local required_sessions=()
    
    case "$scenario" in
        "hello-world")
            required_sessions=("president" "multiagent")
            ;;
        "business-strategy")
            required_sessions=("strategy" "analysis")
            ;;
        "collaborative-coding")
            required_sessions=("development" "quality")
            ;;
        "market-analysis")
            required_sessions=("research" "analysis")
            ;;
        "product-development")
            required_sessions=("product")
            ;;
        *)
            log_warning "未知のシナリオ: $scenario"
            return 1
            ;;
    esac
    
    local missing_sessions=()
    for session in "${required_sessions[@]}"; do
        if ! tmux has-session -t "$session" 2>/dev/null; then
            missing_sessions+=("$session")
        fi
    done
    
    if [[ ${#missing_sessions[@]} -gt 0 ]]; then
        log_warning "以下のtmuxセッションが見つかりません: ${missing_sessions[*]}"
        return 1
    else
        log_success "必要なtmuxセッションが存在します: ${required_sessions[*]}"
        return 0
    fi
}

# シナリオ切り替え実行
switch_to_scenario() {
    local new_scenario="$1"
    local current_scenario=$(get_current_scenario)
    
    log_header "シナリオ切り替え: $current_scenario → $new_scenario"
    
    # 妥当性チェック
    if ! validate_scenario "$new_scenario"; then
        exit 1
    fi
    
    # 同じシナリオかチェック
    if [[ "$current_scenario" == "$new_scenario" ]]; then
        log_info "既に $new_scenario シナリオが設定されています"
        show_current
        return 0
    fi
    
    # tmuxセッション確認
    if check_tmux_sessions "$new_scenario"; then
        log_info "既存のtmuxセッションを再利用します"
        use_existing_sessions=true
    else
        log_info "新しいtmuxセッションを作成します"
        use_existing_sessions=false
    fi
    
    # シナリオ設定実行
    if [[ "$use_existing_sessions" == true ]]; then
        # エージェントマッピングのみ更新
        update_agent_mapping "$new_scenario"
    else
        # 完全な環境構築
        if [[ -x "./scenario-manager.sh" ]]; then
            log_info "scenario-manager.sh を使用して環境構築中..."
            ./scenario-manager.sh set "$new_scenario"
        else
            log_error "scenario-manager.sh が見つかりません"
            exit 1
        fi
    fi
    
    # 現在のシナリオ更新
    echo "$new_scenario" > "$CURRENT_SCENARIO_FILE"
    
    log_success "シナリオ切り替え完了: $new_scenario"
    
    # 切り替え後の状態表示
    echo ""
    show_current
    
    # 次のステップ案内
    echo ""
    log_info "📋 次のステップ:"
    echo "  1. エージェント確認: ./agent-send.sh --list"
    echo "  2. システム状態確認: ./check-status.sh"
    echo "  3. メッセージ送信: ./agent-send.sh <エージェント名> \"<メッセージ>\""
}

# エージェントマッピング更新（既存セッション用）
update_agent_mapping() {
    local scenario="$1"
    
    log_info "エージェントマッピングを更新中..."
    
    # scenario-manager.shの機能を直接呼び出し
    if [[ -x "./scenario-manager.sh" ]]; then
        # エージェントマッピング生成のみ実行
        generate_agent_mapping_for_scenario "$scenario"
    else
        log_error "scenario-manager.sh が見つかりません"
        exit 1
    fi
    
    log_success "エージェントマッピング更新完了"
}

# シナリオ別エージェントマッピング生成
generate_agent_mapping_for_scenario() {
    local scenario="$1"
    
    case "$scenario" in
        "hello-world")
            cat > ./tmp/agent_mapping.sh << 'EOF'
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
EOF
            ;;
        "business-strategy")
            cat > ./tmp/agent_mapping.sh << 'EOF'
get_agent_target() {
    case "$1" in
        "ceo") echo "strategy:strategy-team.1" ;;
        "cto") echo "strategy:strategy-team.2" ;;
        "cfo") echo "strategy:strategy-team.3" ;;
        "marketing_director") echo "strategy:strategy-team.4" ;;
        "product_manager") echo "analysis:analysis-team.1" ;;
        "data_analyst") echo "analysis:analysis-team.2" ;;
        *) echo "" ;;
    esac
}
EOF
            ;;
        "collaborative-coding")
            cat > ./tmp/agent_mapping.sh << 'EOF'
get_agent_target() {
    case "$1" in
        "architect") echo "development:0.0" ;;
        "frontend_dev") echo "development:0.1" ;;
        "backend_dev") echo "development:0.2" ;;
        "devops") echo "development:0.3" ;;
        "qa_engineer") echo "quality:0.0" ;;
        "tech_lead") echo "quality:0.1" ;;
        *) echo "" ;;
    esac
}
EOF
            ;;
        "market-analysis")
            cat > ./tmp/agent_mapping.sh << 'EOF'
get_agent_target() {
    case "$1" in
        "market_researcher") echo "research:0.0" ;;
        "competitive_analyst") echo "research:0.1" ;;
        "consumer_insights") echo "research:0.2" ;;
        "trend_analyst") echo "research:0.3" ;;
        "business_analyst") echo "analysis:0.0" ;;
        "strategy_consultant") echo "analysis:0.1" ;;
        *) echo "" ;;
    esac
}
EOF
            ;;
        "product-development")
            cat > ./tmp/agent_mapping.sh << 'EOF'
get_agent_target() {
    case "$1" in
        "product_owner") echo "product:0.0" ;;
        "ux_designer") echo "product:0.1" ;;
        "ui_designer") echo "product:0.2" ;;
        "user_researcher") echo "product:0.3" ;;
        *) echo "" ;;
    esac
}
EOF
            ;;
        *)
            log_error "未対応のシナリオ: $scenario"
            exit 1
            ;;
    esac
}

# メイン処理
main() {
    # 引数チェック
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    local command="$1"
    
    case "$command" in
        "--list")
            list_scenarios
            ;;
        "--current")
            show_current
            ;;
        "-h"|"--help"|"help")
            show_usage
            ;;
        *)
            # シナリオ名として解釈
            switch_to_scenario "$command"
            ;;
    esac
}

# 初期化
mkdir -p ./tmp

# スクリプト実行
main "$@"