#!/bin/bash

# 🎭 Scenario Manager - シナリオ管理システム
# ユースケース別のエージェント構成を管理・切り替える

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

# 設定ファイル
CONFIG_FILE="./config.yaml"
CURRENT_SCENARIO_FILE="./tmp/current_scenario.txt"

# 現在のスクリプトディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法
show_usage() {
    cat << 'EOF'
🎭 Scenario Manager - シナリオ管理システム

使用方法:
  ./scenario-manager.sh <コマンド> [オプション]

コマンド:
  list                          利用可能シナリオの一覧表示
  show <シナリオ名>            シナリオの詳細表示
  set <シナリオ名>             シナリオの設定（tmux環境構築）
  current                      現在のシナリオ表示
  agents                       現在のエージェント一覧
  reset                        設定リセット

利用可能シナリオ:
  hello-world                  基本的なHello Worldデモ
  business-strategy            事業戦略ディスカッション
  collaborative-coding         共同コーディング
  market-analysis              市場分析・競合調査
  product-development          プロダクト開発

使用例:
  ./scenario-manager.sh list
  ./scenario-manager.sh show business-strategy
  ./scenario-manager.sh set business-strategy
  ./scenario-manager.sh current
EOF
}

# 依存関係チェック
check_dependencies() {
    local missing_deps=()
    
    # tmuxの確認
    if ! command -v tmux >/dev/null 2>&1; then
        missing_deps+=("tmux")
    fi
    
    # config.yamlの確認
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "設定ファイル $CONFIG_FILE が見つかりません"
        exit 1
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "以下の依存関係が不足しています: ${missing_deps[*]}"
        echo "インストールコマンド:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                tmux) echo "  brew install tmux  # macOS" ;;
                *) echo "  $dep をインストールしてください" ;;
            esac
        done
        exit 1
    fi
}

# 設定ディレクトリの初期化
init_config_dirs() {
    mkdir -p ./tmp
    mkdir -p ./logs
}

# 簡易YAMLパーサー（基本的なキー値の取得）
get_yaml_value() {
    local file="$1"
    local key="$2"
    
    # ネストしたキーに対応（例: scenarios.business-strategy.name）
    if [[ "$key" == *"."* ]]; then
        # ネストされたキーの処理は簡略化
        grep -A 20 "^scenarios:" "$file" | grep -A 10 "${key#*.}:" | head -5
    else
        grep "^$key:" "$file" | cut -d':' -f2- | sed 's/^ *//' | sed 's/"//'
    fi
}

# シナリオ一覧の表示
list_scenarios() {
    log_info "📋 利用可能なシナリオ"
    echo "=================================="
    echo ""
    
    # config.yamlからシナリオ情報を抽出
    local scenarios=("hello-world" "business-strategy" "collaborative-coding" "market-analysis" "product-development")
    
    for scenario in "${scenarios[@]}"; do
        echo -e "${COLOR_CYAN}🎯 $scenario${COLOR_RESET}"
        case $scenario in
            "hello-world")
                echo "   基本的なマルチエージェント通信デモ"
                echo "   エージェント: president, boss1, worker1-3"
                ;;
            "business-strategy")
                echo "   事業戦略や経営方針を議論するシナリオ"
                echo "   エージェント: ceo, cto, cfo, marketing_director, product_manager, data_analyst"
                ;;
            "collaborative-coding")
                echo "   複数の開発者でコーディングプロジェクトを進めるシナリオ"
                echo "   エージェント: architect, frontend_dev, backend_dev, devops, qa_engineer, tech_lead"
                ;;
            "market-analysis")
                echo "   市場分析と競合調査を行うシナリオ"
                echo "   エージェント: market_researcher, competitive_analyst, consumer_insights, etc."
                ;;
            "product-development")
                echo "   プロダクト開発チームでの協働シナリオ"
                echo "   エージェント: product_owner, ux_designer, ui_designer, user_researcher"
                ;;
        esac
        echo ""
    done
}

# シナリオの詳細表示
show_scenario() {
    local scenario="$1"
    
    if [[ -z "$scenario" ]]; then
        log_error "シナリオ名を指定してください"
        exit 1
    fi
    
    log_info "🎯 シナリオ詳細: $scenario"
    echo "=================================="
    echo ""
    
    case "$scenario" in
        "hello-world")
            echo "📝 名前: Hello World Demo"
            echo "📖 説明: 基本的なマルチエージェント通信デモ"
            echo ""
            echo "👥 エージェント構成:"
            echo "  president    - プロジェクト統括責任者 (magenta)"
            echo "  boss1        - チームリーダー (red)"
            echo "  worker1-3    - 実行担当者 (blue)"
            echo ""
            echo "🖥️  tmuxセッション:"
            echo "  president: 1ペイン"
            echo "  multiagent: 4ペイン (2x2グリッド)"
            echo ""
            echo "🚀 初期コマンド:"
            echo "  「あなたはpresidentです。指示書に従って」"
            ;;
        "business-strategy")
            echo "📝 名前: Business Strategy Discussion"
            echo "📖 説明: 事業戦略や経営方針を議論するためのシナリオ"
            echo ""
            echo "👥 エージェント構成:"
            echo "  【戦略チーム (strategy セッション)】"
            echo "  ceo                  - 最高経営責任者 (magenta)"
            echo "  cto                  - 最高技術責任者 (cyan)"
            echo "  cfo                  - 最高財務責任者 (yellow)"
            echo "  marketing_director   - マーケティング責任者 (green)"
            echo ""
            echo "  【分析チーム (analysis セッション)】"
            echo "  product_manager      - プロダクトマネージャー (blue)"
            echo "  data_analyst         - データアナリスト (red)"
            echo ""
            echo "🖥️  tmuxセッション:"
            echo "  strategy: 4ペイン (2x2グリッド)"
            echo "  analysis: 2ペイン (1x2水平分割)"
            echo ""
            echo "🚀 初期コマンド:"
            echo "  「あなたはCEOです。新しい事業戦略について議論を開始してください」"
            ;;
        *)
            log_error "未知のシナリオ: $scenario"
            log_info "利用可能シナリオ: ./scenario-manager.sh list"
            exit 1
            ;;
    esac
}

# エージェント→tmuxターゲットのマッピング生成
generate_agent_mapping() {
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
        *)
            log_error "未対応のシナリオ: $scenario"
            exit 1
            ;;
    esac
}

# シナリオの設定（tmux環境構築）
set_scenario() {
    local scenario="$1"
    
    if [[ -z "$scenario" ]]; then
        log_error "シナリオ名を指定してください"
        exit 1
    fi
    
    # 対応シナリオのチェック
    case "$scenario" in
        "hello-world"|"business-strategy"|"collaborative-coding"|"market-analysis"|"product-development")
            ;;
        *)
            log_error "未対応のシナリオ: $scenario"
            log_info "利用可能シナリオ: ./scenario-manager.sh list"
            exit 1
            ;;
    esac
    
    log_info "🎭 シナリオ設定開始: $scenario"
    
    # 現在のシナリオを保存
    echo "$scenario" > "$CURRENT_SCENARIO_FILE"
    
    # エージェントマッピング生成
    generate_agent_mapping "$scenario"
    
    # シナリオ別のtmux環境構築
    case "$scenario" in
        "hello-world")
            setup_hello_world_environment
            ;;
        "business-strategy")
            setup_business_strategy_environment
            ;;
        *)
            log_warning "シナリオ $scenario の環境構築は未実装です"
            log_info "既存のsetup.shを使用してください"
            ;;
    esac
    
    log_success "✅ シナリオ設定完了: $scenario"
    
    # 次のステップを案内
    echo ""
    echo "📋 次のステップ:"
    echo "  1. Claude Code起動: ./start-agents.sh"
    echo "  2. 状態確認: ./check-status.sh"
    echo "  3. シナリオ開始: 適切なエージェントで初期コマンドを実行"
}

# Hello Worldシナリオの環境構築
setup_hello_world_environment() {
    log_info "Hello World環境を構築中..."
    
    # 既存のsetup.shを利用
    if [[ -x "./setup.sh" ]]; then
        ./setup.sh
    else
        log_error "setup.sh が見つからないか実行可能でありません"
        exit 1
    fi
}

# Business Strategyシナリオの環境構築
setup_business_strategy_environment() {
    log_info "Business Strategy環境を構築中..."
    
    # 既存セッションの削除
    tmux kill-session -t strategy 2>/dev/null && log_info "strategyセッション削除完了" || log_info "strategyセッションは存在しませんでした"
    tmux kill-session -t analysis 2>/dev/null && log_info "analysisセッション削除完了" || log_info "analysisセッションは存在しませんでした"
    
    # 完了ファイルクリア
    rm -f ./tmp/*_done.txt 2>/dev/null
    
    # strategyセッション作成（4ペイン：ceo, cto, cfo, marketing_director）
    log_info "📺 strategyセッション作成 (4ペイン)..."
    tmux new-session -d -s strategy -n "strategy-team"
    
    # 2x2グリッド作成
    tmux split-window -h -t strategy:strategy-team
    tmux select-pane -t strategy:strategy-team.1
    tmux split-window -v
    tmux select-pane -t strategy:strategy-team.2
    tmux split-window -v
    
    # ペインタイトル設定
    local strategy_titles=("ceo" "cto" "cfo" "marketing_director")
    local strategy_colors=(201 51 226 46)  # magenta, cyan, yellow, green
    
    for i in {0..3}; do
        local pane_num=$((i + 1))  # tmuxペイン番号は1から開始
        tmux select-pane -t "strategy:strategy-team.$pane_num" -T "${strategy_titles[$i]}"
        tmux send-keys -t "strategy:strategy-team.$pane_num" "cd $(pwd)" C-m
        
        # カラープロンプト設定（遅延実行）
        sleep 0.1  # tmux準備待ち
        set_agent_prompt "strategy:strategy-team.$pane_num" "${strategy_titles[$i]}" "${strategy_colors[$i]}" 2>/dev/null || echo "プロンプト設定スキップ: ${strategy_titles[$i]}"
        
        # ウェルカムメッセージ
        tmux send-keys -t "strategy:strategy-team.$pane_num" "echo '=== ${strategy_titles[$i]} エージェント ==='" C-m
    done
    
    # analysisセッション作成（2ペイン：product_manager, data_analyst）
    log_info "📊 analysisセッション作成 (2ペイン)..."
    tmux new-session -d -s analysis -n "analysis-team"
    
    # 水平分割
    tmux split-window -h -t analysis:analysis-team
    
    # ペインタイトル設定
    local analysis_titles=("product_manager" "data_analyst")
    local analysis_colors=(21 196)  # blue, red
    
    for i in {0..1}; do
        local pane_num=$((i + 1))  # tmuxペイン番号は1から開始
        tmux select-pane -t "analysis:analysis-team.$pane_num" -T "${analysis_titles[$i]}"
        tmux send-keys -t "analysis:analysis-team.$pane_num" "cd $(pwd)" C-m
        
        # カラープロンプト設定（遅延実行）
        sleep 0.1  # tmux準備待ち
        set_agent_prompt "analysis:analysis-team.$pane_num" "${analysis_titles[$i]}" "${analysis_colors[$i]}" 2>/dev/null || echo "プロンプト設定スキップ: ${analysis_titles[$i]}"
        
        # ウェルカムメッセージ
        tmux send-keys -t "analysis:analysis-team.$pane_num" "echo '=== ${analysis_titles[$i]} エージェント ==='" C-m
    done
    
    log_success "✅ Business Strategy環境構築完了"
    
    # セッション情報表示
    echo ""
    echo "📊 セットアップ結果:"
    echo "==================="
    echo "📺 Tmux Sessions:"
    tmux list-sessions
    echo ""
    echo "📋 エージェント構成:"
    echo "  strategyセッション（4ペイン）:"
    echo "    Pane 0: ceo                  (最高経営責任者)"
    echo "    Pane 1: cto                  (最高技術責任者)"
    echo "    Pane 2: cfo                  (最高財務責任者)"
    echo "    Pane 3: marketing_director   (マーケティング責任者)"
    echo ""
    echo "  analysisセッション（2ペイン）:"
    echo "    Pane 0: product_manager      (プロダクトマネージャー)"
    echo "    Pane 1: data_analyst         (データアナリスト)"
}

# エージェントプロンプト設定
set_agent_prompt() {
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
        201) export PS1='(\\[\\033[1;35m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        51)  export PS1='(\\[\\033[1;36m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        226) export PS1='(\\[\\033[1;33m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        46)  export PS1='(\\[\\033[1;32m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        21)  export PS1='(\\[\\033[1;34m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
        196) export PS1='(\\[\\033[1;31m\\]$name\\[\\033[0m\\]) \\[\\033[1;32m\\]\\w\\[\\033[0m\\]\\$ ' ;;
    esac
else
    # その他のシェルの場合
    export PS1='($name) \\w\\$ '
fi
" C-m
}

# 現在のシナリオ表示
show_current_scenario() {
    if [[ -f "$CURRENT_SCENARIO_FILE" ]]; then
        local current=$(cat "$CURRENT_SCENARIO_FILE")
        log_info "📍 現在のシナリオ: $current"
        
        # エージェントマッピングがあれば表示
        if [[ -f "./tmp/agent_mapping.sh" ]]; then
            echo ""
            echo "👥 利用可能エージェント:"
            source ./tmp/agent_mapping.sh
            local agents=()
            case "$current" in
                "hello-world")
                    agents=("president" "boss1" "worker1" "worker2" "worker3")
                    ;;
                "business-strategy")
                    agents=("ceo" "cto" "cfo" "marketing_director" "product_manager" "data_analyst")
                    ;;
            esac
            
            for agent in "${agents[@]}"; do
                local target=$(get_agent_target "$agent")
                echo "  $agent → $target"
            done
        fi
    else
        log_warning "現在設定されているシナリオはありません"
        log_info "シナリオを設定してください: ./scenario-manager.sh set <シナリオ名>"
    fi
}

# エージェント一覧表示
show_agents() {
    show_current_scenario
}

# 設定リセット
reset_scenario() {
    log_info "🔄 設定をリセット中..."
    
    # tmuxセッション削除
    local sessions=("president" "multiagent" "strategy" "analysis" "development" "quality" "research" "product")
    for session in "${sessions[@]}"; do
        tmux kill-session -t "$session" 2>/dev/null && log_info "${session}セッション削除" || true
    done
    
    # 一時ファイル削除
    rm -f ./tmp/current_scenario.txt 2>/dev/null || true
    rm -f ./tmp/agent_mapping.sh 2>/dev/null || true
    rm -f ./tmp/*_done.txt 2>/dev/null || true
    
    log_success "✅ 設定リセット完了"
}

# メイン処理
main() {
    # 依存関係チェック
    check_dependencies
    
    # 設定ディレクトリ初期化
    init_config_dirs
    
    # 引数チェック
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        "list")
            list_scenarios
            ;;
        "show")
            show_scenario "$@"
            ;;
        "set")
            set_scenario "$@"
            ;;
        "current")
            show_current_scenario
            ;;
        "agents")
            show_agents
            ;;
        "reset")
            reset_scenario
            ;;
        "-h"|"--help"|"help")
            show_usage
            ;;
        *)
            log_error "未知のコマンド: $command"
            show_usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"