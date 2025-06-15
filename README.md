# 🤖 Tmux Multi-Agent Communication Demo

Agent同士がやり取りするtmux環境のデモシステム

## 🎯 デモ概要

Bossがワーカーに指示を出し、ワーカーが進捗を報告するループ処理をデモします。

### 👥 エージェント構成

```
📊 multiagent セッション (2ペイン)
├── boss: リーダー
└── worker: 実行担当者
```

## 🚀 クイックスタート

### 0. リポジトリのクローン

```bash
git clone https://github.com/nishimoto265/Claude-Code-Communication.git
cd Claude-Code-Communication
```

### 1. tmux環境構築

⚠️ **注意**: 既存の `multiagent` セッションがある場合は自動的に削除されます。

```bash
./setup.sh
```

### 2. セッションアタッチ

```bash
# マルチエージェント確認
tmux attach-session -t multiagent
# boss と worker のペインが表示されます
```

### 3. Claude Code起動

```bash
# multiagentセッションの各ペインでClaude Codeを起動
for i in {0..1}; do tmux send-keys -t multiagent:0.$i 'claude' C-m; done
```
各ペインで認証プロンプトに従って許可を与えてください。

### 4. デモ実行

bossペインで、あなたはbossです。workerに最初の指示を出してください。 のように入力して開始します。
例:
```
あなたはbossです。指示書に従って、workerに最初の作業指示を出してください。
```

## 📜 指示書について

各エージェントの役割別指示書：
- **boss**: `instructions/boss.md`
- **worker**: `instructions/worker.md`

**Claude Code参照**: `CLAUDE.md` でシステム構造を確認

**要点:**
- **boss**: workerに作業指示を送信します。
- **worker**: 指示に基づいて作業を実行し、結果や進捗をbossに報告します。
- このプロセスがループします。

## 🎬 期待される動作フロー

```
1. Boss → Worker: (何らかの作業指示)
2. Worker: (作業実行)
3. Worker → Boss: (進捗/完了報告)
4. Boss: (報告に基づき次の指示を検討、1に戻る)
```

## 🔧 手動操作

### agent-send.shを使った送信

```bash
# 基本送信
./agent-send.sh [エージェント名] [メッセージ]

# 例
./agent-send.sh boss "新しい指示です"
./agent-send.sh worker "作業進捗を報告します"

# エージェント一覧確認
./agent-send.sh --list
```

## 🧪 確認・デバッグ

### ログ確認

```bash
# 送信ログ確認
cat logs/send_log.txt

# 特定エージェントのログ
grep "boss" logs/send_log.txt
```

### セッション状態確認

```bash
# セッション一覧
tmux list-sessions

# ペイン一覧
tmux list-panes -t multiagent
```

## 🔄 環境リセット

```bash
# セッション削除
tmux kill-session -t multiagent

# 再構築（自動クリア付き）
# (tmpフォルダ内のログファイルなどはクリアされません)
./setup.sh
```

---

🚀 **Agent Communication を体感してください！** 🤖✨ 