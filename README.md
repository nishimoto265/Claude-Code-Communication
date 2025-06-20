# 🤖 Claude Agents - Multi-Agent Collaboration System

NPMパッケージ化されたエンタープライズグレードのマルチエージェント協働システム

## 🎯 システム概要

現実的なビジネスシナリオでAIエージェント間の協働を体験できます：

- 💼 **Business Strategy**: CEO、CTO、CFO、CMOによる戦略会議
- 💻 **Collaborative Coding**: テックリード、フロントエンド、バックエンド、DevOps、QA、プロダクトオーナーの連携
- 📊 **Market Analysis**: マーケットリサーチャー、競合アナリスト、消費者インサイト専門家による市場分析
- 🚀 **Product Development**: プロダクトマネージャー、UXデザイナー、システムアーキテクトによる製品開発
- 🎉 **Hello World**: 基本的なマルチエージェントデモ

## 📦 インストール

### ローカル開発環境

```bash
git clone https://github.com/madai0517/Claude-Code-Agent.git
cd Claude-Code-Agent
npm install

# ローカル開発用グローバルリンク（推奨）
npm link

# 使用方法
claude-agents init
claude-agents start business-strategy
```

### 直接実行

```bash
# 直接実行も可能
node bin/claude-agents.js init
node bin/claude-agents.js start business-strategy
```

> **注意**: 現在はローカル開発環境でのみ利用可能です。NPMパッケージとしての公開は準備中です。

## 🚀 クイックスタート

### 🎆 ワンコマンドセットアップ

```bash
# Step 1: リポジトリクローン
git clone https://github.com/madai0517/Claude-Code-Agent.git
cd Claude-Code-Agent

# Step 2: 依存関係インストール
npm install

# Step 3: グローバルリンク（推奨）
npm link

# Step 4: プロジェクト初期化
mkdir my-ai-team && cd my-ai-team
claude-agents init --scenario business-strategy

# Step 5: エージェント起動
claude-agents start
```

✨ **自動で実行されること**:
- 依存関係チェック
- tmux環境構築
- シナリオ別エージェント配置
- Claude Code起動案内

## 🛠️ 前提条件

以下のツールがインストールされている必要があります：

- **Node.js**: 14.0.0以上
  ```bash
  # macOS
  brew install node

  # Ubuntu/Debian
  sudo apt update && sudo apt install nodejs npm
  ```

- **tmux**: マルチペイン管理
  ```bash
  # macOS
  brew install tmux

  # Ubuntu/Debian
  sudo apt update && sudo apt install tmux

  # CentOS/RHEL
  sudo yum install tmux
  ```

- **Claude Code**: AI開発アシスタント
  - [claude.ai/code](https://claude.ai/code) からダウンロード・インストール

## 🖥️ コマンドリファレンス

### 基本コマンド

| コマンド | 機能 | 例 |
|---------|------|-----|
| `claude-agents init` | プロジェクト初期化 | `claude-agents init --scenario business-strategy` |
| `claude-agents start` | エージェント起動 | `claude-agents start business-strategy` |
| `claude-agents send` | メッセージ送信 | `claude-agents send ceo "戦略会議を開始"` |
| `claude-agents switch` | シナリオ切り替え | `claude-agents switch hello-world` |
| `claude-agents status` | 状態確認 | `claude-agents status --agents` |
| `claude-agents list` | シナリオ一覧 | `claude-agents list --detailed` |
| `claude-agents reset` | 環境リセット | `claude-agents reset --force` |

### エイリアス

- `ca` (claude-agentsの短縮形)

## 🎭 シナリオ管理

### 利用可能シナリオ

| シナリオ | 説明 | エージェント数 | セッション構成 |
|---------|------|--------|---------|
| `business-strategy` | 事業戦略ディスカッション | 6エージェント | strategy(4) + analysis(2) |
| `collaborative-coding` | 共同コーディング | 6エージェント | development(6) |
| `market-analysis` | 市場分析・競合調査 | 6エージェント | market_analysis(6) |
| `product-development` | プロダクト開発 | 5エージェント | product_development(5) |
| `hello-world` | 基本デモ | 5エージェント | president(1) + multiagent(4) |

### シナリオ操作

```bash
# シナリオ一覧
claude-agents list

# シナリオ詳細
claude-agents list --detailed

# 新しいシナリオ作成（対話式）
claude-agents create-scenario

# シナリオ切り替え
claude-agents switch market-analysis

# 現在のシナリオ確認
claude-agents status
```

## ✨ カスタムシナリオ作成

### 🧙‍♂️ 対話式シナリオ作成ウィザード（推奨）

最も簡単な方法は、対話式ウィザードを使用することです：

```bash
# 対話式ウィザードでシナリオ作成
claude-agents create-scenario

# エイリアス使用
claude-agents create

# パラメータ指定での高速作成
claude-agents create-scenario --name "AI研究チーム" --category research
```

**ウィザードの流れ：**
1. 📝 シナリオ名・説明の入力
2. 🏢 カテゴリ選択（ビジネス、開発、ヘルスケアなど）
3. 👥 エージェント数と役割設定
4. 🖥️ tmux画面配置の自動設定
5. ✅ 自動ファイル生成・設定登録

**作成されるファイル：**
- `scenarios/your-scenario/scenario.yaml` - メタデータ
- `scenarios/your-scenario/agents.yaml` - エージェント定義
- `scenarios/your-scenario/layout.yaml` - tmux配置
- `scenarios/your-scenario/instructions/*.md` - 指示書テンプレート

### 🛠️ 手動作成（上級者向け）

### 📁 シナリオディレクトリ構造

手動でシナリオを作成する場合は、`scenarios/`ディレクトリに以下の構造でファイルを作成します：

```
scenarios/
└── your-custom-scenario/
    ├── scenario.yaml      # シナリオメタデータ
    ├── agents.yaml        # エージェント定義
    ├── layout.yaml        # tmux画面配置
    └── instructions/      # エージェント別指示書
        ├── agent1.md
        ├── agent2.md
        └── agent3.md
```

### 📝 必須ファイルの詳細

#### 1. scenario.yaml (シナリオメタデータ)
```yaml
name: Product Development Sprint
description: プロダクト開発チームのスプリント計画と実行
version: 2.0.0
author: Your Name
tags:
  - development
  - agile
  - product
initial_message: スプリント計画会議を開始します。今回の開発目標を確認しましょう
settings:
  auto_start_claude: true
  message_wait_time: 0.5
  enable_logging: true
```

#### 2. agents.yaml (エージェント定義)
```yaml
product_owner:
  role: プロダクトオーナー
  session: development
  pane: 0
  responsibilities:
    - ユーザーストーリー作成
    - 優先順位決定
    - 受け入れ基準定義
  communication_style: ビジネス価値と顧客視点で判断
  color: blue
  instruction_file: instructions/product_owner.md

tech_lead:
  role: テックリード
  session: development
  pane: 1
  responsibilities:
    - アーキテクチャ設計
    - 技術的課題解決
    - コードレビュー
  communication_style: 技術的実現性と品質を重視
  color: red
  instruction_file: instructions/tech_lead.md

frontend_dev:
  role: フロントエンド開発者
  session: development
  pane: 2
  responsibilities:
    - UI/UX実装
    - フロントエンド設計
    - ユーザビリティ改善
  color: green
  instruction_file: instructions/frontend_dev.md

backend_dev:
  role: バックエンド開発者
  session: development
  pane: 3
  responsibilities:
    - API設計・実装
    - データベース設計
    - パフォーマンス最適化
  color: yellow
  instruction_file: instructions/backend_dev.md
```

#### 3. layout.yaml (tmux画面配置)
```yaml
tmux_sessions:
  development:
    window_name: dev-team
    layout: tiled
    panes:
      - role: product_owner
        color: blue
      - role: tech_lead
        color: red
      - role: frontend_dev
        color: green
      - role: backend_dev
        color: yellow

layout_descriptions:
  tiled: 2x2 grid layout for 4 development roles
  main-horizontal: Main pane with horizontal splits
  even-horizontal: Horizontal split for 2 panes
  even-vertical: Vertical split for 2 panes
```

#### 4. instructions/agent.md (個別指示書)
```markdown
# プロダクトオーナーの役割

あなたはプロダクトオーナーです。

## 主な責任
- ユーザーストーリーの作成と優先順位付け
- 受け入れ基準の定義
- ステークホルダーとの調整

## 行動指針
1. 常にユーザー価値を意識する
2. ビジネス目標との整合性を確保
3. 開発チームとの円滑なコミュニケーション

## コミュニケーション
- 具体的なユーザーストーリーで要件を説明
- ビジネス価値と技術的制約のバランスを考慮
- 優先順位の理由を明確に説明
```

### 🎯 メイン設定への登録

新しいシナリオを作成後、`claude-agents.yaml`に追加します：

```yaml
scenarios:
  # 既存のシナリオ...
  product-development:
    name: Product Development Sprint
    description: プロダクト開発チームのアジャイル開発シナリオ
    type: external
    path: scenarios/product-development
```

### 🔄 カスタマイズのポイント

#### **A. チーム構成のバリエーション**
- **小規模チーム**: 3-4人構成
- **大規模チーム**: 6-8人構成（複数セッション）
- **専門チーム**: AI研究、セキュリティ、インフラなど

#### **B. 業界別シナリオ例**
```
scenarios/
├── healthcare-consultation/    # 医療相談チーム
├── legal-review/              # 法務レビューチーム
├── financial-planning/        # 金融プランニング
├── education-curriculum/      # 教育カリキュラム設計
└── marketing-campaign/        # マーケティングキャンペーン
```

#### **C. 複数セッション構成例**
```yaml
# 大規模開発チーム例
tmux_sessions:
  core-dev:
    window_name: core-development
    panes:
      - role: tech_lead
      - role: senior_dev1
      - role: senior_dev2
  frontend-team:
    window_name: frontend-team
    panes:
      - role: frontend_lead
      - role: ui_designer
      - role: qa_engineer
  backend-team:
    window_name: backend-team
    panes:
      - role: backend_lead
      - role: devops
      - role: database_admin
```

### 🚀 作成後の動作確認

```bash
# 1. 新しいシナリオで起動
claude-agents start product-development

# 2. エージェント一覧確認
claude-agents status --agents

# 3. メッセージ送信テスト
claude-agents send product_owner "今回のスプリント目標を共有します"
claude-agents send tech_lead "技術的なリスクを評価してください"
claude-agents send frontend_dev "UI設計の方針を確認します"
claude-agents send backend_dev "API仕様について議論しましょう"

# 4. tmuxセッションアクセス
tmux attach-session -t development
```

### 💡 ベストプラクティス

1. **役割を明確化**: 各エージェントの責任範囲を重複なく定義
2. **現実的な構成**: 実際のチーム構成に基づいてエージェントを設計
3. **段階的な議論**: initial_messageで適切な開始点を設定
4. **専門性の活用**: 各エージェントの専門分野を活かせるシナリオ設計
5. **継続的改善**: 実際の使用結果を基にシナリオを調整

この方法で、業界や用途に特化した無限のシナリオを作成できます。

## 🖥️ tmuxセッションアクセス

### Business Strategy シナリオ

```bash
# 戦略チーム（CEO, CTO, CFO, マーケティング）
tmux attach-session -t strategy

# 分析チーム（PM, データアナリスト）
tmux attach-session -t analysis
```

**画面レイアウト（strategy セッション）:**
```
┌─────────────┬─────────────┐
│ CEO         │ CTO         │
│ (左上)      │ (右上)      │
├─────────────┼─────────────┤
│ CFO         │ CMO         │
│ (左下)      │ (右下)      │
└─────────────┴─────────────┘
```

### Market Analysis シナリオ

```bash
# 市場分析チーム（6ペイン表示）
tmux attach-session -t market_analysis
```

**画面レイアウト（market_analysis セッション）:**
```
┌─────────────┬─────────────┬─────────────┐
│ リサーチャー │ 競合アナリスト │ インサイト専門 │
├─────────────┼─────────────┼─────────────┤
│ トレンド分析 │ ビジネス分析 │ 戦略コンサル │
└─────────────┴─────────────┴─────────────┘
```

### Product Development シナリオ

```bash
# プロダクト開発チーム（5ペイン表示）
tmux attach-session -t product_development
```

**画面レイアウト（product_development セッション）:**
```
┌─────────────────┬─────────────────┐
│ プロダクトマネージャー │ UXデザイナー      │
├─────────────────┼─────────────────┤
│ マーケティング     │ システムアーキテクト │
├─────────────────┼─────────────────┤
│ リードプログラマー │                 │
└─────────────────┴─────────────────┘
```

### Hello World シナリオ

```bash
# プレジデント（統括責任者）
tmux attach-session -t president

# マルチエージェントチーム（boss1 + workers）
tmux attach-session -t multiagent
```

## 🤖 Claude Code起動

### 自動起動（推奨）

```bash
claude-agents start  # 現在のシナリオに応じて自動起動
```

### 手動起動

**Business Strategy シナリオ:**
```bash
# 最初のペインで認証
tmux send-keys -t strategy:1.1 'claude' C-m

# 認証完了後、全ペインで一括起動
for i in {1..4}; do tmux send-keys -t strategy:1.$i 'claude' C-m; done
for i in {1..2}; do tmux send-keys -t analysis:1.$i 'claude' C-m; done
```

**Hello World シナリオ:**
```bash
# President認証
tmux send-keys -t president:1.1 'claude' C-m

# Multiagent一括起動
for i in {1..4}; do tmux send-keys -t multiagent:1.$i 'claude' C-m; done
```

## 🎯 シナリオ実行

### Business Strategy シナリオ

**CEOペイン（strategy セッション左上）で実行：**
```
あなたはCEOです。AI技術への投資について戦略会議を開始します。技術的実現可能性、財務影響、市場機会について各専門家の意見を求めてください。
```

💡 **期待される動作**:
- CEOが戦略テーマを提示
- CTOが技術的実現可能性を評価
- CFOが財務インパクトを分析
- CMOが市場機会を説明
- PMとデータアナリストが定量分析を提供

**エージェント間メッセージ送信例：**
```bash
# CEOから他のエージェントに指示
claude-agents send cto "技術仕様の詳細レポートを作成してください"
claude-agents send cfo "投資提案書を準備してください"
claude-agents send marketing_director "市場参入戦略を策定してください"

# 分析チームへの依頼
claude-agents send product_manager "プロダクトロードマップを作成してください"
claude-agents send data_analyst "競合分析の詳細データを提供してください"
```

### Hello World シナリオ

**PRESIDENTセッションで実行：**
```
あなたはpresidentです。Hello World プロジェクトを開始してください。
```

**エージェント間通信例：**
```bash
claude-agents send president "Hello World プロジェクトを開始してください"
claude-agents send boss1 "worker達に作業を指示してください"
claude-agents send worker1 "Hello World作業を実行してください"
```

### Market Analysis シナリオ

**戦略コンサルタントペイン（market_analysis セッション右下）で実行：**
```
あなたは戦略コンサルタントです。新しい市場参入について包括的な市場分析を開始してください。市場動向、競合状況、消費者インサイトについて各専門家と連携して分析を進めてください。
```

💡 **期待される動作**:
- 戦略コンサルタントが分析テーマを提示
- マーケットリサーチャーが市場規模・成長率を分析
- 競合アナリストが競合他社の戦略を評価
- 消費者インサイト専門家がユーザーニーズを分析
- トレンドアナリストが将来動向を予測
- ビジネスアナリストが事業性を評価

**エージェント間メッセージ送信例：**
```bash
# 戦略コンサルタントから各専門家への指示
claude-agents send market_researcher "ターゲット市場の規模と成長率を調査してください"
claude-agents send competitive_analyst "主要競合3社のSWOT分析をお願いします"
claude-agents send consumer_insights "ユーザーペルソナとニーズを分析してください"
claude-agents send trend_analyst "5年後の市場予測を立ててください"
claude-agents send business_analyst "投資対効果とリスク評価をしてください"
```

### Product Development シナリオ

**プロダクトマネージャーペイン（product_development セッション左上）で実行：**
```
あなたはプロダクトマネージャーです。新製品の開発プロジェクトを開始してください。市場機会、ユーザーニーズ、技術要件、マーケティング戦略について各専門家と連携して製品開発を進めてください。
```

💡 **期待される動作**:
- プロダクトマネージャーが製品ビジョンを提示
- UXデザイナーがユーザー体験を設計
- プロダクトマーケティングマネージャーが市場ポジショニングを策定
- システムアーキテクトが技術アーキテクチャを設計
- リードプログラマーが実装計画を立案

**エージェント間メッセージ送信例：**
```bash
# プロダクトマネージャーから各専門家への指示
claude-agents send ux_designer "ユーザージャーニーマップを作成してください"
claude-agents send product_marketing_manager "競合分析と差別化戦略を検討してください"
claude-agents send system_architect "スケーラブルなアーキテクチャを設計してください"
claude-agents send lead_programmer "技術的実現可能性と開発工数を評価してください"
```

## 📁 設定ファイル

### claude-agents.json（自動生成）

```json
{
  "version": "2.0.0",
  "currentScenario": "business-strategy",
  "projectName": "MyProject",
  "scenarios": {
    "business-strategy": {
      "name": "Business Strategy Discussion",
      "description": "事業戦略や経営方針を議論するシナリオ",
      "tmux_sessions": {
        "strategy": {
          "window_name": "strategy-team",
          "panes": [
            { "role": "ceo" },
            { "role": "cto" },
            { "role": "cfo" },
            { "role": "CMO" }
          ]
        }
      },
      "agents": {
        "ceo": { "role": "最高経営責任者", "session": "strategy", "pane": 0 }
      }
    }
  },
  "settings": {
    "tmuxPrefix": "C-b",
    "autoStartClaude": true,
    "logLevel": "info",
    "colorOutput": true
  }
}
```

## 💬 エージェント間通信

### 基本送信

```bash
# 基本送信
claude-agents send <エージェント名> "<メッセージ>"

# 利用可能エージェント一覧
claude-agents send --list

# メッセージ履歴確認
cat logs/send_log.jsonl
```

### Business Strategyシナリオの例

```bash
# 戦略会議開始
claude-agents send ceo "新しい事業戦略について議論しましょう"

# 各エージェントへの専門的な質問
claude-agents send cto "技術的な観点から意見をお願いします"
claude-agents send cfo "財務インパクトを評価してください"
claude-agents send cmo "市場機会を分析してください"
claude-agents send product_manager "プロダクト要件を定義してください"
claude-agents send data_analyst "データに基づく分析をお願いします"
```

## 🔍 状態確認・デバッグ

### 状態確認ツール

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
cat logs/send_2025-06-15.jsonl

# tmuxセッション状態
tmux list-sessions
tmux list-panes -t strategy
```

## 🔄 環境管理

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

## 📈 新機能ハイライト（v2.0）

✨ **NPMパッケージ化の主な改善点**:

### 🎯 ユーザビリティ向上
- **ワンコマンドセットアップ**: `npm install -g claude-agents` でグローバル利用
- **統合CLI**: 全機能を`claude-agents`コマンド一つで操作
- **対話式インターフェース**: 設定や確認が直感的
- **カラフルな出力**: 状態やエラーが視覚的に分かりやすい

### 🔧 技術的改善
- **依存関係自動チェック**: tmux、Claude Code、Node.jsの確認と解決策提示
- **エラーハンドリング強化**: 詳細なエラーメッセージと修復手順
- **ログ管理**: JSONL形式での構造化ログとアーカイブ機能
- **設定管理**: JSON形式の統合設定ファイル

### 🚀 拡張性
- **プログラマティックAPI**: Node.jsライブラリとしても利用可能
- **カスタムシナリオ**: 独自のシナリオを簡単に作成・追加
- **プラグインシステム**: カスタムコマンドの追加が可能

## 🎬 実践ガイド：Business Strategy シナリオ

### ステップ1: 環境準備

```bash
# リポジトリクローン（初回のみ）
git clone https://github.com/madai0517/Claude-Code-Agent.git
cd Claude-Code-Agent
npm install
npm link

# プロジェクト作成
mkdir ai-strategy-meeting && cd ai-strategy-meeting

# 初期化
claude-agents init --scenario business-strategy
```

### ステップ2: エージェント起動

```bash
# tmuxセッション構築とエージェント起動
claude-agents start

# 出力例:
# 🎭 シナリオ: Business Strategy Discussion
# ✅ Created 2 tmux sessions
# ✅ Generated mapping for 6 agents
```

### ステップ3: セッション参加

```bash
# 戦略チーム（4ペイン表示）
tmux attach-session -t strategy

# または分析チーム（2ペイン表示）
tmux attach-session -t analysis
```

### ステップ4: 戦略議論開始

**CEOペイン（左上）で以下を入力:**
```
あなたはCEOです。AI技術への投資について戦略会議を開始します。技術的実現可能性、財務影響、市場機会について各専門家の意見を求めてください。
```

### ステップ5: エージェント間コミュニケーション

**各エージェントの専門性を活かした応答例:**

1. **CTO（右上ペイン）の応答例:**
   ```
   技術的観点から以下を提案します：
   - AI投資の技術的実現可能性: 高い
   - 推奨技術スタック: TensorFlow, PyTorch
   - 実装期間: 6-8ヶ月
   - 技術的リスク: 人材確保、インフラ投資
   ```

2. **CFO（左下ペイン）の応答例:**
   ```
   財務分析の結果をお伝えします：
   - 初期投資額: 5億円
   - 予想ROI: 225%（3年累計）
   - 回収期間: 2.4年
   - 感度分析: 市場成長率±5%でROI 180-280%
   ```

3. **マーケティング責任者（右下ペイン）の応答例:**
   ```
   市場機会について報告します：
   - ターゲット市場規模: 100億円（年間）
   - 成長率: 年率15%
   - 競合優位性: 使いやすさで差別化可能
   - 価格戦略: プレミアム価格（競合比+20%）
   ```

### ステップ6: データ分析チームとの連携

```bash
# 分析チームにアタッチ（別ターミナルで）
tmux attach-session -t analysis

# コマンドラインからの直接通信
claude-agents send product_manager "プロダクトロードマップを作成してください"
claude-agents send data_analyst "競合分析の詳細データを提供してください"
```

### ステップ7: システム状態監視

```bash
# 総合状態確認
claude-agents status

# エージェント一覧
claude-agents status --agents

# 出力例:
# 📊 6個のエージェントが設定済み
# 🎭 ceo → strategy:1.1
# 🎭 cto → strategy:1.2
# 🎭 cfo → strategy:1.3
# ...
```

## 🔄 シナリオ切り替えの実例

### 現在のシナリオから別のシナリオへ

```bash
# 実行中にシナリオ切り替え
claude-agents switch collaborative-coding

# 市場分析シナリオに切り替え
claude-agents switch market-analysis

# 製品開発シナリオに切り替え
claude-agents switch product-development

# または完全リセットして新規構築
claude-agents reset
claude-agents init --scenario market-analysis
claude-agents start
```

### シナリオ一覧の確認

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
#
# 📊 market-analysis
#    市場調査と競合分析チーム
#    エージェント: 6個
#    セッション: 1個
#    主要エージェント: market_researcher, competitive_analyst, consumer_insights
#
# 🚀 product-development
#    プロダクト開発チーム
#    エージェント: 5個
#    セッション: 1個
#    主要エージェント: product_manager, ux_designer, product_marketing_manager
```

## ⚠️ トラブルシューティング

### よくある問題と解決方法

**問題1: `claude-agents: command not found`**
```bash
# 解決方法
npm install -g claude-agents

# または（ローカル開発時）
npm link
```

**問題2: tmuxセッションが見つからない**
```bash
# 確認
claude-agents status --tmux
tmux list-sessions

# 解決方法
claude-agents reset
claude-agents start
```

**問題3: エージェントマッピングエラー**
```bash
# 確認
claude-agents status --agents
cat ./tmp/agent_mapping.json

# 解決方法
claude-agents switch <current-scenario>
```

**問題4: Claude Code認証エラー**
```bash
# 手動認証手順
tmux attach-session -t strategy
# 最初のペインで claude コマンド実行・認証
# その後他ペインでも claude コマンド実行
```

**問題5: 環境をリセットしたい**
```bash
# 完全リセット
claude-agents reset --force

# または手動リセット
tmux kill-server
rm -f claude-agents.json
rm -rf ./tmp ./logs
claude-agents init
```

### ログ確認

```bash
# 送信ログ
cat logs/send_log.jsonl

# 構造化ログの例
# {"timestamp":"2025-06-15T14:00:00.000Z","agent":"ceo","target":"strategy:1.1","message":"戦略会議を開始","length":12}

# NPMデバッグログ
DEBUG=claude-agents* claude-agents start

# tmuxデバッグ
tmux list-sessions -v
```

## 🎯 実践的な使用シーン

### シーン1: 新プロダクト企画会議

```bash
claude-agents init --scenario product-development
claude-agents start
# UXデザイナー、UIデザイナー、プロダクトオーナー、ユーザーリサーチャー
```

### シーン2: 技術アーキテクチャレビュー

```bash
claude-agents init --scenario collaborative-coding
claude-agents start
# アーキテクト、フロントエンド、バックエンド、DevOps、QA、テックリード
```

### シーン3: 市場参入戦略検討

```bash
claude-agents init --scenario market-analysis
claude-agents start
# マーケットリサーチャー、競合アナリスト、消費者インサイト専門家、トレンドアナリスト、ビジネスアナリスト、戦略コンサルタント
```

### シーン4: 新製品開発プロジェクト

```bash
claude-agents init --scenario product-development
claude-agents start
# プロダクトマネージャー、UXデザイナー、プロダクトマーケティングマネージャー、システムアーキテクト、リードプログラマー
```

## 📊 期待される成果

### 定量的効果
- **セットアップ時間**: 95%削減（15分→30秒）
- **操作複雑性**: 多段階コマンド → ワンコマンド
- **学習コスト**: 大幅削減（統合CLI）
- **エラー率**: 依存関係チェックにより大幅削減

### 定性的効果
- **現実的な業務シミュレーション**: 実際のビジネスシーンを体験
- **専門性特化したエージェント協働**: 各分野の専門知識を活用
- **柔軟なシナリオ切り替え**: 用途に応じた最適な構成
- **エンタープライズ対応**: 本格的なチーム協働の実現

## 🎓 学習・研修での活用

### 教育機関での使用
- **ビジネススクール**: 戦略策定プロセスの体験学習
- **工学部**: アジャイル開発とチーム協働の実践
- **経営学部**: 組織内コミュニケーションの理解

### 企業研修での活用
- **新人研修**: 部門間連携の理解促進
- **管理職研修**: 意思決定プロセスの体験
- **チームビルディング**: 役割分担と協働の練習

### 個人スキル向上
- **コミュニケーション**: 専門性を活かした議論スキル
- **プロジェクト管理**: マルチステークホルダー調整
- **戦略思考**: 複数視点からの課題分析

## 📚 詳細ドキュメント

### .claude/ ディレクトリ構成

本プロジェクトでは、Claude Code向けの詳細なドキュメントが `.claude/` ディレクトリに体系的に整理されています：

```
.claude/
├── architecture.md           # システムアーキテクチャ
├── commands.md              # コマンドリファレンス
├── communication.md         # 通信システム詳細
├── custom-scenarios.md      # カスタムシナリオ作成
├── development.md           # 開発者ガイド
├── improvements.md          # 改善提案
├── knowledge.md             # 学習内容・知見
├── migration.md             # 開発履歴・移行ガイド
├── scenarios.md             # シナリオ管理
├── settings.local.json      # Claude Code権限設定
└── troubleshooting.md       # トラブルシューティング
```

#### アーキテクチャと実装
- **[システムアーキテクチャ](.claude/architecture.md)**: NPMパッケージ構造、設定管理、エラーハンドリング
- **[通信システム詳細](.claude/communication.md)**: tmux通信の実装詳細、エスケープ処理、ログ管理

#### 開発者向けガイド
- **[開発者ガイド](.claude/development.md)**: セットアップ、テスト、デバッグ、拡張方法
- **[コマンドリファレンス](.claude/commands.md)**: 全コマンドの詳細オプションと使用例

#### シナリオ管理
- **[シナリオ管理](.claude/scenarios.md)**: 利用可能シナリオの詳細、実行手順、tmuxセッション構成
- **[カスタムシナリオ作成](.claude/custom-scenarios.md)**: 独自シナリオの作成方法、業界別サンプル

#### トラブルシューティング・管理
- **[トラブルシューティング](.claude/troubleshooting.md)**: 一般的な問題と解決方法、デバッグ手順
- **[開発履歴・移行](.claude/migration.md)**: プロジェクト履歴、v1.xからv2.0への移行ガイド

#### Claude Code学習・改善
- **[学習内容](.claude/knowledge.md)**: プロジェクト固有の最適開発パターン
- **[改善提案](.claude/improvements.md)**: 実装済み・検討中の改善案

#### 設定ファイル
- **[権限設定](.claude/settings.local.json)**: Claude Code権限管理（40個のコマンド許可設定）

これらのドキュメントは相互に連携し、開発者が迅速にプロジェクトを理解し効果的に開発を進められるよう設計されています。

---

## 🚀 今すぐ始める

```bash
# リポジトリクローン
git clone https://github.com/madai0517/Claude-Code-Agent.git
cd Claude-Code-Agent
npm install
npm link

# 使用開始
claude-agents init --scenario business-strategy
claude-agents start
```

=======
## 📄 ライセンス

このプロジェクトは[MIT License](LICENSE)の下で公開されています。

## 🤝 コントリビューション

プルリクエストやIssueでのコントリビューションを歓迎いたします！

---

🚀 **Agent Communication を体感してください！** 🤖✨ 
