/**
 * Start agents with specified scenario
 */

const fs = require('fs-extra');
const chalk = require('chalk');
const { spawn } = require('child_process');
const path = require('path');

const { loadConfig, getCurrentScenario, setCurrentScenario } = require('../core/config-manager');
const { setupTmuxSessions, generateAgentMapping } = require('../core/tmux-manager');
const { startClaudeAgents } = require('../core/claude-manager');

async function startCommand(scenario, options) {
  console.log(chalk.cyan('🚀 Claude Agents スタート'));
  console.log('');

  try {
    // 設定ファイル確認
    if (!await fs.pathExists('./claude-agents.yaml') && !await fs.pathExists('./claude-agents.json')) {
      console.log(chalk.red('❌ claude-agents.yaml が見つかりません'));
      console.log(chalk.yellow('💡 まず初期化を実行してください: claude-agents init'));
      process.exit(1);
    }

    // 設定読み込み
    const config = await loadConfig();
    
    // シナリオ決定
    const targetScenario = scenario || config.currentScenario || 'business-strategy';
    
    // シナリオ妥当性チェック
    if (!config.scenarios[targetScenario]) {
      console.log(chalk.red(`❌ 無効なシナリオ: ${targetScenario}`));
      console.log(chalk.yellow('💡 利用可能シナリオ:'));
      Object.keys(config.scenarios).forEach(name => {
        console.log(`  - ${name}`);
      });
      process.exit(1);
    }

    const scenarioConfig = config.scenarios[targetScenario];
    console.log(chalk.blue(`🎭 シナリオ: ${scenarioConfig.name}`));

    // プロジェクトパス設定
    const projectPath = path.resolve(options.project || '.');
    process.chdir(projectPath);
    console.log(chalk.gray(`📁 プロジェクトパス: ${projectPath}`));

    // 既存セッション確認
    await checkExistingSessions(scenarioConfig);

    // Tmuxセッション構築
    console.log(chalk.yellow('🖥️ Tmuxセッションを構築中...'));
    await setupTmuxSessions(scenarioConfig);
    console.log(chalk.green('✅ Tmuxセッション構築完了'));

    // エージェントマッピング生成
    console.log(chalk.yellow('🗺️ エージェントマッピングを生成中...'));
    await generateAgentMapping(scenarioConfig);
    console.log(chalk.green('✅ エージェントマッピング生成完了'));

    // 現在のシナリオ更新
    await setCurrentScenario(targetScenario);

    // Claude Code起動
    if (!options.noClaude && config.settings.autoStartClaude) {
      console.log(chalk.yellow('🤖 Claude Code を起動中...'));
      await startClaudeAgents(scenarioConfig);
      console.log(chalk.green('✅ Claude Code起動完了'));
    } else {
      console.log(chalk.gray('⏭️ Claude Code起動をスキップしました'));
      showManualStartInstructions(scenarioConfig);
    }

    // 完了メッセージ
    console.log('');
    console.log(chalk.green('🎉 エージェント起動完了！'));
    console.log('');
    showStartInstructions(targetScenario, scenarioConfig);

  } catch (error) {
    console.error(chalk.red('❌ 起動エラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function checkExistingSessions(scenarioConfig) {
  const sessions = scenarioConfig.tmux_sessions;
  const existingSessions = [];
  
  for (const sessionName of Object.keys(sessions)) {
    try {
      const result = await execCommand(`tmux has-session -t ${sessionName}`);
      if (result.success) {
        existingSessions.push(sessionName);
      }
    } catch (error) {
      // セッションが存在しない（正常）
    }
  }

  if (existingSessions.length > 0) {
    console.log(chalk.yellow(`⚠️ 既存のtmuxセッション: ${existingSessions.join(', ')}`));
    console.log(chalk.gray('これらのセッションは再利用されます'));
  }
}

function showManualStartInstructions(scenarioConfig) {
  console.log('');
  console.log(chalk.cyan('📋 Claude Code手動起動手順:'));
  
  const sessions = Object.keys(scenarioConfig.tmux_sessions);
  sessions.forEach(sessionName => {
    const session = scenarioConfig.tmux_sessions[sessionName];
    const paneCount = session.panes ? session.panes.length : 4;
    
    console.log(chalk.yellow(`  # ${sessionName} セッション`));
    console.log(`  tmux send-keys -t ${sessionName}:0.0 'claude' C-m`);
    console.log(chalk.gray('  # 認証後、全ペインで起動:'));
    console.log(`  for i in {0..${paneCount-1}}; do tmux send-keys -t ${sessionName}:0.$i 'claude' C-m; done`);
    console.log('');
  });
}

function showStartInstructions(scenario, scenarioConfig) {
  console.log(chalk.cyan('🎯 シナリオ開始手順:'));
  console.log('');

  const primarySession = Object.keys(scenarioConfig.tmux_sessions)[0];
  
  switch (scenario) {
    case 'hello-world':
      console.log(`1. ${chalk.yellow('tmux attach-session -t president')} - PRESIDENTセッションに接続`);
      console.log(`2. 以下を入力: ${chalk.green('あなたはpresidentです。指示書に従って')}`);
      console.log('3. 自動的にマルチエージェント通信が開始されます');
      break;
      
    case 'business-strategy':
      console.log(`1. ${chalk.yellow(`tmux attach-session -t ${primarySession}`)} - Strategyセッションに接続`);
      console.log(`2. CEOペイン（左上）で以下を入力:`);
      console.log(`   ${chalk.green('あなたはCEOです。新しい事業戦略について議論を開始してください')}`);
      console.log('3. 各エージェントが専門分野で貢献します:');
      console.log('   • CTO: 技術的実現可能性');
      console.log('   • CFO: 財務的影響とROI');
      console.log('   • マーケティング責任者: 市場機会');
      break;
      
    default:
      console.log(`1. ${chalk.yellow(`tmux attach-session -t ${primarySession}`)} - メインセッションに接続`);
      console.log('2. 適切なエージェントで初期コマンドを実行');
      console.log('3. シナリオに応じた協働を開始');
      break;
  }

  console.log('');
  console.log(chalk.cyan('🛠️ 便利なコマンド:'));
  console.log(`  ${chalk.yellow('claude-agents send <agent> "<message>"')} - メッセージ送信`);
  console.log(`  ${chalk.yellow('claude-agents status')} - システム状態確認`);
  console.log(`  ${chalk.yellow('claude-agents switch <scenario>')} - シナリオ切替`);
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        reject(new Error(`Command failed: ${command}\n${stderr}`));
      }
    });
  });
}

module.exports = startCommand;