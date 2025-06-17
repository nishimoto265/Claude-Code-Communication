# Claude Code間通信の仕組み

## 通信アーキテクチャ

本システムでは、複数のClaude Codeインスタンス間の通信を**tmux**を介したメッセージングシステムで実現しています。

### 1. tmuxセッション構成
- 各Claude Codeインスタンスは独立したtmuxペインで実行
- セッション内で複数ペインに分割（例: strategy セッション 4ペイン）
- ペイン間でのメッセージ送受信が可能

### 2. エージェントマッピングシステム
- `tmp/agent_mapping.json`でエージェント名→tmuxターゲットの対応を管理
- 例: `"ceo": "strategy:1.1"` (strategyセッション、ペイン1)
- 動的マッピング生成により柔軟な構成に対応

### 3. メッセージ送信プロセス

```javascript
// lib/commands/send.js の主要フロー
1. エージェント名解決（エイリアス対応）
2. tmuxターゲット特定（例: "strategy:1.2"）
3. プロンプトクリア（Ctrl+C送信）
4. メッセージ送信（エスケープ処理済み）
5. ログ記録（logs/send_log.jsonl）
```

## 実装詳細

### エスケープ処理
tmuxでのメッセージ送信時に特殊文字を適切にエスケープ：

```javascript
function escapeMessage(message) {
  return message
    .replace(/\\/g, '\\\\')      // バックスラッシュ
    .replace(/"/g, '\\"')        // ダブルクォート
    .replace(/\$/g, '\\$')       // ドル記号
    .replace(/`/g, '\\`');       // バッククォート
}
```

### tmuxコマンド実行
実際の通信は以下のtmuxコマンドで実現：

```bash
# プロンプトクリア
tmux send-keys -t "strategy:1.1" C-c

# メッセージ送信
tmux send-keys -t "strategy:1.1" "メッセージ内容" C-m
```

### 送信ログ
全ての通信はJSONL形式で記録され、後で分析可能：

```json
{
  "timestamp": "2025-06-17T10:00:00.000Z",
  "agent": "ceo", 
  "target": "strategy:1.1",
  "message": "戦略会議を開始します",
  "length": 12
}
```

## エラーハンドリング

### 通信エラーの処理
- tmux セッション/ペインが存在しない場合の適切なエラーメッセージ
- エージェント名の解決失敗時のサジェスション表示
- 送信失敗時の詳細なエラー情報とスタックトレース

### 依存関係チェック
```javascript
async function checkDependencies() {
  const checks = [
    checkTmux(),     // tmux availability
    checkClaude(),   // Claude CLI availability  
    checkNode()      // Node.js version
  ];
  // エラー時は詳細な解決方法を提示
}
```

## パフォーマンス最適化

### 非同期処理
- tmuxコマンドの並列実行
- エージェントマッピングのキャッシュ機能
- 送信間隔の調整（デフォルト0.5秒）

### ログ管理
- 日次ログローテーション
- ログファイルサイズの制限
- 古いログの自動アーカイブ

## セキュリティ考慮事項

### メッセージ制限
- メッセージ長の制限（200文字でトランケート）
- 特殊文字の適切なエスケープ
- ログ記録時の機密情報マスキング

### アクセス制御
- tmuxセッションへのアクセス権限管理
- エージェント間の通信権限制御
- ログファイルの適切な権限設定