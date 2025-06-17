/**
 * Create new custom scenario with interactive prompts
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const yaml = require('js-yaml');

const { generateScenarioFiles } = require('../utils/scenario-generator');
const { updateMainConfig } = require('../core/config-manager');

async function createScenarioCommand(options) {
  console.log(chalk.cyan('✨ カスタムシナリオ作成ウィザード'));
  console.log(chalk.gray('新しいシナリオを対話式で作成します\n'));

  try {
    // 基本情報の収集
    const basicInfo = await collectBasicInfo(options);
    
    // エージェント構成の設定
    const agentConfig = await collectAgentConfig();
    
    // tmux構成の設定
    const tmuxConfig = await collectTmuxConfig(agentConfig);
    
    // 確認画面
    await confirmConfiguration(basicInfo, agentConfig, tmuxConfig);
    
    // ファイル生成
    console.log(chalk.yellow('\n📁 ファイル生成中...'));
    await generateScenarioFiles(basicInfo, agentConfig, tmuxConfig);
    
    // メイン設定更新
    console.log(chalk.yellow('⚙️  設定ファイル更新中...'));
    await updateMainConfig(basicInfo);
    
    // 成功メッセージ
    console.log(chalk.green('\n🎉 シナリオ作成完了!'));
    console.log(chalk.gray(`作成されたシナリオ: ${basicInfo.name}`));
    console.log(chalk.gray(`ディレクトリ: scenarios/${basicInfo.id}/`));
    
    // 次のステップ案内
    console.log(chalk.cyan('\n📋 次のステップ:'));
    console.log(chalk.white('1. エージェント指示書を編集:'));
    console.log(chalk.gray(`   ${agentConfig.agents.map(a => `scenarios/${basicInfo.id}/instructions/${a.id}.md`).join('\n   ')}`));
    console.log(chalk.white('\n2. シナリオ実行:'));
    console.log(chalk.gray(`   claude-agents start ${basicInfo.id}`));
    
  } catch (error) {
    console.error(chalk.red(`❌ エラー: ${error.message}`));
    process.exit(1);
  }
}

async function collectBasicInfo(options) {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'シナリオ名を入力してください:',
      default: options.name,
      validate: input => input.trim().length > 0 ? true : 'シナリオ名は必須です'
    },
    {
      type: 'input',
      name: 'description',
      message: 'シナリオの説明を入力してください:',
      default: options.description,
      validate: input => input.trim().length > 0 ? true : '説明は必須です'
    },
    {
      type: 'list',
      name: 'category',
      message: 'シナリオのカテゴリを選択してください:',
      choices: [
        { name: '🏢 ビジネス戦略', value: 'business' },
        { name: '💻 ソフトウェア開発', value: 'development' },
        { name: '🏥 ヘルスケア', value: 'healthcare' },
        { name: '🏫 教育', value: 'education' },
        { name: '💰 金融', value: 'finance' },
        { name: '🔬 研究', value: 'research' },
        { name: '📊 マーケティング', value: 'marketing' },
        { name: '🎯 その他', value: 'other' }
      ],
      default: options.category || 'business'
    },
    {
      type: 'input',
      name: 'author',
      message: '作成者名 (省略可):',
      default: options.author || process.env.USER || 'Anonymous'
    },
    {
      type: 'input',
      name: 'initialMessage',
      message: '開始時のメッセージ:',
      default: options.initialMessage || 'チームでの議論を開始してください'
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  // IDを生成（名前から安全な文字列に変換）
  const id = answers.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return {
    ...answers,
    id,
    tags: getCategoryTags(answers.category)
  };
}

async function collectAgentConfig() {
  const questions = [
    {
      type: 'number',
      name: 'agentCount',
      message: 'エージェントの数を入力してください (2-8):',
      default: 4,
      validate: input => (input >= 2 && input <= 8) ? true : '2-8の範囲で入力してください'
    }
  ];

  const { agentCount } = await inquirer.prompt(questions);
  
  const agents = [];
  
  console.log(chalk.yellow(`\n👥 ${agentCount}個のエージェント情報を設定します:`));
  
  for (let i = 0; i < agentCount; i++) {
    console.log(chalk.cyan(`\n--- エージェント ${i + 1} ---`));
    
    const agentQuestions = [
      {
        type: 'input',
        name: 'name',
        message: `エージェント${i + 1}の名前:`,
        default: `agent_${i + 1}`,
        validate: input => input.trim().length > 0 ? true : '名前は必須です'
      },
      {
        type: 'input',
        name: 'role',
        message: `エージェント${i + 1}の役割:`,
        default: `役割${i + 1}`,
        validate: input => input.trim().length > 0 ? true : '役割は必須です'
      },
      {
        type: 'input',
        name: 'responsibilities',
        message: `主な責任 (カンマ区切り):`,
        default: '責任1, 責任2, 責任3',
        filter: input => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
      },
      {
        type: 'list',
        name: 'color',
        message: `表示色を選択:`,
        choices: [
          { name: '🔴 赤', value: 'red' },
          { name: '🟢 緑', value: 'green' },
          { name: '🔵 青', value: 'blue' },
          { name: '🟡 黄', value: 'yellow' },
          { name: '🟣 マゼンタ', value: 'magenta' },
          { name: '🔷 シアン', value: 'cyan' }
        ],
        default: ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'][i % 6]
      }
    ];

    const agentInfo = await inquirer.prompt(agentQuestions);
    
    // IDを生成
    const id = agentInfo.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();

    agents.push({
      ...agentInfo,
      id,
      pane: i
    });
  }

  return { agents, agentCount };
}

async function collectTmuxConfig(agentConfig) {
  const { agentCount } = agentConfig;
  
  // セッション数の決定
  const sessionQuestions = [
    {
      type: 'list',
      name: 'sessionStrategy',
      message: 'tmuxセッション構成を選択:',
      choices: [
        { 
          name: `🔄 単一セッション (${agentCount}ペイン)`, 
          value: 'single',
          disabled: agentCount > 6 ? '6ペイン以下で推奨' : false
        },
        { 
          name: '📊 複数セッション (役割別分割)', 
          value: 'multiple',
          disabled: agentCount < 4 ? '4ペイン以上で推奨' : false
        }
      ]
    }
  ];

  const { sessionStrategy } = await inquirer.prompt(sessionQuestions);
  
  if (sessionStrategy === 'single') {
    return createSingleSessionConfig(agentConfig);
  } else {
    return createMultipleSessionConfig(agentConfig);
  }
}

function createSingleSessionConfig(agentConfig) {
  const layoutOptions = {
    2: 'even-horizontal',
    3: 'main-horizontal', 
    4: 'tiled',
    5: 'tiled',
    6: 'tiled'
  };

  return {
    sessions: {
      main: {
        window_name: 'main-team',
        layout: layoutOptions[agentConfig.agentCount] || 'tiled',
        agents: agentConfig.agents.map((agent, index) => ({
          ...agent,
          session: 'main',
          pane: index
        }))
      }
    }
  };
}

async function createMultipleSessionConfig(agentConfig) {
  // エージェントをセッションに分割
  const sessionCount = Math.ceil(agentConfig.agentCount / 3);
  const sessions = {};
  
  for (let i = 0; i < sessionCount; i++) {
    const sessionName = i === 0 ? 'primary' : `secondary_${i}`;
    const startIndex = i * 3;
    const endIndex = Math.min(startIndex + 3, agentConfig.agentCount);
    const sessionAgents = agentConfig.agents.slice(startIndex, endIndex);
    
    sessions[sessionName] = {
      window_name: i === 0 ? 'primary-team' : `team-${i + 1}`,
      layout: sessionAgents.length <= 2 ? 'even-horizontal' : 'tiled',
      agents: sessionAgents.map((agent, index) => ({
        ...agent,
        session: sessionName,
        pane: index
      }))
    };
  }
  
  return { sessions };
}

async function confirmConfiguration(basicInfo, agentConfig, tmuxConfig) {
  console.log(chalk.cyan('\n📋 設定確認'));
  console.log(chalk.white('--- 基本情報 ---'));
  console.log(chalk.gray(`名前: ${basicInfo.name}`));
  console.log(chalk.gray(`説明: ${basicInfo.description}`));
  console.log(chalk.gray(`カテゴリ: ${basicInfo.category}`));
  console.log(chalk.gray(`ID: ${basicInfo.id}`));
  
  console.log(chalk.white('\n--- エージェント構成 ---'));
  agentConfig.agents.forEach((agent, i) => {
    console.log(chalk.gray(`${i + 1}. ${agent.name} (${agent.role}) - ${agent.color}`));
  });
  
  console.log(chalk.white('\n--- tmux構成 ---'));
  Object.entries(tmuxConfig.sessions).forEach(([sessionName, session]) => {
    console.log(chalk.gray(`${sessionName}: ${session.agents.length}ペイン (${session.layout})`));
  });

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '上記の設定でシナリオを作成しますか?',
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('❌ キャンセルされました'));
    process.exit(0);
  }
}

function getCategoryTags(category) {
  const tagMap = {
    business: ['strategy', 'executive', 'planning'],
    development: ['coding', 'technical', 'agile'],
    healthcare: ['medical', 'healthcare', 'consultation'],
    education: ['learning', 'academic', 'curriculum'],
    finance: ['financial', 'investment', 'analysis'],
    research: ['research', 'academic', 'innovation'],
    marketing: ['marketing', 'promotion', 'analysis'],
    other: ['custom', 'general']
  };
  
  return tagMap[category] || ['custom'];
}

module.exports = createScenarioCommand;