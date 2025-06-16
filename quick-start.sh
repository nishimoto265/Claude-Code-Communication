#!/bin/bash

# 🚀 Quick Start - ワンコマンド環境構築・起動システム
# git clone 後の完全自動セットアップ

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
log_header() { echo -e "${COLOR_MAGENTA}[QUICK-START]${COLOR_RESET} $1"; }

# 設定
DEFAULT_SCENARIO="business-strategy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 使用方法
show_usage() {
    cat << 'EOF'
🚀 Quick Start - ワンコマンド環境構築・起動システム

使用方法:
  ./quick-start.sh [シナリオ名] [オプション]

シナリオ（省略時: business-strategy）:
  hello-world                  基本的なHello Worldデモ
  business-strategy           事業戦略ディスカッション  
  collaborative-coding        共同コーディング
  market-analysis             市場分析・競合調査
  product-development         プロダクト開発

オプション:
  --no-claude                 Claude起動をスキップ
  --check-only                依存関係チェックのみ
  --verbose                   詳細ログを表示
  -h, --help                  この使用方法を表示

機能:
  ✅ 依存関係の自動チェック・インストール案内
  ✅ tmux環境の自動構築
  ✅ シナリオ別エージェント配置
  ✅ Claude Code自動起動（オプション）
  ✅ 初期コマンドの自動実行

使用例:
  ./quick-start.sh                              # business-strategy で開始
  ./quick-start.sh hello-world                  # Hello World デモ
  ./quick-start.sh market-analysis --no-claude  # Claude起動なし
  ./quick-start.sh --check-only                 # チェックのみ

git clone直後の推奨手順:
  1. git clone <repository>
  2. cd <repository>
  3. ./quick-start.sh
  4. 自動で環境構築・起動完了 🎉
EOF
}

# 依存関係チェック・インストール案内
check_and_setup_dependencies() {
    log_header "🔍 依存関係チェック中..."
    
    local missing_deps=()
    local recommendations=()
    
    # tmuxの確認
    if ! command -v tmux >/dev/null 2>&1; then
        missing_deps+=("tmux")
        case "$(uname)" in
            "Darwin") recommendations+=("brew install tmux") ;;
            "Linux") 
                if command -v apt >/dev/null 2>&1; then
                    recommendations+=("sudo apt update && sudo apt install tmux")
                elif command -v yum >/dev/null 2>&1; then
                    recommendations+=("sudo yum install tmux")
                elif command -v dnf >/dev/null 2>&1; then
                    recommendations+=("sudo dnf install tmux")
                else
                    recommendations+=("# お使いのLinuxディストリビューションでtmuxをインストールしてください")
                fi
                ;;
            *) recommendations+=("# お使いのOSでtmuxをインストールしてください") ;;
        esac
    fi
    
    # Claude CLIの確認
    if ! command -v claude >/dev/null 2>&1; then
        missing_deps+=("claude")
        recommendations+=("# Claude Code CLI をインストールしてください")
        recommendations+=("# https://claude.ai/code からダウンロード可能")
    fi
    
    # 設定ファイルの確認
    if [[ ! -f "./config.yaml" ]]; then
        log_error "設定ファイル config.yaml が見つかりません"
        log_info "このスクリプトはプロジェクトルートディレクトリから実行してください"
        exit 1
    fi
    
    # 必須スクリプトの確認
    local required_scripts=("scenario-manager.sh" "agent-send.sh")
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "./$script" ]]; then
            log_error "必須スクリプト $script が見つかりません"
            exit 1
        fi
        
        if [[ ! -x "./$script" ]]; then
            log_info "$script に実行権限を付与中..."
            chmod +x "./$script"
        fi
    done
    
    # 依存関係レポート
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "以下の依存関係が不足しています:"
        for dep in "${missing_deps[@]}"; do
            echo "  ❌ $dep"
        done
        echo ""
        log_info "インストールコマンド:"
        for rec in "${recommendations[@]}"; do
            echo -e "  ${COLOR_CYAN}$rec${COLOR_RESET}"
        done
        echo ""
        log_warning "依存関係をインストール後、再度実行してください"
        exit 1
    else
        log_success "✅ 全ての依存関係が満たされています"
    fi
    
    # ディレクトリ構造の確認・作成
    log_info "📁 ディレクトリ構造を確認中..."
    mkdir -p ./tmp
    mkdir -p ./logs
    mkdir -p ./scenarios
    
    log_success "✅ 依存関係チェック完了"
}

# 引数解析
parse_arguments() {
    SCENARIO=""
    SKIP_CLAUDE=false
    CHECK_ONLY=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-claude)
                SKIP_CLAUDE=true
                shift
                ;;
            --check-only)
                CHECK_ONLY=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log_error "未知のオプション: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$SCENARIO" ]]; then
                    SCENARIO="$1"
                else
                    log_error "複数のシナリオが指定されました: $SCENARIO, $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # デフォルトシナリオ設定
    if [[ -z "$SCENARIO" ]]; then
        SCENARIO="$DEFAULT_SCENARIO"
    fi
    
    # 詳細ログ設定
    if [[ "$VERBOSE" == true ]]; then
        set -x
    fi
}

# シナリオ妥当性チェック
validate_scenario() {
    local valid_scenarios=("hello-world" "business-strategy" "collaborative-coding" "market-analysis" "product-development")
    
    for valid in "${valid_scenarios[@]}"; do
        if [[ "$SCENARIO" == "$valid" ]]; then
            return 0
        fi
    done
    
    log_error "無効なシナリオ: $SCENARIO"
    log_info "利用可能シナリオ: ${valid_scenarios[*]}"
    exit 1
}

# 環境構築
setup_environment() {
    log_header "🏗️ 環境構築開始: $SCENARIO"
    
    # scenario-manager.sh を使用してシナリオ設定
    if [[ -x "./scenario-manager.sh" ]]; then
        log_info "シナリオマネージャーを使用して環境構築中..."
        ./scenario-manager.sh set "$SCENARIO"
    else
        log_error "scenario-manager.sh が見つからないか実行可能でありません"
        exit 1
    fi
    
    log_success "✅ 環境構築完了"
}

# Claude Code起動
start_claude_agents() {
    if [[ "$SKIP_CLAUDE" == true ]]; then
        log_info "⏭️ Claude起動をスキップしました"
        return 0
    fi
    
    log_header "🤖 Claude Code起動中..."
    
    # start-agents.shが存在すれば使用
    if [[ -x "./start-agents.sh" ]]; then
        log_info "start-agents.sh を使用してClaude起動中..."
        ./start-agents.sh
    else
        # 手動でClaude起動案内
        log_info "Claude Code を手動で起動してください"
        
        # シナリオ別の起動コマンド案内
        case "$SCENARIO" in
            "hello-world")
                echo ""
                echo "📋 起動コマンド:"
                echo "  # President認証"
                echo "  tmux send-keys -t president 'claude' C-m"
                echo ""
                echo "  # 認証後、multiagent一括起動"
                echo "  for i in {0..3}; do tmux send-keys -t multiagent:0.\$i 'claude' C-m; done"
                ;;
            "business-strategy")
                echo ""
                echo "📋 起動コマンド:"
                echo "  # Strategy team 認証 (最初のCEOで認証)"
                echo "  tmux send-keys -t strategy:0.0 'claude' C-m"
                echo ""
                echo "  # 認証後、全エージェント一括起動"
                echo "  for i in {0..3}; do tmux send-keys -t strategy:0.\$i 'claude' C-m; done"
                echo "  for i in {0..1}; do tmux send-keys -t analysis:0.\$i 'claude' C-m; done"
                ;;
            *)
                echo ""
                echo "📋 手動起動が必要です"
                echo "  各tmuxペインで 'claude' コマンドを実行してください"
                ;;
        esac
    fi
    
    log_success "✅ Claude起動完了"
}

# 初期コマンド実行案内
show_initial_commands() {
    log_header "🎯 シナリオ開始ガイド"
    
    case "$SCENARIO" in
        "hello-world")
            echo ""
            echo "📋 Hello World デモ開始手順:"
            echo "  1. PRESIDENTセッションにアタッチ:"
            echo "     tmux attach-session -t president"
            echo ""
            echo "  2. 以下のコマンドを入力:"
            echo "     あなたはpresidentです。指示書に従って"
            echo ""
            echo "  3. 自動的にマルチエージェント通信が開始されます"
            ;;
        "business-strategy")
            echo ""
            echo "📋 Business Strategy 開始手順:"
            echo "  1. Strategyセッションにアタッチ:"
            echo "     tmux attach-session -t strategy"
            echo ""
            echo "  2. CEOペイン（左上）で以下のコマンドを入力:"
            echo "     あなたはCEOです。新しい事業戦略について議論を開始してください"
            echo ""
            echo "  3. 各エージェントが専門分野で貢献します:"
            echo "     • CTO: 技術的実現可能性"
            echo "     • CFO: 財務的影響とROI"
            echo "     • マーケティング責任者: 市場機会"
            echo "     • プロダクトマネージャー: プロダクト戦略"
            echo "     • データアナリスト: 定量的分析"
            ;;
        *)
            echo ""
            echo "📋 シナリオ $SCENARIO の開始手順は準備中です"
            echo "  適切なエージェントで初期コマンドを実行してください"
            ;;
    esac
}

# 環境状態確認
show_environment_status() {
    log_header "📊 環境状態確認"
    
    # tmuxセッション状態
    echo ""
    echo "🖥️ Tmux Sessions:"
    if tmux list-sessions 2>/dev/null; then
        echo ""
    else
        log_warning "tmuxセッションが見つかりません"
        return 1
    fi
    
    # 現在のシナリオ
    if [[ -x "./scenario-manager.sh" ]]; then
        echo "🎭 シナリオ状態:"
        ./scenario-manager.sh current
        echo ""
    fi
    
    # 利用可能なツール
    echo "🛠️ 利用可能ツール:"
    echo "  ./scenario-manager.sh    - シナリオ管理"
    echo "  ./agent-send.sh          - エージェント間通信"
    echo "  ./check-status.sh        - システム状態確認（存在する場合）"
    echo "  ./reset-environment.sh   - 環境リセット（存在する場合）"
    echo ""
}

# 最終案内
show_final_guidance() {
    log_success "🎉 Quick Start セットアップ完了！"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 QUICK START 完了 🚀                        ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  シナリオ: $SCENARIO"
    echo "║  ステータス: 準備完了                                            ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    
    show_initial_commands
    
    echo ""
    echo "📚 追加情報:"
    echo "  • システム状態確認: ./check-status.sh"
    echo "  • シナリオ切り替え: ./scenario-manager.sh set <シナリオ名>"
    echo "  • 環境リセット: ./reset-environment.sh"
    echo "  • ヘルプ: ./quick-start.sh --help"
    echo ""
    echo "🎯 Happy Multi-Agent Communication! 🤖✨"
}

# メイン処理
main() {
    # ヘッダー表示
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║            🚀 Quick Start - Multi-Agent System 🤖                ║"
    echo "║                ワンコマンド環境構築システム                      ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # 引数解析
    parse_arguments "$@"
    
    # 依存関係チェック
    check_and_setup_dependencies
    
    # チェックのみの場合は終了
    if [[ "$CHECK_ONLY" == true ]]; then
        log_success "✅ 依存関係チェック完了（チェックのみモード）"
        exit 0
    fi
    
    # シナリオ妥当性チェック
    validate_scenario
    
    # 環境構築
    setup_environment
    
    # Claude起動
    start_claude_agents
    
    # 環境状態確認
    show_environment_status
    
    # 最終案内
    show_final_guidance
}

# エラーハンドリング
trap 'log_error "予期しないエラーが発生しました（行 $LINENO）"' ERR

# スクリプト実行
main "$@"