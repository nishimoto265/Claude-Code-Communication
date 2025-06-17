# シナリオ管理詳細ガイド

claude-agentsのシナリオシステムの詳細な管理方法を説明します。

## 利用可能シナリオ

### Business Strategy シナリオ
**概要**: CEO、CTO、CFO、マーケティング責任者による戦略討議

**エージェント構成**:
```yaml
ceo:
  role: 最高経営責任者
  responsibilities:
    - 戦略方針決定
    - 全体統括
    - 意思決定
  session: strategy
  pane: 0

cto:
  role: 最高技術責任者
  responsibilities:
    - 技術的実現可能性
    - アーキテクチャ設計
    - 技術投資
  session: strategy
  pane: 1

cfo:
  role: 最高財務責任者
  responsibilities:
    - 財務分析
    - ROI計算
    - 予算管理
  session: strategy
  pane: 2

marketing_director:
  role: マーケティング責任者
  responsibilities:
    - 市場分析
    - 競合調査
    - マーケティング戦略
  session: strategy
  pane: 3

product_manager:
  role: プロダクトマネージャー
  responsibilities:
    - プロダクト戦略
    - 要件定義
    - ロードマップ
  session: analysis
  pane: 0

data_analyst:
  role: データアナリスト
  responsibilities:
    - データ分析
    - KPI設計
    - レポート作成
  session: analysis
  pane: 1
```

**tmux構成**:
- **strategy セッション**: 4ペイン (CEO, CTO, CFO, マーケティング)
- **analysis セッション**: 2ペイン (PM, データアナリスト)

### Hello World シナリオ（基本デモ）
**概要**: 基本的なマルチエージェント通信デモ

**エージェント構成**:
```yaml
president:
  role: 統括責任者
  responsibilities:
    - プロジェクト統括
    - 最終意思決定
  session: president
  pane: 0

boss1:
  role: チームリーダー
  responsibilities:
    - チーム管理
    - 作業指示
    - 進捗管理
  session: multiagent
  pane: 0

worker1:
  role: ワーカー1
  responsibilities:
    - 作業実行
    - 完了報告
  session: multiagent
  pane: 1

worker2:
  role: ワーカー2
  responsibilities:
    - 作業実行
    - 完了報告
  session: multiagent
  pane: 2

worker3:
  role: ワーカー3
  responsibilities:
    - 作業実行
    - 完了報告
  session: multiagent
  pane: 3
```

**tmux構成**:
- **president セッション**: 1ペイン (統括責任者)
- **multiagent セッション**: 4ペイン (boss1 + worker1-3)

### Collaborative Coding シナリオ
**概要**: アーキテクト、フロントエンド、バックエンド開発者の協働

**エージェント構成**:
- **architect**: システム設計、技術選択
- **frontend_dev**: UI/UX実装、フロントエンド設計
- **backend_dev**: API設計、データベース設計
- **devops**: インフラ、CI/CD、運用
- **qa**: テスト設計、品質管理
- **tech_lead**: 技術統括、コードレビュー

**tmux構成**:
- **development セッション**: 6ペイン

### Market Analysis シナリオ
**概要**: 市場調査と競合分析チーム

**エージェント構成**:
- **market_researcher**: 市場動向調査
- **competitive_analyst**: 競合分析
- **consumer_insights**: ユーザー行動分析
- **trend_analyst**: トレンド分析
- **business_analyst**: ビジネス影響分析
- **strategy_consultant**: 戦略提案

## シナリオ操作

### シナリオ一覧と詳細確認
```bash
# シナリオ一覧
claude-agents list

# 詳細情報付き
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

### シナリオ切り替え
```bash
# 基本的な切り替え
claude-agents switch market-analysis

# セッション保持での切り替え
claude-agents switch collaborative-coding --preserve-sessions

# 現在のシナリオ確認
claude-agents status --scenario
```

### 完全リセット後の新規構築
```bash
# 1. 環境リセット
claude-agents reset

# 2. 新規初期化
claude-agents init --scenario business-strategy

# 3. エージェント起動
claude-agents start
```

## デモ実行手順

### Business Strategy シナリオの実行

#### 1. 環境セットアップ
```bash
# Step 1: インストール
npm install -g claude-agents

# Step 2: プロジェクト初期化
mkdir my-ai-team && cd my-ai-team
claude-agents init --scenario business-strategy
```

#### 2. エージェント起動
```bash
# Step 3: tmuxセッション自動構築
claude-agents start

# Step 4: Claude Code起動（各ペインで認証）
# 手動認証: 最初のペインで認証後、他ペインは自動認証
```

#### 3. セッション参加
```bash
# Step 5: 戦略チームセッション
tmux attach-session -t strategy

# または分析チーム
tmux attach-session -t analysis
```

#### 4. シナリオ実行
**CEOペイン（左上）で実行**:
```
あなたはCEOです。AI技術への投資について戦略会議を開始します。技術的実現可能性、財務影響、市場機会について各専門家の意見を求めてください。
```

**エージェント間コミュニケーション**:
```bash
claude-agents send cto "技術的実現可能性を評価してください"
claude-agents send cfo "財務インパクトを計算してください"
claude-agents send marketing_director "市場参入戦略を検討してください"
claude-agents send product_manager "プロダクトロードマップを作成してください"
claude-agents send data_analyst "競合分析データを提供してください"
```

### Hello World シナリオの実行

#### 基本実行
```bash
# 初期化
claude-agents init --scenario hello-world
claude-agents start

# PRESIDENTセッションで実行
tmux attach-session -t president
```

**PRESIDENTペインで実行**:
```
あなたはpresidentです。Hello World プロジェクトを開始してください。
```

**エージェント間通信例**:
```bash
claude-agents send president "Hello World プロジェクトを開始してください"
claude-agents send boss1 "worker達に作業を指示してください"
claude-agents send worker1 "Hello World作業を実行してください"
claude-agents send worker2 "進捗を報告してください"
claude-agents send worker3 "完了時に報告してください"
```

## tmuxセッションアクセス

### Business Strategy シナリオ
```bash
# 戦略チーム（CEO, CTO, CFO, マーケティング）
tmux attach-session -t strategy

# 分析チーム（PM, データアナリスト）
tmux attach-session -t analysis
```

**画面レイアウト（strategy セッション）**:
```
┌─────────────┬─────────────┐
│ CEO         │ CTO         │
│ (左上)      │ (右上)      │
├─────────────┼─────────────┤
│ CFO         │ CMO         │
│ (左下)      │ (右下)      │
└─────────────┴─────────────┘
```

### Hello World シナリオ
```bash
# プレジデント（統括責任者）
tmux attach-session -t president

# マルチエージェントチーム（boss1 + workers）
tmux attach-session -t multiagent
```

### Collaborative Coding シナリオ
```bash
# 開発チーム全体
tmux attach-session -t development
```

**画面レイアウト（development セッション）**:
```
┌─────────┬─────────┬─────────┐
│ Arch    │ Front   │ Back    │
├─────────┼─────────┼─────────┤
│ DevOps  │ QA      │ Lead    │
└─────────┴─────────┴─────────┘
```

## シナリオ管理のベストプラクティス

### 効率的な切り替え方法
1. **段階的切り替え**: セッション保持での段階的移行
2. **完全リセット**: 問題発生時の全リセット
3. **部分的更新**: エージェント単位での個別更新

### 長時間セッション管理
```bash
# セッション保存（tmux機能）
tmux capture-pane -t strategy -p > strategy_session_backup.txt

# セッション復元
tmux send-keys -t strategy "# 復元された会話内容" C-m
```

### 複数シナリオの同時実行
```bash
# 別プロジェクトディレクトリで異なるシナリオ実行
mkdir project-a && cd project-a
claude-agents init --scenario business-strategy
claude-agents start

# 別ターミナルで
mkdir project-b && cd project-b  
claude-agents init --scenario hello-world
claude-agents start
```

## システム状態監視

### 総合状態確認
```bash
# 現在のシナリオと全体状況
claude-agents status

# エージェント詳細確認
claude-agents status --agents

# 出力例:
# 📊 6個のエージェントが設定済み
# 🎭 ceo → strategy:1.1
# 🎭 cto → strategy:1.2
# 🎭 cfo → strategy:1.3
# ...
```

### tmuxセッション監視
```bash
# tmux状態詳細
claude-agents status --tmux

# 手動tmux確認
tmux list-sessions
tmux list-panes -t strategy -F "#{pane_index}:#{pane_current_command}:#{pane_title}"
```

### ログ分析
```bash
# リアルタイムログ監視
tail -f logs/send_log.jsonl

# 構造化ログ分析
jq '.agent' logs/send_log.jsonl | sort | uniq -c
jq 'select(.agent=="ceo")' logs/send_log.jsonl
```