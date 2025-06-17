# 開発者ガイド

このファイルは、claude-agentsプロジェクトでの開発に必要な情報をまとめています。

## セットアップ

### 前提条件
- **Node.js**: 14.0.0以上
- **tmux**: マルチペイン管理
- **Claude Code**: AI開発アシスタント

### 基本セットアップ
```bash
# リポジトリクローン
git clone <repository>
cd CC-ProductManagement

# 依存関係インストール
npm install

# 開発用グローバルリンク作成
npm link

# 基本動作確認
claude-agents --help
```

## テスト実行

### Jest設定
- **カバレッジ閾値**: branches/functions/lines/statements 80%
- **テストタイムアウト**: 20秒
- **モック**: tmuxコマンドはモック化して単体テスト

### テストコマンド
```bash
# 全テスト実行
npm test

# カバレッジ付きテスト（80%閾値）
npm run test:coverage

# ウォッチモード（開発時）
npm run test:watch

# 特定テストファイル実行
npm test -- tests/core/agent-manager.test.js
npm test -- tests/commands/send.test.js

# カバレッジレポート確認
open coverage/lcov-report/index.html
```

### テスト作成のベストプラクティス
```javascript
// モック化の例
jest.mock('child_process');
const { spawn } = require('child_process');

describe('TmuxManager', () => {
  beforeEach(() => {
    // tmuxコマンドのモック設定
    spawn.mockImplementation(() => ({
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(0);
      })
    }));
  });

  test('should create tmux session', async () => {
    // テスト実装
  });
});
```

## ローカル開発

### 直接実行
```bash
# CLIの直接実行
node bin/claude-agents.js init
node bin/claude-agents.js start business-strategy
node bin/claude-agents.js send ceo "テストメッセージ"

# カスタムシナリオ作成（新機能）
node bin/claude-agents.js create-scenario

# デバッグモード
DEBUG=claude-agents* node bin/claude-agents.js start
```

### 開発用コマンド
```bash
# パッケージ配布準備
npm pack

# 依存関係の脆弱性チェック
npm audit

# コードスタイルチェック（設定されている場合）
npm run lint
```

## デバッグ方法

### ログ確認
```bash
# 送信ログ確認
cat logs/send_log.jsonl
tail -f logs/send_log.jsonl

# 日付別ログ
cat logs/send_2025-06-17.jsonl

# ログの構造化確認
jq . logs/send_log.jsonl | head -20
```

### tmux状態確認
```bash
# セッション一覧
tmux list-sessions

# 特定セッションのペイン確認
tmux list-panes -t strategy

# ペインの詳細情報
tmux list-panes -t strategy -F "#{pane_index}:#{pane_current_command}:#{pane_title}"
```

### エージェントマッピング確認
```bash
# マッピング状況確認
cat tmp/agent_mapping.json

# マッピングの整合性チェック
claude-agents status --agents
```

### よく使うデバッグシナリオ
```bash
# 1. 全体状況確認
claude-agents status --tmux --agents

# 2. ログ監視しながらメッセージ送信
tail -f logs/send_log.jsonl &
claude-agents send ceo "デバッグメッセージ"

# 3. tmuxセッション内容確認
tmux capture-pane -t strategy:1.1 -p
```

## アーキテクチャ理解

### 主要コンポーネント
```
lib/
├── commands/          # CLIコマンド実装
│   ├── init.js       # プロジェクト初期化
│   ├── start.js      # エージェント起動
│   ├── send.js       # メッセージ送信 ⭐
│   ├── create-scenario.js # シナリオ作成ウィザード ⭐ NEW
│   ├── switch.js     # シナリオ切り替え
│   └── status.js     # 状態確認
├── core/             # コア機能
│   ├── agent-manager.js    # エージェントマッピング ⭐
│   ├── tmux-manager.js     # tmuxセッション管理 ⭐
│   ├── config-manager.js   # 設定管理
│   └── scenario-manager.js # シナリオ管理
└── utils/            # ユーティリティ
    ├── dependency-checker.js
    ├── scenario-generator.js # シナリオファイル生成 ⭐ NEW
    └── file-helpers.js
```

### 重要な処理フロー
1. **初期化**: `init.js` → 設定ファイル生成
2. **シナリオ作成**: `create-scenario.js` → `scenario-generator.js` → YAML自動生成 ⭐ NEW
3. **セッション構築**: `start.js` → `tmux-manager.js` → tmux自動構築
4. **エージェント配置**: `agent-manager.js` → 動的マッピング生成
5. **メッセージ送信**: `send.js` → tmuxターゲット特定 → 送信実行

## 拡張ポイント

### カスタムコマンド追加
```javascript
// lib/commands/my-command.js
async function myCommand(options) {
  console.log('カスタムコマンド実行');
  // 実装
}

module.exports = myCommand;

// bin/claude-agents.js に追加
program
  .command('my-command')
  .description('My custom command')
  .action(require('../lib/commands/my-command'));
```

### プラグインシステム活用
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
    },
    'after-send': async (result) => {
      // send後の処理
    }
  }
};
```

### APIとしての利用
```javascript
const ClaudeAgents = require('claude-agents');

// プログラマティック制御
await ClaudeAgents.init({ scenario: 'business-strategy' });
await ClaudeAgents.start();
await ClaudeAgents.send('ceo', 'プログラムからのメッセージ');
```

## パフォーマンス最適化

### 開発時の高速化
```bash
# テストの並列実行
npm test -- --maxWorkers=4

# 特定のテストファイルのみ監視
npm run test:watch -- tests/core/agent-manager.test.js

# キャッシュクリア（問題発生時）
npm test -- --clearCache
```

### プロファイリング
```javascript
// パフォーマンス測定例
console.time('agent-mapping-generation');
const mapping = await generateAgentMapping(scenario);
console.timeEnd('agent-mapping-generation');
```

## トラブルシューティング

### よく発生する開発時の問題
1. **テスト失敗**: `npm test -- --verbose` で詳細確認
2. **tmuxセッション残存**: `tmux kill-server` で全クリア
3. **権限エラー**: `npm link` の再実行
4. **ポート競合**: 他のアプリケーションとの競合確認

### 開発環境リセット
```bash
# 完全リセット手順
tmux kill-server
rm -rf node_modules package-lock.json
rm -f claude-agents.json
rm -rf tmp logs
npm install
npm link
```

---

*効率的な開発のために、このガイドを活用してください。*