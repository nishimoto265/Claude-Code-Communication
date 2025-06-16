/**
 * Switch to different scenario
 */

const fs = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');

const { loadConfig, setCurrentScenario } = require('../core/config-manager');
const { setupTmuxSessions, generateAgentMapping } = require('../core/tmux-manager');
const { checkTmuxSessions } = require('../core/tmux-checker');

async function switchCommand(scenario, options) {
  console.log(chalk.cyan('🔄 シナリオ切り替え'));
  console.log('');

  try {
    // 設定ファイル確認
    const yamlConfig = './claude-agents.yaml';
    const jsonConfig = './claude-agents.json';
    if (!await fs.pathExists(yamlConfig) && !await fs.pathExists(jsonConfig)) {
      console.log(chalk.red('❌ 設定ファイルが見つかりません'));
      console.log(chalk.yellow('💡 まず初期化を実行してください: claude-agents init'));
      process.exit(1);
    }

    // 設定読み込み
    const config = await loadConfig();
    const currentScenario = config.currentScenario;
    
    // シナリオ妥当性チェック
    if (!config.scenarios[scenario]) {
      console.log(chalk.red(`❌ 無効なシナリオ: ${scenario}`));
      console.log(chalk.yellow('💡 利用可能シナリオ:'));
      Object.keys(config.scenarios).forEach(name => {
        const scenarioConfig = config.scenarios[name];
        const isCurrent = name === currentScenario;
        console.log(`  ${isCurrent ? '🎯' : '📦'} ${chalk.cyan(name)} - ${scenarioConfig.name}`);
      });
      process.exit(1);
    }

    // 同じシナリオかチェック
    if (currentScenario === scenario) {
      console.log(chalk.blue(`✅ 既に ${scenario} シナリオが設定されています`));
      await showCurrentStatus(config);
      return;
    }

    const scenarioConfig = config.scenarios[scenario];
    console.log(chalk.blue(`🎭 切り替え: ${currentScenario || 'なし'} → ${scenario}`));
    console.log(chalk.gray(`📝 ${scenarioConfig.name}`));

    // 既存セッション確認
    const sessionStatus = await checkTmuxSessions(scenarioConfig);
    
    let preserveSessions = options.preserveSessions;
    let useExistingSessions = false;

    if (sessionStatus.existingSessions.length > 0) {
      console.log(chalk.yellow(`🔍 既存セッション検出: ${sessionStatus.existingSessions.join(', ')}`));
      
      if (!preserveSessions) {
        const { preserve } = await inquirer.prompt([{
          type: 'confirm',
          name: 'preserve',
          message: '既存のClaude Codeセッションを保持しますか？',
          default: true
        }]);
        preserveSessions = preserve;
      }
      
      if (preserveSessions && sessionStatus.allSessionsExist) {
        useExistingSessions = true;
        console.log(chalk.green('✅ 既存セッションを再利用します'));
      }
    }

    // セッション構築またはマッピング更新
    if (useExistingSessions) {
      console.log(chalk.yellow('🗺️ エージェントマッピングのみ更新中...'));
      await generateAgentMapping(scenarioConfig);
    } else {
      if (!preserveSessions && sessionStatus.existingSessions.length > 0) {
        console.log(chalk.yellow('🗑️ 既存セッションを終了中...'));
        await killExistingSessions(sessionStatus.existingSessions);
      }
      
      console.log(chalk.yellow('🖥️ 新しいTmuxセッションを構築中...'));
      await setupTmuxSessions(scenarioConfig);
      await generateAgentMapping(scenario, scenarioConfig);
    }

    // 現在のシナリオ更新
    await setCurrentScenario(scenario);
    
    console.log(chalk.green('✅ シナリオ切り替え完了'));
    console.log('');

    // 切り替え後の状態表示
    await showSwitchResults(scenario, scenarioConfig, useExistingSessions);

  } catch (error) {
    console.error(chalk.red('❌ 切り替えエラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function showCurrentStatus(config) {
  const currentScenario = config.currentScenario;
  if (!currentScenario) return;
  
  console.log('');
  console.log(chalk.cyan('📊 現在のシナリオ状態:'));
  
  const scenarioConfig = config.scenarios[currentScenario];
  console.log(`  シナリオ: ${chalk.cyan(currentScenario)}`);
  console.log(`  名前: ${scenarioConfig.name}`);
  
  // エージェント情報表示
  const agentMapping = await getAgentMapping();
  if (agentMapping && Object.keys(agentMapping).length > 0) {
    console.log('  エージェント:');
    Object.entries(agentMapping).forEach(([agent, target]) => {
      console.log(`    ${chalk.cyan(agent)} → ${chalk.gray(target)}`);
    });
  }
}

async function killExistingSessions(sessions) {
  const { spawn } = require('child_process');
  
  for (const session of sessions) {
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('tmux', ['kill-session', '-t', session], { stdio: 'pipe' });
        child.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.gray(`  ✅ セッション終了: ${session}`));
            resolve();
          } else {
            reject(new Error(`Failed to kill session: ${session}`));
          }
        });
      });
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ セッション終了失敗: ${session} (${error.message})`));
    }
  }
}

async function showSwitchResults(scenario, scenarioConfig, useExistingSessions) {
  console.log(chalk.cyan('🎯 切り替え完了情報:'));
  console.log(`  新しいシナリオ: ${chalk.cyan(scenario)}`);
  console.log(`  説明: ${scenarioConfig.name}`);
  console.log(`  セッション状態: ${useExistingSessions ? '既存利用' : '新規作成'}`);
  
  // 利用可能エージェント表示
  try {
    const { getAgentMapping } = require('../core/agent-manager');
    const agentMapping = await getAgentMapping();
    
    if (agentMapping && Object.keys(agentMapping).length > 0) {
      console.log('  エージェント:');
      Object.entries(agentMapping).forEach(([agent, target]) => {
        console.log(`    ${chalk.cyan(agent)} → ${chalk.gray(target)}`);
      });
    }
  } catch (error) {
    console.log(chalk.yellow('  ⚠️ エージェント情報の取得に失敗'));
  }
  
  console.log('');
  console.log(chalk.cyan('📋 次のステップ:'));
  
  const primarySession = Object.keys(scenarioConfig.tmux_sessions)[0];
  console.log(`  1. ${chalk.yellow(`tmux attach-session -t ${primarySession}`)} - メインセッションに接続`);
  console.log(`  2. ${chalk.yellow('claude-agents send <agent> "<message>"')} - メッセージ送信`);
  console.log(`  3. ${chalk.yellow('claude-agents status')} - システム状態確認`);
  
  if (!useExistingSessions) {
    console.log('');
    console.log(chalk.yellow('💡 新規セッションのため、Claude Codeの再起動が必要かもしれません'));
  }
}

// Utility function to get agent mapping (simplified version)
async function getAgentMapping() {
  try {
    const mappingPath = './tmp/agent_mapping.json';
    if (await fs.pathExists(mappingPath)) {
      return await fs.readJSON(mappingPath);
    }
  } catch (error) {
    // Ignore errors
  }
  return {};
}

module.exports = switchCommand;