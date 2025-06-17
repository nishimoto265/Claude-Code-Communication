# カスタムシナリオ作成ガイド

独自のシナリオを作成してclaude-agentsを拡張する方法を詳しく説明します。

## シナリオディレクトリ構造

### 基本構造
新しいシナリオを作成するには、`scenarios/`ディレクトリに以下の構造でファイルを作成します：

```
scenarios/
└── your-custom-scenario/
    ├── scenario.yaml      # シナリオメタデータ
    ├── agents.yaml        # エージェント定義
    ├── layout.yaml        # tmux画面配置
    └── instructions/      # エージェント別指示書
        ├── agent1.md
        ├── agent2.md
        └── agent3.md
```

## 必須ファイルの詳細

### 1. scenario.yaml (シナリオメタデータ)
```yaml
name: Product Development Sprint
description: プロダクト開発チームのスプリント計画と実行
version: 2.0.0
author: Your Name
tags:
  - development
  - agile
  - product
initial_message: スプリント計画会議を開始します。今回の開発目標を確認しましょう
settings:
  auto_start_claude: true
  message_wait_time: 0.5
  enable_logging: true
```

### 2. agents.yaml (エージェント定義)
```yaml
product_owner:
  role: プロダクトオーナー
  session: development
  pane: 0
  responsibilities:
    - ユーザーストーリー作成
    - 優先順位決定
    - 受け入れ基準定義
  communication_style: ビジネス価値と顧客視点で判断
  color: blue
  instruction_file: instructions/product_owner.md

tech_lead:
  role: テックリード
  session: development
  pane: 1
  responsibilities:
    - アーキテクチャ設計
    - 技術的課題解決
    - コードレビュー
  communication_style: 技術的実現性と品質を重視
  color: red
  instruction_file: instructions/tech_lead.md

frontend_dev:
  role: フロントエンド開発者
  session: development
  pane: 2
  responsibilities:
    - UI/UX実装
    - フロントエンド設計
    - ユーザビリティ改善
  color: green
  instruction_file: instructions/frontend_dev.md

backend_dev:
  role: バックエンド開発者
  session: development
  pane: 3
  responsibilities:
    - API設計・実装
    - データベース設計
    - パフォーマンス最適化
  color: yellow
  instruction_file: instructions/backend_dev.md
```

### 3. layout.yaml (tmux画面配置)
```yaml
tmux_sessions:
  development:
    window_name: dev-team
    layout: tiled
    panes:
      - role: product_owner
        color: blue
      - role: tech_lead
        color: red
      - role: frontend_dev
        color: green
      - role: backend_dev
        color: yellow

layout_descriptions:
  tiled: 2x2 grid layout for 4 development roles
  main-horizontal: Main pane with horizontal splits
  even-horizontal: Horizontal split for 2 panes
  even-vertical: Vertical split for 2 panes
```

### 4. instructions/agent.md (個別指示書)
```markdown
# プロダクトオーナーの役割

あなたはプロダクトオーナーです。

## 主な責任
- ユーザーストーリーの作成と優先順位付け
- 受け入れ基準の定義
- ステークホルダーとの調整

## 行動指針
1. 常にユーザー価値を意識する
2. ビジネス目標との整合性を確保
3. 開発チームとの円滑なコミュニケーション

## コミュニケーション
- 具体的なユーザーストーリーで要件を説明
- ビジネス価値と技術的制約のバランスを考慮
- 優先順位の理由を明確に説明

## 期待される成果物
- ユーザーストーリー一覧
- 受け入れ基準
- 優先順位付きバックログ
```

## メイン設定への登録

新しいシナリオを作成後、`claude-agents.yaml`に追加します：

```yaml
scenarios:
  # 既存のシナリオ...
  product-development:
    name: Product Development Sprint
    description: プロダクト開発チームのアジャイル開発シナリオ
    type: external
    path: scenarios/product-development
```

## カスタマイズのポイント

### A. チーム構成のバリエーション

#### 小規模チーム (3-4人構成)
```yaml
tmux_sessions:
  small_team:
    window_name: startup-team
    panes:
      - role: founder_ceo
      - role: lead_developer
      - role: designer
```

#### 大規模チーム (6-8人構成、複数セッション)
```yaml
tmux_sessions:
  core_dev:
    window_name: core-development
    panes: 
      - role: tech_lead
      - role: senior_dev1
      - role: senior_dev2
  frontend_team:
    window_name: frontend-team  
    panes: 
      - role: frontend_lead
      - role: ui_designer
      - role: qa_engineer
  backend_team:
    window_name: backend-team
    panes: 
      - role: backend_lead
      - role: devops
      - role: database_admin
```

#### 専門チーム
```yaml
# AI研究チーム
ai_research:
  panes:
    - role: ml_researcher
    - role: data_scientist
    - role: ai_engineer

# セキュリティチーム
security_team:
  panes:
    - role: security_architect
    - role: penetration_tester
    - role: compliance_officer
```

### B. 業界別シナリオ例

#### ヘルスケア相談チーム
```
scenarios/healthcare-consultation/
├── scenario.yaml
├── agents.yaml
├── layout.yaml
└── instructions/
    ├── doctor.md
    ├── nurse.md
    ├── pharmacist.md
    └── patient_coordinator.md
```

#### 法務レビューチーム
```
scenarios/legal-review/
├── scenario.yaml
├── agents.yaml
├── layout.yaml
└── instructions/
    ├── senior_partner.md
    ├── associate.md
    ├── paralegal.md
    └── compliance_specialist.md
```

#### 金融プランニング
```
scenarios/financial-planning/
├── scenario.yaml
├── agents.yaml
├── layout.yaml
└── instructions/
    ├── financial_advisor.md
    ├── investment_analyst.md
    ├── risk_manager.md
    └── tax_specialist.md
```

#### 教育カリキュラム設計
```
scenarios/education-curriculum/
├── scenario.yaml
├── agents.yaml
├── layout.yaml
└── instructions/
    ├── curriculum_designer.md
    ├── subject_expert.md
    ├── educational_technologist.md
    └── assessment_specialist.md
```

#### マーケティングキャンペーン
```
scenarios/marketing-campaign/
├── scenario.yaml
├── agents.yaml
├── layout.yaml
└── instructions/
    ├── campaign_manager.md
    ├── creative_director.md
    ├── data_analyst.md
    └── brand_strategist.md
```

### C. 高度な設定オプション

#### エージェント間の関係性定義
```yaml
# agents.yaml の拡張
product_owner:
  role: プロダクトオーナー
  # ... 基本設定 ...
  relationships:
    reports_to: [stakeholder]
    collaborates_with: [tech_lead, designer]
    manages: [development_team]
  
  # エージェント固有の設定
  decision_authority: high
  communication_frequency: daily
  escalation_threshold: medium
```

#### 動的なペイン配置
```yaml
tmux_sessions:
  adaptive_layout:
    window_name: adaptive-team
    layout_strategy: dynamic  # fixed, dynamic, responsive
    min_panes: 3
    max_panes: 8
    auto_adjust: true
```

#### カスタムエイリアス
```yaml
# agents.yaml
ceo:
  role: 最高経営責任者
  aliases: [boss, chief, leader, president]
  session: strategy
  pane: 0
```

## 作成後の動作確認

### 1. 新しいシナリオで起動
```bash
claude-agents start product-development
```

### 2. エージェント一覧確認
```bash
claude-agents status --agents
```

### 3. メッセージ送信テスト
```bash
claude-agents send product_owner "今回のスプリント目標を共有します"
claude-agents send tech_lead "技術的なリスクを評価してください"
claude-agents send frontend_dev "UI設計の方針を確認します"
claude-agents send backend_dev "API仕様について議論しましょう"
```

### 4. tmuxセッションアクセス
```bash
tmux attach-session -t development
```

## ベストプラクティス

### 1. 役割を明確化
- 各エージェントの責任範囲を重複なく定義
- 具体的な成果物と期待値を明記
- 意思決定権限の範囲を明確化

### 2. 現実的な構成
- 実際のチーム構成に基づいてエージェントを設計
- 業界標準の役割分担を参考に
- チームサイズは管理可能な範囲に

### 3. 段階的な議論設計
- initial_messageで適切な開始点を設定
- エージェント間の自然な会話フローを考慮
- 段階的な意思決定プロセスを組み込み

### 4. 専門性の活用
- 各エージェントの専門分野を活かせるシナリオ設計
- 実際の業務知識を反映した指示書
- 専門用語と業界慣行の正確な反映

### 5. 継続的改善
- 実際の使用結果を基にシナリオを調整
- ユーザーフィードバックの収集と反映
- エージェント間の相互作用パターンの最適化

## 高度なカスタマイズ例

### 動的シナリオ生成
```javascript
// カスタムシナリオ生成スクリプト
const generateScenario = (teamSize, industry, complexity) => {
  const scenario = {
    name: `${industry} Team - ${teamSize} members`,
    agents: generateAgents(teamSize, industry),
    tmux_sessions: generateLayout(teamSize, complexity)
  };
  
  return scenario;
};
```

### 条件付きエージェント
```yaml
# 条件に応じて有効化されるエージェント
optional_agents:
  security_expert:
    role: セキュリティ専門家
    activation_condition: 
      - high_security_requirement
      - compliance_needed
    session: security
    pane: 0
```

### インタラクティブシナリオ
```yaml
scenario_flow:
  phases:
    - name: planning
      duration: 30min
      active_agents: [product_owner, tech_lead]
    - name: development  
      duration: 120min
      active_agents: [frontend_dev, backend_dev]
    - name: review
      duration: 30min
      active_agents: [all]
```

このガイドを活用して、あなたの業務やプロジェクトに最適なカスタムシナリオを作成してください。