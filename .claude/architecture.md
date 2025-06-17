# システムアーキテクチャ詳細

claude-agentsの詳細なアーキテクチャと技術実装について説明します。

## NPMパッケージ構造

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

### ディレクトリ構造
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

## エージェント階層構造

### システム全体構成
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

## 設定管理システム

### 設定ファイル（claude-agents.yaml）
```yaml
version: 2.0.0
currentScenario: business-strategy
projectName: MyProject

scenarios:
  business-strategy:
    name: Business Strategy Discussion
    description: 事業戦略や経営方針を議論するシナリオ
    tmux_sessions: # セッション定義
    agents: # エージェント定義

settings:
  tmuxPrefix: C-b
  autoStartClaude: true
  logLevel: info
  colorOutput: true
```

### シナリオ定義形式
```yaml
# scenarios/*/scenario.yaml
name: Business Strategy Discussion
description: 事業戦略ディスカッション
tmux_sessions:
  strategy:
    window_name: strategy-team
    panes: 
      - role: ceo
        color: red
      - role: cto
        color: blue
agents:
  ceo:
    role: 最高経営責任者
    session: strategy
    pane: 0
    responsibilities:
      - 戦略方針決定
      - 全体統括
```

## 動的エージェントマッピング

### マッピング生成メカニズム
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

### マッピング管理
- **JSON形式**: `tmp/agent_mapping.json`（Node.js用）
- **Shell形式**: `tmp/agent_mapping.sh`（互換性用）
- **動的生成**: シナリオ変更時の自動再生成
- **検証機能**: マッピングの整合性チェック

## エラーハンドリングシステム

### 依存関係チェック
```javascript
async function checkDependencies() {
  const checks = [
    checkTmux(),    // tmux availability
    checkClaude(),  // Claude CLI availability  
    checkNode()     // Node.js version
  ];
  // エラー時は詳細な解決方法を提示
}
```

### tmux操作エラー処理
```javascript
try {
  await execTmuxCommand(`tmux send-keys -t ${target} "${message}" C-m`);
} catch (error) {
  throw new Error(`Tmux送信失敗: ${error.message}`);
}
```

### 包括的エラー対応
- **設定ファイルエラー**: 不正な設定の検出と修復提案
- **tmuxエラー**: セッション/ペインの存在確認と自動修復
- **通信エラー**: 送信失敗時のリトライ機構
- **依存関係エラー**: 不足ツールの検出と解決手順提示

## ログ管理システム

### 構造化ログ（JSONL形式）
```javascript
{
  "timestamp": "2025-06-15T14:00:00.000Z",
  "agent": "ceo", 
  "target": "strategy:1.1",
  "message": "戦略会議を開始します",
  "length": 12
}
```

### ログローテーション
```
./logs/
├── send_log.jsonl          # 最新ログ
├── send_2025-06-15.jsonl   # 日次ローテーション
├── send_2025-06-16.jsonl
└── archive/                # アーカイブ
    └── 2025-06-15T14-06-48-109Z/
```

### ログ分析機能
- **構造化クエリ**: jqコマンドでの高度な分析
- **パフォーマンス監視**: 送信頻度、応答時間の追跡
- **エラー分析**: 失敗パターンの自動検出

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

## 拡張メカニズム

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

### カスタムコマンド追加
```javascript
// lib/commands/my-command.js
async function myCommand(options) {
  console.log('カスタムコマンド実行');
  // 実装
}

module.exports = myCommand;
```

## パフォーマンス最適化

### 非同期処理設計
- **Promise-based**: 全てのI/O操作は非同期
- **並列実行**: 複数tmuxコマンドの並列処理
- **エラー境界**: 適切なエラーハンドリング境界

### メモリ効率
- **ストリーミング**: 大量ログの効率的処理
- **キャッシュ**: エージェントマッピングのメモリキャッシュ
- **ガベージコレクション**: 適切なリソース解放

### 負荷分散
- **tmux負荷**: セッション分散による負荷軽減
- **CPU使用量**: 処理の適切な分散
- **I/O最適化**: ファイル操作の効率化

## セキュリティ考慮事項

### 入力検証
- **メッセージサニタイズ**: 特殊文字の適切なエスケープ
- **設定検証**: 不正な設定値の検出
- **パス検証**: ディレクトリトラバーサル攻撃の防止

### アクセス制御
- **ファイル権限**: 適切な権限設定
- **tmuxアクセス**: セッションへのアクセス制御
- **ログ保護**: 機密情報の適切な保護

### 監査機能
- **操作ログ**: 全操作の記録
- **アクセス追跡**: 不正アクセスの検出
- **設定変更**: 設定変更の履歴管理