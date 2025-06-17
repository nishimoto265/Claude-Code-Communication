# トラブルシューティング

claude-agentsで発生する一般的な問題と解決方法をまとめています。

## 一般的な問題

### インストール・セットアップ関連

#### 問題: `claude-agents: command not found`
**症状**: コマンドが認識されない
```bash
$ claude-agents --help
claude-agents: command not found
```

**解決方法**:
```bash
# グローバルインストール
npm install -g claude-agents

# または（ローカル開発時）
npm link

# パス確認
which claude-agents
echo $PATH
```

**根本原因**: NPMのグローバルパスが正しく設定されていない

#### 問題: 権限エラー
**症状**: インストール時に権限エラーが発生
```bash
Error: EACCES: permission denied
```

**解決方法**:
```bash
# npm権限設定
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# またはnvmを使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

### tmux関連の問題

#### 問題: tmuxセッションが見つからない
**症状**: エージェント起動後にセッションが存在しない
```bash
$ tmux attach-session -t strategy
no server running on /tmp/tmux-501/default
```

**確認手順**:
```bash
# セッション状態確認
claude-agents status --tmux
tmux list-sessions

# tmuxサーバー状態確認
tmux has-server && echo "tmux server running" || echo "tmux server not running"
```

**解決方法**:
```bash
# tmuxサーバー再起動
tmux kill-server
claude-agents reset
claude-agents start

# 手動セッション作成確認
tmux new-session -d -s test-session
tmux list-sessions
tmux kill-session -t test-session
```

#### 問題: tmuxペイン不足
**症状**: エージェント数よりもペイン数が少ない
```bash
Error: Cannot create pane: tmux split-window failed
```

**確認手順**:
```bash
# ペイン状況確認
tmux list-panes -t strategy
claude-agents status --agents
```

**解決方法**:
```bash
# セッション再構築
claude-agents reset --force
claude-agents start

# 手動でペイン作成確認
tmux new-session -d -s debug
tmux split-window -t debug
tmux split-window -t debug
tmux list-panes -t debug
tmux kill-session -t debug
```

#### 問題: tmux権限エラー
**症状**: tmuxソケットへのアクセス権限がない
```bash
error connecting to /tmp/tmux-501/default (Permission denied)
```

**解決方法**:
```bash
# tmuxソケット権限確認
ls -la /tmp/tmux-*/
whoami

# tmuxソケットクリア
rm -rf /tmp/tmux-*/default
tmux kill-server
```

### エージェント関連の問題

#### 問題: エージェントマッピングエラー
**症状**: エージェント名が解決できない
```bash
❌ エージェント 'ceo' が見つかりません
```

**確認手順**:
```bash
# マッピング状況確認
claude-agents status --agents
cat tmp/agent_mapping.json

# 設定ファイル確認
cat claude-agents.json
```

**解決方法**:
```bash
# マッピング再生成
claude-agents switch <current-scenario>

# 手動マッピング修復
rm -f tmp/agent_mapping.*
claude-agents start

# 利用可能エージェント確認
claude-agents send --list
```

#### 問題: エージェント通信失敗
**症状**: メッセージ送信が失敗する
```bash
❌ 送信エラー: Tmux送信失敗: command failed
```

**デバッグ手順**:
```bash
# 詳細エラー確認
claude-agents send ceo "test" --verbose

# tmuxターゲット確認
tmux has-session -t strategy
tmux list-panes -t strategy

# 手動送信テスト
tmux send-keys -t strategy:1.1 "manual test" C-m
```

**解決方法**:
```bash
# ターゲット再確認
claude-agents status --tmux --agents

# セッション再作成
claude-agents reset
claude-agents start

# 段階的確認
claude-agents send ceo "short message"
```

### 設定ファイル関連の問題

#### 問題: 設定ファイルが見つからない
**症状**: 初期化前にコマンド実行
```bash
❌ 設定ファイルが見つかりません
💡 まず初期化を実行してください: claude-agents init
```

**解決方法**:
```bash
# 初期化実行
claude-agents init --scenario business-strategy

# 設定ファイル確認
ls -la claude-agents.*
cat claude-agents.json
```

#### 問題: 設定ファイル破損
**症状**: JSON形式エラー
```bash
Error: Invalid JSON in claude-agents.json
```

**解決方法**:
```bash
# JSONバリデーション
cat claude-agents.json | jq .

# バックアップからの復元
git checkout HEAD -- claude-agents.json

# 強制再初期化
rm claude-agents.json
claude-agents init --force
```

### Claude Code関連の問題

#### 問題: Claude Code認証エラー
**症状**: 各ペインでClaude Codeが起動しない
```bash
Error: Claude authentication failed
```

**解決方法**:
```bash
# 手動認証手順
tmux attach-session -t strategy

# 最初のペインで認証
# 1. claude コマンド実行
# 2. ブラウザでの認証完了
# 3. 他のペインでも claude コマンド実行

# 認証状態確認
claude --version
```

#### 問題: Claude Code バージョン不一致
**症状**: 古いバージョンでの動作不良

**解決方法**:
```bash
# Claude Code更新
# 1. https://claude.ai/code から最新版ダウンロード
# 2. インストール実行
# 3. バージョン確認
claude --version

# 依存関係再チェック
claude-agents status --verbose
```

## ログ確認とデバッグ

### 送信ログ分析
```bash
# リアルタイムログ監視
tail -f logs/send_log.jsonl

# 送信成功率確認
jq -r '.timestamp + " " + .agent + " " + (.length|tostring)' logs/send_log.jsonl

# エラーパターン分析
grep -i error logs/send_log.jsonl
```

### NPMデバッグログ
```bash
# 詳細デバッグログ
DEBUG=claude-agents* claude-agents start

# 特定モジュールのみ
DEBUG=claude-agents:tmux* claude-agents start
DEBUG=claude-agents:agent* claude-agents send ceo "test"
```

### tmuxデバッグ
```bash
# tmux詳細状態
tmux list-sessions -v
tmux info

# ペイン詳細情報
tmux list-panes -t strategy -F "#{pane_index}:#{pane_current_command}:#{pane_title}:#{pane_active}"

# tmuxサーバー情報
tmux show-options -g
```

## 完全リセット手順

### 段階的リセット
```bash
# Level 1: ソフトリセット
claude-agents reset

# Level 2: 設定クリア
rm -f claude-agents.json
claude-agents init

# Level 3: 全データクリア
rm -rf tmp/ logs/ claude-agents.*
claude-agents init
```

### 強制リセット
```bash
# 1. 全tmuxセッション終了
tmux kill-server

# 2. 全設定・データクリア
rm -f claude-agents.json claude-agents.yaml
rm -rf ./tmp ./logs

# 3. プロセス確認
ps aux | grep tmux
ps aux | grep claude

# 4. 再初期化
claude-agents init --scenario business-strategy
claude-agents start
```

### 環境クリーンアップ
```bash
# NPMキャッシュクリア
npm cache clean --force

# グローバルパッケージ再インストール
npm uninstall -g claude-agents
npm install -g claude-agents

# ローカル開発環境リセット
rm -rf node_modules package-lock.json
npm install
npm link
```

## パフォーマンス問題

### 送信遅延の問題
**症状**: メッセージ送信が極端に遅い

**診断**:
```bash
# 送信時間測定
time claude-agents send ceo "test message"

# システムリソース確認
top -p $(pgrep tmux)
```

**解決方法**:
```bash
# 待機時間調整
claude-agents send ceo "message" --wait 0.1

# tmuxセッション数削減
claude-agents reset
# より少ないエージェント数のシナリオに変更
```

### メモリ使用量過多
**症状**: システムメモリが不足

**確認**:
```bash
# メモリ使用量確認
ps aux --sort=-%mem | head
du -sh logs/

# ログファイルサイズ確認
ls -lah logs/
```

**解決方法**:
```bash
# 古いログ削除
find logs/ -name "*.jsonl" -mtime +7 -delete

# ログローテーション設定
# (自動ローテーションは既に実装済み)
```

## 環境依存の問題

### macOS特有の問題
```bash
# Homebrew権限問題
brew doctor
brew update

# macOS tmux設定
brew install tmux
tmux -V  # バージョン確認
```

### Linux特有の問題
```bash
# tmuxインストール
sudo apt update && sudo apt install tmux

# 権限設定
sudo chown -R $USER:$USER ~/.npm-global
```

### Windows WSL問題
```bash
# WSL2確認
wsl --list --verbose

# tmux WSL設定
sudo apt install tmux
export DISPLAY=:0
```

## 外部ツール依存の問題

### Node.js バージョン問題
```bash
# Node.js バージョン確認
node --version  # 14.0.0以上必要

# nvm使用
nvm install 18
nvm use 18
```

### パッケージ依存関係問題
```bash
# 依存関係確認
npm ls --depth=0

# 脆弱性チェック
npm audit
npm audit fix
```

## サポートと追加情報

### ログ収集（サポート用）
```bash
# 診断情報収集
{
  echo "=== System Info ==="
  uname -a
  node --version
  npm --version
  tmux -V
  
  echo "=== Claude Agents Status ==="
  claude-agents status --tmux --agents
  
  echo "=== Recent Logs ==="
  tail -20 logs/send_log.jsonl
  
  echo "=== Tmux Sessions ==="
  tmux list-sessions
} > debug-info.txt
```

### 既知の制限事項
- **最大エージェント数**: tmuxの制限により実質的に12-16エージェントが上限
- **同時セッション数**: システムリソースに依存（通常4-6セッション）
- **メッセージ長**: 長すぎるメッセージはtmuxバッファ制限の影響
- **ネットワーク**: Claude Code認証にはインターネット接続が必要

### パフォーマンス改善のヒント
- 不要なログファイルの定期削除
- エージェント数の適切な制限
- tmuxセッション数の最適化
- システムリソースモニタリング