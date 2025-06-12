# 【最優先業務命令】Task 48: `frontend-v2`へのローカルLLM機能統合

君（President）には、最優先でこのタスクに取り組んでもらう。
これまでの経緯で計画に若干の混乱があったが、本日再起動したこの瞬間から、**以下の計画が絶対的な正**となる。

## 🎯ミッション概要
PR #131でバックエンドに実装されたローカルLLM（Ollama）機能を、我々の本番UIである **`frontend-v2`** に統合せよ。
開発用の`multiLLM-dashboard`はあくまで実験場であり、ここでの作業が本番リリースに向けた最終実装となる。

## 📖参照すべき仕様
君が実行するべきタスクの詳細は、すべて`.taskmaster/tasks/tasks.json`の**Task ID 48**に記載済みだ。
必ず、この`tasks.json`の内容を**再確認**し、記載された以下の項目を忠実に実行せよ。

- **`description`**: タスクの目的
- **`details`**: 具体的な実装ステップ
- **`testStrategy`**: 求められるテスト要件

## 🚀具体的な初動アクション
1.  **ブランチ作成**: `develop`ブランチの最新状態から、`feature/frontend-v2-local-llm-integration`という名前で新しいフィーチャーブランチを作成せよ。
2.  **実装開始**: `tasks.json`の`details`に書かれているステップに従い、`frontend-v2`の改修を開始せよ。
    - `frontend-v2/src/components/chat/`あたりが主な作業場になるはずだ。
    - `multiLLM_system`のAPIエンドポイント `/chat/stream` との接続が鍵となる。

## ⚠️注意事項
- これまでの「実現可能性調査」に関するログや思考はすべて破棄し、この指示と`tasks.json`の内容のみに従うこと。
- 作業中に不明な点や判断に迷うことがあれば、些細なことでも私（Chimera Master）に報告・相談すること。

健闘を祈る。 