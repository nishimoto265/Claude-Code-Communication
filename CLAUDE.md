# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**claude-agents**は、NPMパッケージ化されたエンタープライズグレードのマルチエージェント協働システムです。Claude Codeインスタンス間での現実的なビジネスシナリオベースのコラボレーションを実現します。

## アーキテクチャ（NPMパッケージ版）

### システム構成
- **NPMパッケージ**: claude-agents v2.0
- **CLI Interface**: Commander.js ベースの統合コマンドライン
- **設定管理**: JSON形式の統合設定（claude-agents.json）
- **エージェント管理**: 動的マッピングシステム
- **tmux統合**: Node.js経由での自動セッション管理

### 技術スタック
```javascript
{
  "dependencies": {
    "commander": "^9.4.1",     // CLI framework
    "inquirer": "^8.2.5",      // Interactive prompts
    "chalk": "^4.1.2",         // Colored output
    "fs-extra": "^11.1.0",     // Enhanced file operations
    "js-yaml": "^4.1.0"        // YAML configuration support
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### エージェント階層構造
```
NPMパッケージ claude-agents
    ├── CLI Commands (bin/claude-agents.js)
    ├── Core Management (lib/core/)
    │   ├── config-manager.js (設定管理)
    │   ├── scenario-manager.js (シナリオ管理) 
    │   ├── tmux-manager.js (tmuxセッション管理)
    │   ├── agent-manager.js (エージェントマッピング)
    │   └── claude-manager.js (Claude Code統合)
    └── Scenarios
        ├── business-strategy (CEO, CTO, CFO, マーケティング, PM, データアナリスト)
        ├── collaborative-coding (アーキテクト, フロント, バック, DevOps, QA, リード)
        ├── market-analysis (リサーチャー, アナリスト, コンサルタント)
        └── hello-world (President, Boss, Workers)
```

### tmuxセッション構成（自動管理）
- **strategy**: 戦略チーム（4ペイン: CEO, CTO, CFO, マーケティング）
- **analysis**: 分析チーム（2ペイン: PM, データアナリスト）
- **development**: 開発チーム（6ペイン: アーキテクト等）
- **president/multiagent**: Hello Worldシナリオ（5ペイン）

### 通信フロー
1. **初期化**: `claude-agents init` → 設定ファイル生成
2. **セッション構築**: `claude-agents start` → tmux自動構築
3. **エージェント配置**: 動的マッピング → tmuxペイン割り当て
4. **メッセージ配信**: `claude-agents send` → ターゲット特定送信
5. **状態監視**: `claude-agents status` → リアルタイム確認

## 開発コマンド（NPMパッケージ版）

### インストールとセットアップ
```bash
# グローバルインストール（推奨）
npm install -g claude-agents

# ローカル開発
git clone <repository>
cd CC-ProductManagement
npm install

# プロジェクト初期化
claude-agents init --scenario business-strategy
```

### 基本操作コマンド
```bash
# エージェント起動（tmuxセッション自動構築）
claude-agents start [scenario]

# セッションアタッチ
tmux attach-session -t strategy  # 戦略チーム
tmux attach-session -t analysis  # 分析チーム

# Claude Code自動起動（認証後）
claude-agents start --auto-claude
```

### エージェント間通信
```bash
# メッセージ送信（動的マッピング対応）
claude-agents send <agent> "<message>"

# Business Strategyシナリオの例
claude-agents send ceo "新しい事業戦略について議論を開始してください"
claude-agents send cto "技術的実現可能性を評価してください"
claude-agents send cfo "財務インパクトを分析してください"

# Hello Worldシナリオの例
claude-agents send president "Hello World プロジェクトを開始してください"
claude-agents send boss1 "worker達に作業を指示してください"

# 利用可能エージェント一覧
claude-agents send --list
```

### シナリオ管理
```bash
# シナリオ一覧表示
claude-agents list [--detailed]

# シナリオ切り替え（実行時）
claude-agents switch <scenario>

# シナリオ詳細情報
claude-agents status --scenario
```

### デバッグ・確認
```bash
# システム状態確認
claude-agents status [--tmux] [--agents]

# 送信ログ確認
claude-agents status --logs
cat logs/send_log.jsonl

# 設定ファイル確認
cat claude-agents.json

# tmuxセッション状態
tmux list-sessions
claude-agents status --tmux
```

### 環境管理
```bash
# 環境リセット（対話式）
claude-agents reset

# 強制リセット
claude-agents reset --force

# 設定再初期化
claude-agents init --force
```

## エージェント役割定義

### Business Strategy シナリオ
```json
{
  "ceo": {
    "role": "最高経営責任者",
    "responsibilities": ["戦略方針決定", "全体統括", "意思決定"],
    "session": "strategy",
    "pane": 0
  },
  "cto": {
    "role": "最高技術責任者", 
    "responsibilities": ["技術的実現可能性", "アーキテクチャ設計", "技術投資"],
    "session": "strategy",
    "pane": 1
  },
  "cfo": {
    "role": "最高財務責任者",
    "responsibilities": ["財務分析", "ROI計算", "予算管理"],
    "session": "strategy", 
    "pane": 2
  },
  "marketing_director": {
    "role": "マーケティング責任者",
    "responsibilities": ["市場分析", "競合調査", "マーケティング戦略"],
    "session": "strategy",
    "pane": 3
  },
  "product_manager": {
    "role": "プロダクトマネージャー",
    "responsibilities": ["プロダクト戦略", "要件定義", "ロードマップ"],
    "session": "analysis",
    "pane": 0
  },
  "data_analyst": {
    "role": "データアナリスト", 
    "responsibilities": ["データ分析", "KPI設計", "レポート作成"],
    "session": "analysis",
    "pane": 1
  }
}
```

### Hello World シナリオ（基本デモ）
```json
{
  "president": {
    "role": "統括責任者",
    "responsibilities": ["プロジェクト統括", "最終意思決定"],
    "session": "president",
    "pane": 0
  },
  "boss1": {
    "role": "チームリーダー",
    "responsibilities": ["チーム管理", "作業指示", "進捗管理"],
    "session": "multiagent", 
    "pane": 0
  },
  "worker1,2,3": {
    "role": "ワーカー",
    "responsibilities": ["作業実行", "完了報告"],
    "session": "multiagent",
    "pane": "1-3"
  }
}
```

## デモ実行手順（NPMパッケージ版）

### 1. インストールと初期化
```bash
# Step 1: インストール
npm install -g claude-agents

# Step 2: プロジェクト初期化
mkdir my-ai-team && cd my-ai-team
claude-agents init --scenario business-strategy
```

### 2. エージェント起動
```bash
# Step 3: tmuxセッション自動構築
claude-agents start

# Step 4: Claude Code起動（各ペインで認証）
# 手動認証: 最初のペインで認証後、他ペインは自動認証
```

### 3. セッション参加
```bash
# Step 5: 戦略チームセッション
tmux attach-session -t strategy

# または分析チーム
tmux attach-session -t analysis
```

### 4. シナリオ実行
```bash
# Step 6: CEOペイン（左上）で実行
# 「あなたはCEOです。新しい事業戦略について議論を開始してください」

# Step 7: エージェント間コミュニケーション
claude-agents send cto "技術的実現可能性を評価してください"
claude-agents send cfo "財務インパクトを計算してください"
```

## 重要な実装詳細

### NPMパッケージ構造
```
claude-agents/
├── bin/
│   └── claude-agents.js        # CLI エントリーポイント
├── lib/
│   ├── commands/               # CLIコマンド実装
│   │   ├── init.js            # プロジェクト初期化
│   │   ├── start.js           # エージェント起動
│   │   ├── send.js            # メッセージ送信
│   │   ├── switch.js          # シナリオ切り替え
│   │   └── status.js          # 状態確認
│   ├── core/                  # コア機能
│   │   ├── config-manager.js  # 設定管理
│   │   ├── scenario-manager.js # シナリオ管理
│   │   ├── tmux-manager.js    # tmuxセッション管理
│   │   ├── agent-manager.js   # エージェントマッピング
│   │   └── claude-manager.js  # Claude Code統合
│   └── utils/                 # ユーティリティ
│       ├── dependency-checker.js
│       └── file-helpers.js
└── templates/                 # シナリオテンプレート
    └── scenarios/
```

### 設定ファイル（claude-agents.json）
```json
{
  "version": "2.0.0",
  "currentScenario": "business-strategy",
  "projectName": "MyProject",
  "scenarios": {
    "business-strategy": {
      "name": "Business Strategy Discussion",
      "description": "事業戦略や経営方針を議論するシナリオ",
      "tmux_sessions": { /* セッション定義 */ },
      "agents": { /* エージェント定義 */ }
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

### 動的エージェントマッピング
```bash
# agent-manager.js による自動マッピング生成
{
  "ceo": "strategy:1.1",              # strategy セッション, pane 1
  "cto": "strategy:1.2",              # strategy セッション, pane 2  
  "cfo": "strategy:1.3",              # strategy セッション, pane 3
  "marketing_director": "strategy:1.4", # strategy セッション, pane 4
  "product_manager": "analysis:1.1",    # analysis セッション, pane 1
  "data_analyst": "analysis:1.2"       # analysis セッション, pane 2
}
```

### エラーハンドリング
```javascript
// 依存関係チェック
async function checkDependencies() {
  const checks = [
    checkTmux(),    // tmux availability
    checkClaude(),  // Claude CLI availability  
    checkNode()     // Node.js version
  ];
  // エラー時は詳細な解決方法を提示
}

// tmux操作エラー処理
try {
  await execTmuxCommand(`tmux send-keys -t ${target} "${message}" C-m`);
} catch (error) {
  throw new Error(`Tmux送信失敗: ${error.message}`);
}
```

### ログ管理
```javascript
// 構造化ログ（JSONL形式）
{
  "timestamp": "2025-06-15T14:00:00.000Z",
  "agent": "ceo", 
  "target": "strategy:1.1",
  "message": "戦略会議を開始します",
  "length": 12
}

// 日次ログローテーション
./logs/send_2025-06-15.jsonl
./logs/send_log.jsonl
```

## 開発履歴

### Phase 1: Bashスクリプト版（v1.x）
- **期間**: 2025年5月-6月
- **特徴**: tmux直接操作ベース
- **主要ツール**: 
  - `setup.sh` - 環境構築
  - `agent-send.sh` - メッセージ送信
  - `scenario-manager.sh` - シナリオ管理
  - `config.yaml` - YAML設定
- **制限**: Linux/macOS依存、エラーハンドリング不十分

### Phase 2: NPMパッケージ化（v2.0）
- **期間**: 2025年6月
- **特徴**: Node.js/Commander.jsベースの統合CLI
- **改善点**:
  - 統合設定管理（claude-agents.json）
  - 包括的エラーハンドリング
  - 対話式インターフェース
  - クロスプラットフォーム対応
  - 依存関係自動チェック
  - ログ管理の高度化
- **移行理由**: 
  - 保守性向上
  - ユーザビリティ改善
  - 拡張性確保
  - エンタープライズ対応

## NPMパッケージAPI

### ライブラリとしての使用
```javascript
const ClaudeAgents = require('claude-agents');

// 設定管理
await ClaudeAgents.config.load();
await ClaudeAgents.config.setCurrentScenario('business-strategy');

// シナリオ操作
await ClaudeAgents.scenarios.list();
await ClaudeAgents.scenarios.reset();

// エージェント操作
await ClaudeAgents.start('business-strategy');
await ClaudeAgents.send('ceo', 'メッセージ');
await ClaudeAgents.status();
```

### プログラマティック制御
```javascript
// カスタムシナリオ作成
const customScenario = {
  name: "Custom Team",
  agents: {
    leader: { role: "チームリーダー", session: "main", pane: 0 },
    member1: { role: "メンバー1", session: "main", pane: 1 }
  }
};

await ClaudeAgents.config.updateScenarioConfig('custom', customScenario);
```

## カスタムシナリオ作成ガイド

### 1. シナリオ定義
```javascript
// scenarios/my-scenario/config.json
{
  "name": "My Custom Scenario",
  "description": "カスタムシナリオの説明", 
  "tmux_sessions": {
    "main": {
      "window_name": "main-team",
      "panes": [
        { "role": "leader", "color": "red" },
        { "role": "member1", "color": "blue" },
        { "role": "member2", "color": "green" }
      ]
    }
  },
  "agents": {
    "leader": { "role": "リーダー", "session": "main", "pane": 0 },
    "member1": { "role": "メンバー1", "session": "main", "pane": 1 },
    "member2": { "role": "メンバー2", "session": "main", "pane": 2 }
  }
}
```

### 2. 指示書作成
```markdown
# scenarios/my-scenario/instructions/leader.md
# リーダーの役割

あなたはチームのリーダーです。

## 責任
- チーム全体の統括
- 意思決定の最終責任
- メンバーへの指示・調整

## 行動指針
1. 明確な指示を出す
2. メンバーの意見を聞く  
3. 最終的な判断を下す
```

### 3. シナリオ登録
```bash
# 設定に追加
claude-agents init --scenario my-scenario

# または手動で claude-agents.json に追加
```

## トラブルシューティング

### 一般的な問題

**問題**: `claude-agents: command not found`
```bash
# 解決方法
npm install -g claude-agents
# または
npm link  # ローカル開発時
```

**問題**: tmuxセッションが見つからない
```bash
# 確認
claude-agents status --tmux
tmux list-sessions

# 修復
claude-agents reset
claude-agents start
```

**問題**: エージェントマッピングエラー
```bash
# 確認
claude-agents status --agents
cat ./tmp/agent_mapping.json

# 修復  
claude-agents switch <current-scenario>
```

**問題**: Claude Code認証エラー
```bash
# 手動認証
tmux attach-session -t strategy
# 最初のペインで claude コマンド実行・認証
# その後他ペインも claude コマンド実行
```

### ログ確認
```bash
# 送信ログ
claude-agents status --logs
tail -f logs/send_log.jsonl

# NPMデバッグログ  
DEBUG=claude-agents* claude-agents start

# tmuxデバッグ
tmux list-sessions -v
```

### 完全リセット手順
```bash
# 1. 全セッション終了
tmux kill-server

# 2. 設定クリア  
rm -f claude-agents.json
rm -rf ./tmp ./logs

# 3. 再初期化
claude-agents init
claude-agents start
```

## 拡張方法

### カスタムコマンド追加
```javascript
// lib/commands/my-command.js
async function myCommand(options) {
  console.log('カスタムコマンド実行');
  // 実装
}

module.exports = myCommand;
```

### プラグインシステム
```javascript
// plugins/my-plugin.js
module.exports = {
  name: 'my-plugin',
  commands: {
    'my-cmd': require('./commands/my-command')
  },
  hooks: {
    'before-start': async (config) => {
      // start前の処理
    }
  }
};
```

---

**claude-agents v2.0** - エンタープライズグレードのマルチエージェント協働プラットフォーム 🚀