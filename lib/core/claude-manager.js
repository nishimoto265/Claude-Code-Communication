/**
 * Claude Code management for claude-agents
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const { sendToPane } = require('./tmux-manager');

/**
 * Start Claude Code agents in tmux sessions
 */
async function startClaudeAgents(scenarioConfig) {
  try {
    console.log(chalk.yellow('🤖 Starting Claude Code agents...'));
    
    const sessions = scenarioConfig.tmux_sessions;
    const startedPanes = [];
    
    for (const [sessionName, sessionConfig] of Object.entries(sessions)) {
      const windowName = sessionConfig.window_name || sessionName;
      const panes = sessionConfig.panes || [];
      
      console.log(chalk.blue(`  📱 Starting agents in session: ${sessionName}`));
      
      for (let i = 0; i < panes.length; i++) {
        const pane = panes[i];
        const target = `${sessionName}:1.${i + 1}`;
        
        try {
          // Send claude command to pane
          await sendToPane(target, 'claude', { clear: true, wait: 0.5 });
          startedPanes.push({ target, role: pane.role || 'agent' });
          
          console.log(chalk.gray(`    ✅ Started: ${pane.role || 'agent'} (${target})`));
        } catch (error) {
          console.log(chalk.yellow(`    ⚠️ Failed to start: ${pane.role || 'agent'} (${target})`));
        }
      }
    }
    
    if (startedPanes.length > 0) {
      console.log(chalk.green(`✅ Started Claude Code on ${startedPanes.length} panes`));
      showClaudeStartupInstructions();
    } else {
      console.log(chalk.yellow('⚠️ No panes were started - manual startup required'));
      showManualStartupInstructions(scenarioConfig);
    }
    
  } catch (error) {
    throw new Error(`Failed to start Claude agents: ${error.message}`);
  }
}

/**
 * Show Claude startup instructions
 */
function showClaudeStartupInstructions() {
  console.log('');
  console.log(chalk.cyan('📋 Claude Code 起動完了'));
  console.log('');
  console.log(chalk.yellow('⚠️ 重要な注意事項:'));
  console.log('  1. 最初のペインで Claude Code の認証を完了してください');
  console.log('  2. 認証完了後、他のペインでも自動的に認証されます');
  console.log('  3. 各ペインで Claude Code が起動していることを確認してください');
  console.log('');
  console.log(chalk.cyan('🎯 認証後の推奨手順:'));
  console.log('  1. 適切なセッションにアタッチ');
  console.log('  2. 各エージェントが応答可能か確認');
  console.log('  3. シナリオに応じた初期メッセージを送信');
}

/**
 * Show manual startup instructions
 */
function showManualStartupInstructions(scenarioConfig) {
  console.log('');
  console.log(chalk.cyan('📋 手動起動手順:'));
  console.log('');
  
  const sessions = Object.keys(scenarioConfig.tmux_sessions);
  
  for (const sessionName of sessions) {
    const sessionConfig = scenarioConfig.tmux_sessions[sessionName];
    const windowName = sessionConfig.window_name || sessionName;
    const paneCount = sessionConfig.panes ? sessionConfig.panes.length : 1;
    
    console.log(chalk.yellow(`📱 ${sessionName} セッション:`));
    console.log(`  # 最初のペインで認証`);
    console.log(`  tmux send-keys -t "${sessionName}:1.1" 'claude' C-m`);
    console.log('');
    console.log(`  # 認証完了後、全ペインで一括起動`);
    console.log(`  for i in {1..${paneCount}}; do`);
    console.log(`    tmux send-keys -t "${sessionName}:1.$i" 'claude' C-m`);
    console.log(`  done`);
    console.log('');
  }
}

/**
 * Check Claude Code status in sessions
 */
async function checkClaudeStatus(scenarioConfig) {
  try {
    const sessions = scenarioConfig.tmux_sessions;
    const status = {};
    
    for (const [sessionName, sessionConfig] of Object.entries(sessions)) {
      const windowName = sessionConfig.window_name || sessionName;
      const panes = sessionConfig.panes || [];
      
      const paneStatuses = [];
      
      for (let i = 0; i < panes.length; i++) {
        const target = `${sessionName}:1.${i + 1}`;
        const paneStatus = await checkPaneClaudeStatus(target);
        
        paneStatuses.push({
          target,
          role: panes[i].role || 'agent',
          ...paneStatus
        });
      }
      
      status[sessionName] = {
        totalPanes: panes.length,
        activePanes: paneStatuses.filter(p => p.isRunning).length,
        panes: paneStatuses
      };
    }
    
    return status;
  } catch (error) {
    throw new Error(`Failed to check Claude status: ${error.message}`);
  }
}

/**
 * Check if Claude Code is running in specific pane
 */
async function checkPaneClaudeStatus(target) {
  try {
    // Get pane information
    const result = await execCommand(
      `tmux display-message -t "${target}" -p "#{pane_current_command}:#{pane_pid}"`
    );
    
    const [command, pid] = result.stdout.trim().split(':');
    
    const isRunning = command.includes('claude') || 
                     command.includes('python') ||
                     (command !== 'bash' && command !== 'zsh' && command !== 'sh');
    
    return {
      isRunning,
      command,
      pid: parseInt(pid),
      status: isRunning ? 'active' : 'idle'
    };
  } catch (error) {
    return {
      isRunning: false,
      command: 'unknown',
      pid: null,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Stop Claude Code in all panes
 */
async function stopClaudeAgents(scenarioConfig) {
  try {
    console.log(chalk.yellow('🛑 Stopping Claude Code agents...'));
    
    const sessions = scenarioConfig.tmux_sessions;
    let stoppedCount = 0;
    
    for (const [sessionName, sessionConfig] of Object.entries(sessions)) {
      const windowName = sessionConfig.window_name || sessionName;
      const panes = sessionConfig.panes || [];
      
      for (let i = 0; i < panes.length; i++) {
        const target = `${sessionName}:1.${i + 1}`;
        
        try {
          // Send Ctrl+C to stop Claude
          await sendToPane(target, '', { clear: true });
          stoppedCount++;
          
          console.log(chalk.gray(`  ✅ Stopped: ${target}`));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️ Failed to stop: ${target}`));
        }
      }
    }
    
    console.log(chalk.green(`✅ Stopped Claude Code on ${stoppedCount} panes`));
  } catch (error) {
    throw new Error(`Failed to stop Claude agents: ${error.message}`);
  }
}

/**
 * Restart Claude Code in specific pane
 */
async function restartClaudeAgent(target, options = {}) {
  try {
    console.log(chalk.yellow(`🔄 Restarting Claude agent: ${target}`));
    
    // Stop current process
    await sendToPane(target, '', { clear: true, wait: 0.5 });
    
    // Start Claude again
    await sendToPane(target, 'claude', { wait: options.wait || 1 });
    
    console.log(chalk.green(`✅ Restarted Claude agent: ${target}`));
  } catch (error) {
    throw new Error(`Failed to restart Claude agent ${target}: ${error.message}`);
  }
}

/**
 * Send test message to verify Claude is responsive
 */
async function testClaudeAgent(target) {
  try {
    const testMessage = 'echo "Claude agent test - please respond with OK"';
    
    await sendToPane(target, testMessage, { wait: 2 });
    
    // Note: We can't easily capture the response in tmux,
    // so this just sends the test message
    return { sent: true, target };
  } catch (error) {
    throw new Error(`Failed to test Claude agent ${target}: ${error.message}`);
  }
}

/**
 * Execute command
 */
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

module.exports = {
  startClaudeAgents,
  checkClaudeStatus,
  stopClaudeAgents,
  restartClaudeAgent,
  testClaudeAgent
};