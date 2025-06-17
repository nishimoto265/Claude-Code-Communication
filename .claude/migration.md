# 開発履歴と移行ガイド

claude-agentsプロジェクトの開発履歴と、バージョン間の移行方法を説明します。

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

#### v1.x の主要コマンド（参考）
```bash
# 旧版（非推奨）
./setup.sh
./agent-send.sh ceo "メッセージ"
./scenario-manager.sh set business-strategy
```

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

#### v2.0 の主要コマンド（現在）
```bash
# 新版（推奨）
claude-agents init
claude-agents send ceo "メッセージ"
claude-agents switch business-strategy
```

### 移行理由
| 項目 | v1.x (Bash) | v2.0 (NPM) |
|------|-------------|------------|
| **保守性** | 個別スクリプト | 統合NPMパッケージ |
| **エラーハンドリング** | 基本的なもの | 包括的なエラー処理 |
| **ユーザビリティ** | コマンド分散 | 統一されたCLI |
| **プラットフォーム対応** | Linux/macOS限定 | クロスプラットフォーム |
| **設定管理** | 複数YAMLファイル | 統合JSON設定 |
| **依存関係チェック** | 手動 | 自動化 |

## v1.x から v2.0 への移行ガイド

### 前提条件の確認
```bash
# Node.js バージョン確認（14.0.0以上必要）
node --version

# NPM確認
npm --version

# tmux確認（両バージョンで必要）
tmux -V
```

### 段階的移行手順

#### 1. 既存環境のバックアップ
```bash
# v1.x の設定とログをバックアップ
mkdir backup-v1x
cp config.yaml backup-v1x/
cp -r logs/ backup-v1x/ 2>/dev/null || true
cp -r tmp/ backup-v1x/ 2>/dev/null || true
```

#### 2. v1.x 環境のクリーンアップ
```bash
# tmuxセッション終了
tmux kill-server

# 古い設定ファイル削除
rm -f config.yaml
rm -rf tmp/ logs/
```

#### 3. v2.0 インストール
```bash
# NPMパッケージインストール
npm install -g claude-agents

# またはローカル開発
git pull origin main  # 最新コード取得
npm install
npm link
```

#### 4. 設定移行
```bash
# v2.0 初期化
claude-agents init --scenario business-strategy

# 既存のカスタム設定がある場合の手動移行
# backup-v1x/config.yaml を参照して claude-agents.json を調整
```

#### 5. 動作確認
```bash
# 基本動作確認
claude-agents status
claude-agents list
claude-agents start
```

### 設定ファイル変換

#### v1.x config.yaml → v2.0 claude-agents.json

**v1.x 形式（config.yaml）**:
```yaml
current_scenario: business-strategy
project_name: MyProject
default_wait_time: 0.5

scenarios:
  business-strategy:
    name: "Business Strategy"
    description: "戦略会議シナリオ"
```

**v2.0 形式（claude-agents.yaml）**:
```yaml
version: 2.0.0
currentScenario: business-strategy
projectName: MyProject

scenarios:
  business-strategy:
    name: Business Strategy Discussion
    description: 事業戦略や経営方針を議論するシナリオ

settings:
  messageWaitTime: 0.5
  autoStartClaude: true
```

### コマンド対応表

| 機能 | v1.x コマンド | v2.0 コマンド |
|------|--------------|--------------|
| **環境セットアップ** | `./setup.sh` | `claude-agents init` |
| **エージェント起動** | `./start-agents.sh` | `claude-agents start` |
| **メッセージ送信** | `./agent-send.sh ceo "message"` | `claude-agents send ceo "message"` |
| **シナリオ切り替え** | `./scenario-manager.sh set <scenario>` | `claude-agents switch <scenario>` |
| **状態確認** | `./check-status.sh` | `claude-agents status` |
| **環境リセット** | `./reset-environment.sh` | `claude-agents reset` |

### カスタムシナリオの移行

#### v1.x シナリオ構造
```
scenarios/
└── my-scenario/
    ├── config.yaml
    ├── agents.yaml
    └── instructions/
```

#### v2.0 シナリオ構造
```
scenarios/
└── my-scenario/
    ├── scenario.yaml      # config.yaml → scenario.yaml
    ├── agents.yaml        # そのまま利用可能
    ├── layout.yaml        # 新規追加（tmuxレイアウト）
    └── instructions/      # そのまま利用可能
```

### 移行時のよくある問題

#### 問題1: パッケージが見つからない
```bash
# 解決方法
npm install -g claude-agents
# または
export PATH=$PATH:~/.npm-global/bin
```

#### 問題2: 設定ファイル形式エラー
```bash
# JSONバリデーション
cat claude-agents.json | jq .

# 修復
claude-agents init --force
```

#### 問題3: tmuxセッション競合
```bash
# 解決方法
tmux kill-server
claude-agents reset --force
claude-agents start
```

### v1.x スクリプトの保持（互換性）

v2.0環境でも一部のv1.x スクリプトは保持されており、必要に応じて使用可能：

```bash
# 残存スクリプト
ls -la *.sh
# agent-send.sh
# check-status.sh
# reset-environment.sh
# scenario-manager.sh
# setup.sh
# start-agents.sh
# switch-scenario.sh
```

ただし、これらは主にデバッグ用途であり、通常は v2.0 コマンドの使用を推奨します。

## 将来のアップグレード

### v2.1 以降の予定機能
- **プラグインシステム拡張**: サードパーティプラグインの容易な統合
- **リアルタイム監視**: Web UIでのエージェント状態可視化
- **大規模シナリオ対応**: 10以上のエージェントでの安定動作
- **設定バックアップ**: クラウドベースの設定同期

### アップグレード準備
```bash
# 現在のバージョン確認
claude-agents --version

# 設定バックアップ
cp claude-agents.json claude-agents.backup.json

# アップグレード実行（将来）
npm update -g claude-agents
```

## 開発コミュニティへの貢献

### 貢献方法
- **バグレポート**: GitHub Issues での報告
- **機能提案**: Enhancement Request の提出
- **コード貢献**: Pull Request の提出
- **ドキュメント改善**: ドキュメントの修正・追加

### 開発環境のセットアップ
```bash
# フォーク＆クローン
git clone https://github.com/your-username/claude-agents.git
cd claude-agents

# 開発依存関係インストール
npm install

# テスト実行
npm test

# 開発用リンク作成
npm link
```

### コントリビューションガイドライン
- **コーディング規約**: ESLint設定に従う
- **テストカバレッジ**: 80%以上を維持
- **コミットメッセージ**: Conventional Commits形式
- **ドキュメント**: 新機能には必ずドキュメント追加

## 技術的負債とメンテナンス

### 既知の技術的負債
- **tmux依存**: ネイティブプロトコルへの移行検討
- **設定管理**: より柔軟な設定システムの必要性
- **エラーハンドリング**: より詳細なエラー分類
- **パフォーマンス**: 大規模シナリオでの最適化

### メンテナンス計画
- **月次**: 依存関係の更新とセキュリティパッチ
- **四半期**: 新機能の追加と既存機能の改善
- **年次**: 主要アーキテクチャの見直し

---

このドキュメントは、プロジェクトの発展に伴って継続的に更新されます。