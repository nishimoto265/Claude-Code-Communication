# コマンドリファレンス

claude-agentsの全コマンドと詳細なオプションを説明します。

## 基本コマンド

### `claude-agents init`
プロジェクトの初期化を行います。

```bash
claude-agents init [options]
```

**オプション:**
- `-s, --scenario <type>`: 初期シナリオタイプ (デフォルト: business-strategy)
- `-f, --force`: 既存設定の上書き

**例:**
```bash
# デフォルトシナリオで初期化
claude-agents init

# 特定シナリオで初期化
claude-agents init --scenario hello-world

# 強制上書き
claude-agents init --force --scenario market-analysis
```

### `claude-agents start`
エージェントとtmuxセッションを起動します。

```bash
claude-agents start [scenario] [options]
```

**オプション:**
- `-p, --project <path>`: プロジェクトルートパス (デフォルト: .)
- `--no-claude`: Claude Code起動をスキップ

**例:**
```bash
# 現在のシナリオで起動
claude-agents start

# 特定シナリオで起動
claude-agents start business-strategy

# Claude Code起動なし
claude-agents start --no-claude
```

### `claude-agents send`
特定エージェントにメッセージを送信します。

```bash
claude-agents send <agent> <message> [options]
```

**オプション:**
- `-w, --wait <seconds>`: 送信後の待機時間 (デフォルト: 0.5)

**例:**
```bash
# 基本送信
claude-agents send ceo "戦略会議を開始してください"

# 待機時間指定
claude-agents send cto "技術レポートを作成してください" --wait 1.0

# 利用可能エージェント一覧
claude-agents send --list
```

### `claude-agents switch`
シナリオを切り替えます。

```bash
claude-agents switch <scenario> [options]
```

**オプション:**
- `--preserve-sessions`: 既存tmuxセッションを保持

**例:**
```bash
# シナリオ切り替え
claude-agents switch market-analysis

# セッション保持で切り替え
claude-agents switch collaborative-coding --preserve-sessions
```

### `claude-agents status`
システム状態を確認します。

```bash
claude-agents status [options]
```

**オプション:**
- `-a, --agents`: エージェントマッピング詳細表示
- `-t, --tmux`: tmuxセッション状態表示

**例:**
```bash
# 基本状態確認
claude-agents status

# エージェント詳細表示
claude-agents status --agents

# tmux状態表示  
claude-agents status --tmux

# 全詳細表示
claude-agents status --agents --tmux
```

### `claude-agents list`
利用可能なシナリオを一覧表示します。

```bash
claude-agents list [options]
```

**オプション:**
- `-d, --detailed`: 詳細情報表示

**例:**
```bash
# シナリオ一覧
claude-agents list

# 詳細情報付き
claude-agents list --detailed
```

### `claude-agents reset`
環境をリセットします。

```bash
claude-agents reset [options]
```

**オプション:**
- `-f, --force`: 確認なしで強制リセット

**例:**
```bash
# 対話式リセット
claude-agents reset

# 強制リセット
claude-agents reset --force
```

### `claude-agents create-scenario`
新しいカスタムシナリオを対話式で作成します。

```bash
claude-agents create-scenario [options]
```

**オプション:**
- `-n, --name <name>`: シナリオ名
- `-d, --description <desc>`: シナリオ説明
- `-c, --category <category>`: シナリオカテゴリ
- `-a, --author <author>`: 作成者名
- `--initial-message <message>`: 開始時メッセージ

**例:**
```bash
# 対話式でシナリオ作成
claude-agents create-scenario

# パラメータ指定で作成
claude-agents create-scenario --name "AI研究チーム" --category development

# エイリアス使用
claude-agents create --name "マーケティング戦略" --description "新商品マーケティング"
```

## グローバルオプション

全コマンドで使用可能なオプション:

- `--verbose`: 詳細ログ出力
- `--no-color`: カラー出力無効化
- `-h, --help`: ヘルプ表示
- `-v, --version`: バージョン表示

## エージェント間通信詳細

### Business Strategyシナリオ
```bash
# 戦略チーム (strategy セッション)
claude-agents send ceo "新しい事業戦略について議論を開始してください"
claude-agents send cto "技術的実現可能性を評価してください"  
claude-agents send cfo "財務インパクトを分析してください"
claude-agents send marketing_director "市場機会を調査してください"

# 分析チーム (analysis セッション)  
claude-agents send product_manager "プロダクトロードマップを作成してください"
claude-agents send data_analyst "競合分析データを提供してください"
```

### Hello Worldシナリオ
```bash
# 統括 (president セッション)
claude-agents send president "Hello World プロジェクトを開始してください"

# チーム (multiagent セッション)
claude-agents send boss1 "worker達に作業を指示してください"
claude-agents send worker1 "Hello World作業を実行してください"
claude-agents send worker2 "進捗を報告してください"
claude-agents send worker3 "完了時に報告してください"
```

## シナリオ管理詳細

### シナリオ一覧表示
```bash
claude-agents list --detailed

# 出力例:
# 📦 hello-world
#    基本的なマルチエージェント通信デモ
#    エージェント: 5個
#    セッション: 2個
#    主要エージェント: president, boss1, worker1
#
# 🎯 business-strategy (現在)
#    事業戦略や経営方針を議論するシナリオ
#    エージェント: 6個
#    セッション: 2個
#    主要エージェント: ceo, cto, cfo
```

### シナリオ切り替え実行例
```bash
# 現在のシナリオから別のシナリオへ
claude-agents switch collaborative-coding

# または完全リセットして新規構築
claude-agents reset
claude-agents init --scenario market-analysis
claude-agents start
```

## デバッグ・確認コマンド

### システム状態確認
```bash
# 総合状態確認
claude-agents status

# tmux詳細確認
claude-agents status --tmux

# エージェント詳細確認
claude-agents status --agents

# システム全体確認
claude-agents status --tmux --agents
```

### ログ・ファイル確認
```bash
# メッセージ履歴
cat logs/send_log.jsonl

# 日付別ログ
cat logs/send_2025-06-17.jsonl

# tmuxセッション状態
tmux list-sessions
tmux list-panes -t strategy

# エージェントマッピング確認
cat tmp/agent_mapping.json
```

## 環境管理コマンド

### リセット・クリーンアップ
```bash
# 安全な環境リセット（対話式）
claude-agents reset

# 強制リセット
claude-agents reset --force

# 手動リセット
tmux kill-server
rm -f claude-agents.json
rm -rf ./tmp ./logs
```

### 環境再構築
```bash
# クイック再構築
claude-agents init --scenario business-strategy
claude-agents start

# シナリオ切り替え
claude-agents switch hello-world
```

## エラー時のトラブルシューティング

### よくあるエラーと解決方法

**エラー**: `claude-agents: command not found`
```bash
# 解決方法
npm install -g claude-agents
# または（ローカル開発時）
npm link
```

**エラー**: `No tmux session found`
```bash
# 確認と修復
claude-agents status --tmux
claude-agents reset
claude-agents start
```

**エラー**: `Agent not found`
```bash
# 利用可能エージェント確認
claude-agents send --list
claude-agents status --agents
```

### ログ確認コマンド
```bash
# 送信ログ確認
claude-agents status --logs
tail -f logs/send_log.jsonl

# デバッグログ
DEBUG=claude-agents* claude-agents start

# tmuxデバッグ
tmux list-sessions -v
```