/**
 * Tmux session management for claude-agents
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const chalk = require('chalk');
const { saveAgentMapping } = require('./agent-manager');

/**
 * Setup tmux sessions for scenario
 */
async function setupTmuxSessions(scenarioConfig) {
  try {
    const sessions = scenarioConfig.tmux_sessions;
    
    for (const [sessionName, sessionConfig] of Object.entries(sessions)) {
      await createTmuxSession(sessionName, sessionConfig);
    }
    
    console.log(chalk.green(`✅ Created ${Object.keys(sessions).length} tmux sessions`));
  } catch (error) {
    throw new Error(`Failed to setup tmux sessions: ${error.message}`);
  }
}

/**
 * Create individual tmux session
 */
async function createTmuxSession(sessionName, sessionConfig) {
  try {
    // Kill existing session if it exists
    try {
      await execTmuxCommand(`tmux kill-session -t ${sessionName}`);
      console.log(chalk.gray(`  🗑️ Removed existing session: ${sessionName}`));
    } catch (error) {
      // Session doesn't exist, which is fine
    }
    
    // Create new session
    const windowName = sessionConfig.window_name || sessionName;
    await execTmuxCommand(`tmux new-session -d -s ${sessionName} -n ${windowName}`);
    console.log(chalk.blue(`  ✅ Created session: ${sessionName}`));
    
    // Create additional panes
    const panes = sessionConfig.panes || [];
    for (let i = 1; i < panes.length; i++) {
      await execTmuxCommand(`tmux split-window -t ${sessionName}`);
      console.log(chalk.gray(`    📱 Added pane ${i + 1}`));
    }
    
    // Layout panes evenly
    if (panes.length > 1) {
      await execTmuxCommand(`tmux select-layout -t ${sessionName} tiled`);
    }
    
    // Set up pane colors and prompts
    await setupPaneColors(sessionName, windowName, panes);
    
  } catch (error) {
    throw new Error(`Failed to create tmux session ${sessionName}: ${error.message}`);
  }
}

/**
 * Setup pane colors and prompts
 */
async function setupPaneColors(sessionName, windowName, panes) {
  try {
    for (let i = 0; i < panes.length; i++) {
      const pane = panes[i];
      const paneTarget = `${sessionName}:1.${i + 1}`;
      
      // Set pane color if specified
      if (pane.color) {
        const colorCode = getColorCode(pane.color);
        const prompt = `PS1='\\[\\033[1;${colorCode}m\\]${pane.role || 'agent'}\\[\\033[0m\\]@\\h:\\w\\$ '`;
        
        await execTmuxCommand(`tmux send-keys -t ${paneTarget} "${prompt}" C-m`);
        await execTmuxCommand(`tmux send-keys -t ${paneTarget} "clear" C-m`);
      }
      
      // Send initial setup command
      const setupCmd = `echo "🤖 ${pane.role || 'Agent'} ready - Type 'claude' to start"`;
      await execTmuxCommand(`tmux send-keys -t ${paneTarget} "${setupCmd}" C-m`);
    }
  } catch (error) {
    console.log(chalk.yellow(`  ⚠️ Failed to setup pane colors: ${error.message}`));
  }
}

/**
 * Generate agent mapping for tmux targets
 */
async function generateAgentMapping(scenarioConfig) {
  try {
    const mapping = {};
    
    // Generate mapping based on scenario configuration
    for (const [agentName, agentConfig] of Object.entries(scenarioConfig.agents)) {
      const sessionName = agentConfig.session;
      const paneIndex = agentConfig.pane;
      
      // Get session configuration
      const sessionConfig = scenarioConfig.tmux_sessions[sessionName];
      if (!sessionConfig) {
        throw new Error(`Session configuration not found: ${sessionName}`);
      }
      
      // Generate tmux target
      mapping[agentName] = `${sessionName}:1.${paneIndex + 1}`;
    }
    
    // Save mapping
    await saveAgentMapping(mapping);
    
    console.log(chalk.green(`✅ Generated mapping for ${Object.keys(mapping).length} agents`));
    return mapping;
  } catch (error) {
    throw new Error(`Failed to generate agent mapping: ${error.message}`);
  }
}

/**
 * Check if tmux session exists
 */
async function sessionExists(sessionName) {
  try {
    await execTmuxCommand(`tmux has-session -t "${sessionName}"`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of existing tmux sessions
 */
async function getExistingSessions() {
  try {
    const result = await execTmuxCommand('tmux list-sessions -F "#{session_name}"');
    return result.stdout.trim().split('\n').filter(s => s.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Kill tmux session
 */
async function killSession(sessionName) {
  try {
    await execTmuxCommand(`tmux kill-session -t ${sessionName}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Kill multiple tmux sessions
 */
async function killTmuxSessions(sessionNames) {
  for (const sessionName of sessionNames) {
    await killSession(sessionName);
  }
}

/**
 * List all tmux sessions
 */
async function listTmuxSessions() {
  try {
    const result = await execTmuxCommand('tmux list-sessions');
    const lines = result.stdout.trim().split('\n');
    
    return lines
      .filter(line => line.includes(':'))
      .map(line => line.split(':')[0])
      .filter(name => name && name.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Get pane information for session
 */
async function getSessionPanes(sessionName) {
  try {
    const result = await execTmuxCommand(
      `tmux list-panes -t "${sessionName}" -F "#{pane_index}:#{pane_current_command}:#{pane_title}"`
    );
    
    return result.stdout.trim().split('\n').map(line => {
      const [index, command, title] = line.split(':');
      return {
        index: parseInt(index),
        command,
        title
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Send command to tmux pane
 */
async function sendToPane(target, command, options = {}) {
  try {
    // Clear pane first if requested
    if (options.clear) {
      await execTmuxCommand(`tmux send-keys -t "${target}" C-c`);
      await sleep(100);
    }
    
    // Send command
    await execTmuxCommand(`tmux send-keys -t "${target}" "${escapeCommand(command)}" C-m`);
    
    // Wait if specified
    if (options.wait) {
      await sleep(options.wait * 1000);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Failed to send command to ${target}: ${error.message}`);
  }
}

/**
 * Get color code for terminal colors
 */
function getColorCode(color) {
  const colorMap = {
    black: '30',
    red: '31',
    green: '32',
    yellow: '33',
    blue: '34',
    magenta: '35',
    cyan: '36',
    white: '37'
  };
  
  return colorMap[color.toLowerCase()] || '37';
}

/**
 * Escape command for tmux
 */
function escapeCommand(command) {
  return command
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

/**
 * Parse command string into arguments array
 */
function parseCommand(command) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quote = '';
  
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    
    if (inQuotes) {
      if (char === quote) {
        inQuotes = false;
        quote = '';
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuotes = true;
      quote = char;
    } else if (char === ' ') {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

/**
 * Execute tmux command
 */
function execTmuxCommand(command) {
  return new Promise((resolve, reject) => {
    // Split command properly handling quoted strings
    const args = parseCommand(command);
    const cmd = args.shift();
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

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  setupTmuxSessions,
  createTmuxSession,
  generateAgentMapping,
  sessionExists,
  getExistingSessions,
  killSession,
  killTmuxSessions,
  listTmuxSessions,
  getSessionPanes,
  sendToPane
};