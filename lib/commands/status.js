/**
 * Show system status and agent information
 */

const fs = require('fs-extra');
const chalk = require('chalk');
const { spawn } = require('child_process');

const { loadConfig } = require('../core/config-manager');
const { getAgentMapping } = require('../core/agent-manager');

async function statusCommand(options) {
  console.log(chalk.cyan('📊 Claude Agents システム状態'));
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
    
    // 基本情報表示
    await showBasicInfo(config);
    
    // Tmuxセッション状態（オプション指定時）
    if (options.tmux) {
      await showTmuxStatus();
    }
    
    // エージェント詳細（オプション指定時）
    if (options.agents) {
      await showAgentDetails(config);
    }
    
    // デフォルトは概要表示
    if (!options.tmux && !options.agents) {
      await showOverview(config);
    }
    
    // 追加情報
    await showAdditionalInfo();

  } catch (error) {
    console.error(chalk.red('❌ ステータス確認エラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function showBasicInfo(config) {
  console.log(chalk.cyan('🎯 基本情報:'));
  console.log(`  プロジェクト: ${chalk.yellow(config.projectName || 'unknown')}`);
  console.log(`  バージョン: ${chalk.yellow(config.version || 'unknown')}`);
  console.log(`  現在のシナリオ: ${config.currentScenario ? chalk.cyan(config.currentScenario) : chalk.gray('未設定')}`);
  
  if (config.currentScenario && config.scenarios[config.currentScenario]) {
    const scenarioConfig = config.scenarios[config.currentScenario];
    console.log(`  シナリオ名: ${chalk.gray(scenarioConfig.name)}`);
  }
  
  console.log(`  最終更新: ${chalk.gray(formatDate(config.lastUpdated))}`);
  console.log('');
}

async function showOverview(config) {
  const currentScenario = config.currentScenario;
  
  if (!currentScenario) {
    console.log(chalk.yellow('⚠️ シナリオが設定されていません'));
    console.log(chalk.blue('💡 シナリオを開始: claude-agents start <scenario>'));
    return;
  }
  
  // Tmuxセッション概要
  console.log(chalk.cyan('🖥️ Tmuxセッション:'));
  const tmuxStatus = await getTmuxStatus();
  
  const scenarioConfig = config.scenarios[currentScenario];
  const expectedSessions = Object.keys(scenarioConfig.tmux_sessions);
  
  for (const sessionName of expectedSessions) {
    const exists = tmuxStatus.sessions.includes(sessionName);
    const icon = exists ? '✅' : '❌';
    const status = exists ? chalk.green('稼働中') : chalk.red('未起動');
    console.log(`  ${icon} ${chalk.cyan(sessionName)}: ${status}`);
  }
  console.log('');
  
  // エージェント概要
  console.log(chalk.cyan('🤖 エージェント:'));
  try {
    const agentMapping = await getAgentMapping();
    
    if (Object.keys(agentMapping).length === 0) {
      console.log('  ❌ エージェントマッピングが見つかりません');
    } else {
      const agentCount = Object.keys(agentMapping).length;
      console.log(`  📊 ${chalk.yellow(agentCount)}個のエージェントが設定済み`);
      
      // 最初の3つのエージェントを表示
      const agents = Object.keys(agentMapping).slice(0, 3);
      agents.forEach(agent => {
        console.log(`  🎭 ${chalk.cyan(agent)}`);
      });
      
      if (Object.keys(agentMapping).length > 3) {
        console.log(`  ${chalk.gray(`...他${Object.keys(agentMapping).length - 3}個`)}`);
      }
    }
  } catch (error) {
    console.log('  ❌ エージェント情報の取得に失敗');
  }
  console.log('');
}

async function showTmuxStatus() {
  console.log(chalk.cyan('🖥️ Tmux詳細ステータス:'));
  
  try {
    const tmuxStatus = await getTmuxStatus();
    
    if (tmuxStatus.sessions.length === 0) {
      console.log('  ❌ Tmuxセッションが見つかりません');
      return;
    }
    
    // セッション一覧
    console.log('  📋 セッション一覧:');
    for (const session of tmuxStatus.sessions) {
      const panes = await getTmuxPanes(session);
      console.log(`    🖥️ ${chalk.cyan(session)}: ${chalk.yellow(panes.length)}ペイン`);
      
      // ペイン詳細（最初の2つまで）
      panes.slice(0, 2).forEach(pane => {
        console.log(`      └ ${chalk.gray(pane)}`);
      });
      if (panes.length > 2) {
        console.log(`      └ ${chalk.gray(`...他${panes.length - 2}ペイン`)}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Tmuxステータス取得エラー: ${error.message}`);
  }
  console.log('');
}

async function showAgentDetails(config) {
  console.log(chalk.cyan('🤖 エージェント詳細:'));
  
  try {
    const agentMapping = await getAgentMapping();
    
    if (Object.keys(agentMapping).length === 0) {
      console.log('  ❌ エージェントマッピングが見つかりません');
      console.log('  💡 シナリオを開始してください: claude-agents start');
      return;
    }
    
    // エージェント一覧
    console.log('  📋 エージェント一覧:');
    Object.entries(agentMapping).forEach(([agent, target]) => {
      console.log(`    🎭 ${chalk.cyan(agent.padEnd(20))} → ${chalk.gray(target)}`);
    });
    
    // 統計情報
    console.log('');
    console.log('  📊 統計:');
    console.log(`    合計エージェント数: ${chalk.yellow(Object.keys(agentMapping).length)}`);
    
    // セッション別エージェント数
    const sessionCounts = {};
    Object.values(agentMapping).forEach(target => {
      const session = target.split(':')[0];
      sessionCounts[session] = (sessionCounts[session] || 0) + 1;
    });
    
    Object.entries(sessionCounts).forEach(([session, count]) => {
      console.log(`    ${session}セッション: ${chalk.yellow(count)}エージェント`);
    });
    
  } catch (error) {
    console.log(`  ❌ エージェント詳細取得エラー: ${error.message}`);
  }
  console.log('');
}

async function showAdditionalInfo() {
  console.log(chalk.cyan('🛠️ 利用可能コマンド:'));
  console.log('  📤 メッセージ送信: claude-agents send <agent> "<message>"');
  console.log('  🔄 シナリオ切替: claude-agents switch <scenario>');
  console.log('  📋 シナリオ一覧: claude-agents list');
  console.log('  🔄 環境リセット: claude-agents reset');
  console.log('');
  
  // ログファイル情報
  try {
    const logStats = await getLogStats();
    if (logStats.messageCount > 0) {
      console.log(chalk.cyan('📝 ログ情報:'));
      console.log(`  📊 送信メッセージ数: ${chalk.yellow(logStats.messageCount)}`);
      console.log(`  📅 最終送信: ${chalk.gray(logStats.lastMessage)}`);
      console.log('');
    }
  } catch (error) {
    // ログ情報は任意なのでエラーは無視
  }
}

async function getTmuxStatus() {
  try {
    const result = await execCommand('tmux list-sessions -F "#{session_name}"');
    const sessions = result.stdout.trim().split('\n').filter(s => s.length > 0);
    return { sessions };
  } catch (error) {
    return { sessions: [] };
  }
}

async function getTmuxPanes(session) {
  try {
    const result = await execCommand(`tmux list-panes -t "${session}" -F "#{pane_index}:#{pane_current_command}"`);
    return result.stdout.trim().split('\n').filter(s => s.length > 0);
  } catch (error) {
    return [];
  }
}

async function getLogStats() {
  const logFile = './logs/send_log.jsonl';
  
  if (!await fs.pathExists(logFile)) {
    return { messageCount: 0, lastMessage: null };
  }
  
  const content = await fs.readFile(logFile, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return { messageCount: 0, lastMessage: null };
  }
  
  const lastLine = lines[lines.length - 1];
  const lastEntry = JSON.parse(lastLine);
  
  return {
    messageCount: lines.length,
    lastMessage: formatDate(lastEntry.timestamp)
  };
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

function formatDate(dateString) {
  if (!dateString) return 'unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'invalid date';
  }
}

module.exports = statusCommand;