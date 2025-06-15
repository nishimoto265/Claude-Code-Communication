# Agent Communication System

## エージェント構成
- **boss** (multiagent:0.0): リーダー
- **worker** (multiagent:0.1): 実行担当

## あなたの役割
- **boss**: @instructions/boss.md
- **worker**: @instructions/worker.md

## メッセージ送信
```bash
./agent-send.sh [相手] "[メッセージ]"
```

## 基本フロー
boss ⇔ worker (ループ)
