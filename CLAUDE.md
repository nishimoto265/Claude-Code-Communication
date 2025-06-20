# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**claude-agents**は、NPMパッケージ化されたエンタープライズグレードのマルチエージェント協働システムです。tmuxを介してClaude Codeインスタンス間の通信を実現し、現実的なビジネスシナリオベースのコラボレーションを可能にします。

### システム構成
- **NPMパッケージ**: Commander.js ベースの統合CLI
- **tmux統合**: マルチペイン管理による並列実行
- **エージェントマッピング**: 動的なtmuxターゲット管理
- **設定管理**: JSON/YAML形式の統合設定

### 主要シナリオ
- **business-strategy**: CEO、CTO、CFO、マーケティング責任者による戦略討議
- **collaborative-coding**: アーキテクト、フロントエンド、バックエンド開発者の協働
- **market-analysis**: 市場調査と競合分析チーム
- **hello-world**: 基本的なマルチエージェント通信デモ

## Claude Code間通信の仕組み

### 通信アーキテクチャ
本システムの中核となる通信メカニズムは、**tmuxを介したメッセージング**です：

1. **tmuxセッション構成**: 各Claude Codeインスタンスが独立したtmuxペインで実行
2. **エージェントマッピング**: `tmp/agent_mapping.json`でエージェント名→tmuxターゲットを管理
3. **メッセージ送信**: `tmux send-keys`コマンドによる直接的なテキスト送信

### 実装フロー（lib/commands/send.js）
```javascript
1. エージェント名解決（エイリアス対応）
2. tmuxターゲット特定（例: "strategy:1.2"）
3. プロンプトクリア（Ctrl+C送信）
4. メッセージ送信（エスケープ処理済み）
5. ログ記録（logs/send_log.jsonl）
```

### 通信例
```bash
# エージェント間メッセージ送信
claude-agents send ceo "新しい事業戦略について議論を開始してください"
claude-agents send cto "技術的実現可能性を評価してください"

# 実際のtmuxコマンド（内部実行）
tmux send-keys -t "strategy:1.1" "新しい事業戦略について..." C-m
```

📖 **詳細**: [.claude/communication.md](.claude/communication.md)

## 必須開発コマンド

### セットアップとテスト
```bash
# 依存関係インストール
npm install

# テスト実行（Jest、カバレッジ80%閾値）
npm test
npm run test:coverage

# ローカル開発用グローバルリンク
npm link
```

### 基本開発フロー
```bash
# 直接実行（開発時）
node bin/claude-agents.js init
node bin/claude-agents.js start business-strategy

# カスタムシナリオ作成
node bin/claude-agents.js create-scenario

# デバッグモード
DEBUG=claude-agents* claude-agents start

# 設定・ログ確認
cat claude-agents.yaml
tail -f logs/send_log.jsonl
```

📖 **詳細**: [.claude/development.md](.claude/development.md)

## 🧠 Claude Code Knowledge

### 学習内容・知見
Claude Codeが本プロジェクトで蓄積した知識と改善提案を体系的に管理しています。

📚 **学習内容**: [.claude/knowledge.md](.claude/knowledge.md)  
💡 **改善提案**: [.claude/improvements.md](.claude/improvements.md)

これらのファイルには以下が記録されます：
- プロジェクト固有の最適開発パターン
- よく発生する問題と解決方法
- パフォーマンス最適化の知見
- 実装済み・検討中の改善案

## 📚 詳細ドキュメント

### .claude/ ディレクトリ構成

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

### アーキテクチャと実装
- **[システムアーキテクチャ](.claude/architecture.md)**: NPMパッケージ構造、設定管理、エラーハンドリング
- **[通信システム詳細](.claude/communication.md)**: tmux通信の実装詳細、エスケープ処理、ログ管理

### 開発者向けガイド
- **[開発者ガイド](.claude/development.md)**: セットアップ、テスト、デバッグ、拡張方法
- **[コマンドリファレンス](.claude/commands.md)**: 全コマンドの詳細オプションと使用例

### シナリオ管理
- **[シナリオ管理](.claude/scenarios.md)**: 利用可能シナリオの詳細、実行手順、tmuxセッション構成
- **[カスタムシナリオ作成](.claude/custom-scenarios.md)**: 独自シナリオの作成方法、業界別サンプル

### トラブルシューティング・管理
- **[トラブルシューティング](.claude/troubleshooting.md)**: 一般的な問題と解決方法、デバッグ手順
- **[開発履歴・移行](.claude/migration.md)**: プロジェクト履歴、v1.xからv2.0への移行ガイド

### Claude Code設定・権限管理
- **[権限設定](.claude/settings.local.json)**: Claude Code権限管理ファイル
  - tmux操作、claude-agents、npm testなど40個のコマンド許可設定
  - プロジェクト固有の権限制御で安全性を確保

## 重要な技術ポイント

### エラーハンドリング
- 依存関係チェック（tmux, Node.js バージョン確認）
- 詳細なエラーメッセージとスタックトレース出力
- tmuxコマンド実行失敗時の適切なエラー処理

### テスト戦略
- **Jest設定**: カバレッジ閾値 80%、テストタイムアウト 20秒
- **モック化**: tmuxコマンドはモック化して単体テスト
- **主要テスト**: Agent Manager、Tmux Manager、Config Manager、Send Command

### パフォーマンス最適化
- 非同期処理によるtmuxコマンド並列実行
- エージェントマッピングのキャッシュ機能
- ログファイルの日次ローテーション

### 拡張性
- プラグインシステム対応の設計
- カスタムシナリオの動的読み込み
- APIとしてのライブラリ利用（`require('claude-agents')`）

---

*このCLAUDE.mdは、開発者が迅速にプロジェクトを理解し、効果的に開発を進められるよう設計されています。詳細な情報は各専門ドキュメントを参照してください。*