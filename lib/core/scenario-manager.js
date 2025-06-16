/**
 * Scenario management for claude-agents
 */

const fs = require('fs-extra');
const chalk = require('chalk');
const { loadConfig } = require('./config-manager');

/**
 * List all available scenarios
 */
async function listScenarios(options = {}) {
  try {
    const config = await loadConfig();
    const currentScenario = config.currentScenario;
    
    console.log(chalk.cyan('📋 利用可能シナリオ'));
    console.log('');
    
    for (const [name, scenario] of Object.entries(config.scenarios)) {
      const isCurrent = name === currentScenario;
      const icon = isCurrent ? '🎯' : '📦';
      const nameColor = isCurrent ? chalk.cyan : chalk.white;
      const statusText = isCurrent ? chalk.green(' (現在)') : '';
      
      console.log(`  ${icon} ${nameColor(name)}${statusText}`);
      console.log(`     ${chalk.gray(scenario.description || scenario.name)}`);
      
      if (options.detailed) {
        // Show agent count and sessions
        const agentCount = Object.keys(scenario.agents || {}).length;
        const sessionCount = Object.keys(scenario.tmux_sessions || {}).length;
        
        console.log(`     ${chalk.yellow('エージェント')}: ${agentCount}個`);
        console.log(`     ${chalk.yellow('セッション')}: ${sessionCount}個`);
        
        // Show key agents
        if (scenario.agents) {
          const keyAgents = Object.keys(scenario.agents).slice(0, 3);
          console.log(`     ${chalk.yellow('主要エージェント')}: ${keyAgents.join(', ')}`);
        }
      }
      
      console.log('');
    }
    
    if (!options.detailed) {
      console.log(chalk.gray('詳細情報: claude-agents list --detailed'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ シナリオ一覧取得エラー:'), error.message);
    process.exit(1);
  }
}

/**
 * Reset environment and cleanup
 */
async function resetEnvironment(options = {}) {
  console.log(chalk.cyan('🔄 環境リセット'));
  console.log('');
  
  try {
    // Confirmation
    if (!options.force) {
      const inquirer = require('inquirer');
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: '全てのtmuxセッションとテンポラリファイルを削除しますか？',
        default: false
      }]);
      
      if (!confirm) {
        console.log(chalk.blue('リセットをキャンセルしました'));
        return;
      }
    }
    
    console.log(chalk.yellow('🗑️ Tmuxセッションを終了中...'));
    await killAllRelatedSessions();
    
    console.log(chalk.yellow('🧹 テンポラリファイルを削除中...'));
    await cleanupTempFiles();
    
    console.log(chalk.yellow('📝 ログファイルをアーカイブ中...'));
    await archiveLogs();
    
    console.log(chalk.green('✅ 環境リセット完了'));
    console.log('');
    console.log(chalk.cyan('📋 次のステップ:'));
    console.log('  1. claude-agents start <scenario> - 新しいセッションを開始');
    console.log('  2. claude-agents init --force - 設定を再初期化（必要に応じて）');
    
  } catch (error) {
    console.error(chalk.red('❌ リセットエラー:'), error.message);
    process.exit(1);
  }
}

/**
 * Get scenario configuration (for external use)
 */
async function getScenarioConfig() {
  try {
    const config = await loadConfig();
    return config.scenarios;
  } catch (error) {
    // Return default scenarios if config is not available
    return getDefaultScenarios();
  }
}

/**
 * Kill all related tmux sessions
 */
async function killAllRelatedSessions() {
  const { spawn } = require('child_process');
  
  try {
    // Get list of current sessions
    const sessions = await execCommand('tmux list-sessions -F "#{session_name}"');
    const sessionNames = sessions.stdout.trim().split('\n').filter(s => s.length > 0);
    
    if (sessionNames.length === 0) {
      console.log(chalk.gray('  ℹ️ 削除対象のtmuxセッションがありません'));
      return;
    }
    
    // Known session patterns to clean up
    const patterns = ['strategy', 'analysis', 'president', 'multiagent', 'development', 'quality', 'research', 'product'];
    
    for (const sessionName of sessionNames) {
      const shouldKill = patterns.some(pattern => sessionName.includes(pattern));
      
      if (shouldKill) {
        try {
          await execCommand(`tmux kill-session -t "${sessionName}"`);
          console.log(chalk.gray(`  ✅ セッション終了: ${sessionName}`));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️ セッション終了失敗: ${sessionName}`));
        }
      }
    }
    
  } catch (error) {
    console.log(chalk.gray('  ℹ️ tmuxセッションが見つかりません（正常）'));
  }
}

/**
 * Cleanup temporary files
 */
async function cleanupTempFiles() {
  const tempPaths = [
    './tmp/agent_mapping.sh',
    './tmp/agent_mapping.json',
    './tmp/current_scenario.txt',
    './tmp/session_status.json'
  ];
  
  for (const path of tempPaths) {
    try {
      if (await fs.pathExists(path)) {
        await fs.remove(path);
        console.log(chalk.gray(`  ✅ 削除: ${path}`));
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️ 削除失敗: ${path}`));
    }
  }
  
  // Clean up empty directories
  try {
    const tmpDir = './tmp';
    if (await fs.pathExists(tmpDir)) {
      const files = await fs.readdir(tmpDir);
      if (files.length === 0) {
        await fs.remove(tmpDir);
        console.log(chalk.gray(`  ✅ 空ディレクトリ削除: ${tmpDir}`));
      }
    }
  } catch (error) {
    // Ignore errors for directory cleanup
  }
}

/**
 * Archive log files
 */
async function archiveLogs() {
  try {
    const logsDir = './logs';
    if (!await fs.pathExists(logsDir)) {
      console.log(chalk.gray('  ℹ️ ログディレクトリが存在しません'));
      return;
    }
    
    const files = await fs.readdir(logsDir);
    if (files.length === 0) {
      console.log(chalk.gray('  ℹ️ アーカイブするログファイルがありません'));
      return;
    }
    
    // Create archive directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = `./logs/archive/${timestamp}`;
    await fs.ensureDir(archiveDir);
    
    // Move log files to archive
    for (const file of files) {
      const srcPath = `./logs/${file}`;
      const destPath = `${archiveDir}/${file}`;
      
      if (file !== 'archive') {
        try {
          await fs.move(srcPath, destPath);
          console.log(chalk.gray(`  ✅ アーカイブ: ${file}`));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️ アーカイブ失敗: ${file}`));
        }
      }
    }
    
    console.log(chalk.green(`  📦 ログアーカイブ完了: ${archiveDir}`));
    
  } catch (error) {
    console.log(chalk.yellow('  ⚠️ ログアーカイブに失敗しました'));
  }
}

/**
 * Get default scenarios configuration
 */
function getDefaultScenarios() {
  return {
    'hello-world': {
      name: 'Hello World Demo',
      description: '基本的なマルチエージェント通信デモ',
      tmux_sessions: {
        president: { window_name: 'president', panes: [{ role: 'president' }] },
        multiagent: { window_name: 'multiagent-team', panes: [
          { role: 'boss1' }, { role: 'worker1' }, { role: 'worker2' }, { role: 'worker3' }
        ]}
      },
      agents: {
        president: { role: '統括責任者', session: 'president', pane: 0 },
        boss1: { role: 'チームリーダー', session: 'multiagent', pane: 0 },
        worker1: { role: 'ワーカー1', session: 'multiagent', pane: 1 },
        worker2: { role: 'ワーカー2', session: 'multiagent', pane: 2 },
        worker3: { role: 'ワーカー3', session: 'multiagent', pane: 3 }
      }
    },
    'business-strategy': {
      name: 'Business Strategy Discussion',
      description: '事業戦略や経営方針を議論するシナリオ',
      tmux_sessions: {
        strategy: { window_name: 'strategy-team', panes: [
          { role: 'ceo' }, { role: 'cto' }, { role: 'cfo' }, { role: 'cmo' }
        ]},
        analysis: { window_name: 'analysis-team', panes: [
          { role: 'product_manager' }, { role: 'data_analyst' }
        ]}
      },
      agents: {
        ceo: { role: '最高経営責任者', session: 'strategy', pane: 0 },
        cto: { role: '最高技術責任者', session: 'strategy', pane: 1 },
        cfo: { role: '最高財務責任者', session: 'strategy', pane: 2 },
        cmo: { role: '最高マーケティング責任者', session: 'strategy', pane: 3 },
        product_manager: { role: 'プロダクトマネージャー', session: 'analysis', pane: 0 },
        data_analyst: { role: 'データアナリスト', session: 'analysis', pane: 1 }
      }
    }
  };
}

/**
 * Execute shell command
 */
function execCommand(command) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
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

module.exports = {
  listScenarios,
  resetEnvironment,
  getScenarioConfig
};