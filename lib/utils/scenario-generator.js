/**
 * Scenario file generation utilities
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Generate all scenario files
 */
async function generateScenarioFiles(basicInfo, agentConfig, tmuxConfig) {
  const scenarioDir = path.join(process.cwd(), 'scenarios', basicInfo.id);
  
  // ディレクトリ作成
  await fs.ensureDir(scenarioDir);
  await fs.ensureDir(path.join(scenarioDir, 'instructions'));
  await fs.ensureDir(path.join(scenarioDir, 'templates'));
  
  // scenario.yaml 生成
  await generateScenarioYaml(scenarioDir, basicInfo);
  
  // agents.yaml 生成
  await generateAgentsYaml(scenarioDir, agentConfig, tmuxConfig);
  
  // layout.yaml 生成
  await generateLayoutYaml(scenarioDir, tmuxConfig);
  
  // エージェント指示書生成
  await generateInstructionFiles(scenarioDir, agentConfig);
  
  return scenarioDir;
}

/**
 * Generate scenario.yaml
 */
async function generateScenarioYaml(scenarioDir, basicInfo) {
  const scenarioConfig = {
    name: basicInfo.name,
    description: basicInfo.description,
    version: '2.0.0',
    author: basicInfo.author,
    tags: basicInfo.tags,
    initial_message: basicInfo.initialMessage,
    settings: {
      auto_start_claude: true,
      message_wait_time: 0.5,
      enable_logging: true
    }
  };
  
  const yamlContent = yaml.dump(scenarioConfig, {
    defaultStyle: null,
    lineWidth: -1
  });
  
  await fs.writeFile(
    path.join(scenarioDir, 'scenario.yaml'),
    yamlContent,
    'utf8'
  );
}

/**
 * Generate agents.yaml
 */
async function generateAgentsYaml(scenarioDir, agentConfig, tmuxConfig) {
  const agents = {};
  
  // tmuxConfig から正しいセッション情報を取得
  Object.values(tmuxConfig.sessions).forEach(session => {
    session.agents.forEach(agent => {
      agents[agent.id] = {
        role: agent.role,
        session: agent.session,
        pane: agent.pane,
        responsibilities: agent.responsibilities,
        communication_style: generateCommunicationStyle(agent.role),
        color: agent.color,
        instruction_file: `instructions/${agent.id}.md`
      };
    });
  });
  
  const yamlContent = yaml.dump(agents, {
    defaultStyle: null,
    lineWidth: -1
  });
  
  await fs.writeFile(
    path.join(scenarioDir, 'agents.yaml'),
    yamlContent,
    'utf8'
  );
}

/**
 * Generate layout.yaml
 */
async function generateLayoutYaml(scenarioDir, tmuxConfig) {
  const layoutConfig = {
    tmux_sessions: {}
  };
  
  Object.entries(tmuxConfig.sessions).forEach(([sessionName, session]) => {
    layoutConfig.tmux_sessions[sessionName] = {
      window_name: session.window_name,
      layout: session.layout,
      panes: session.agents.map(agent => ({
        role: agent.id,
        color: agent.color
      }))
    };
  });
  
  // レイアウト説明を追加
  layoutConfig.layout_descriptions = {
    'tiled': '2x2 grid layout for multiple panes',
    'even-horizontal': 'Horizontal split for 2 panes',
    'even-vertical': 'Vertical split for 2 panes', 
    'main-horizontal': 'Main pane with horizontal splits'
  };
  
  const yamlContent = yaml.dump(layoutConfig, {
    defaultStyle: null,
    lineWidth: -1
  });
  
  await fs.writeFile(
    path.join(scenarioDir, 'layout.yaml'),
    yamlContent,
    'utf8'
  );
}

/**
 * Generate instruction files for each agent
 */
async function generateInstructionFiles(scenarioDir, agentConfig) {
  const instructionsDir = path.join(scenarioDir, 'instructions');
  
  for (const agent of agentConfig.agents) {
    const instructionContent = generateInstructionTemplate(agent);
    await fs.writeFile(
      path.join(instructionsDir, `${agent.id}.md`),
      instructionContent,
      'utf8'
    );
  }
}

/**
 * Generate instruction template for an agent
 */
function generateInstructionTemplate(agent) {
  const emoji = getAgentEmoji(agent.role);
  
  return `# ${emoji} ${agent.role}指示書

## あなたの役割
${agent.role}として、チームの一員で活動します。

## 基本的な行動指針
1. **専門性の発揮**: ${agent.role}としての専門知識を活かす
2. **協力的な姿勢**: チームメンバーと建設的な議論を行う  
3. **責任感**: 担当領域について責任を持って対応する
4. **コミュニケーション**: 明確で分かりやすい説明を心がける

## 主要な責任
${agent.responsibilities.map(resp => `- ${resp}`).join('\n')}

## コミュニケーションスタイル
${generateCommunicationStyle(agent.role)}

## 期待される成果物
- 専門分野に関する分析と提案
- チーム議論への積極的な参加
- 担当領域の課題解決案

## 関連するチームメンバー
他のエージェントと連携して、プロジェクトの成功に貢献してください。

---
*この指示書は、${agent.role}としての役割を明確にするためのガイドラインです。*
*実際の議論では、状況に応じて柔軟に対応してください。*`;
}

/**
 * Generate communication style based on role
 */
function generateCommunicationStyle(role) {
  const styleMap = {
    'CEO': 'リーダーシップを発揮し、戦略的思考で全体を統括する',
    'CTO': '技術的根拠とデータに基づいた提案を行う',
    'CFO': '数値とデータで証明された財務的観点で判断する',
    'CMO': '市場と顧客の視点から戦略を評価し、具体的施策を提案',
    'プロダクトマネージャー': '顧客ニーズとビジネス価値を結びつけた提案',
    'データアナリスト': 'データに基づいた洞察と定量的分析で意思決定を支援',
    'エンジニア': '技術的実現性と品質を重視した実装提案',
    'デザイナー': 'ユーザー体験と使いやすさを重視したデザイン提案'
  };
  
  // 部分マッチで検索
  for (const [key, value] of Object.entries(styleMap)) {
    if (role.includes(key) || key.includes(role)) {
      return value;
    }
  }
  
  return `${role}としての専門知識を活かし、根拠に基づいた提案を行う`;
}

/**
 * Get emoji for agent role
 */
function getAgentEmoji(role) {
  const emojiMap = {
    'CEO': '👑',
    'CTO': '🔧', 
    'CFO': '💰',
    'CMO': '📊',
    'マネージャー': '📋',
    'エンジニア': '💻',
    'Engineer': '💻',
    'デザイナー': '🎨',
    'Designer': '🎨',
    'アナリスト': '📈',
    'Analyst': '📈',
    '医師': '👨‍⚕️',
    'Doctor': '👨‍⚕️',
    '看護師': '👩‍⚕️',
    'Nurse': '👩‍⚕️',
    '教師': '👨‍🏫',
    'Teacher': '👨‍🏫',
    '研究者': '🔬',
    'Researcher': '🔬',
    'コンサルタント': '💼',
    'Consultant': '💼'
  };
  
  // 部分マッチで検索
  for (const [key, value] of Object.entries(emojiMap)) {
    if (role.includes(key) || key.includes(role)) {
      return value;
    }
  }
  
  return '👤'; // デフォルト
}

module.exports = {
  generateScenarioFiles,
  generateScenarioYaml,
  generateAgentsYaml,
  generateLayoutYaml,
  generateInstructionFiles
};