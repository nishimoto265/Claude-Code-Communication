/**
 * Tmux session status checker for claude-agents
 */

const { spawn } = require('child_process');

/**
 * Check tmux sessions for scenario
 */
async function checkTmuxSessions(scenarioConfig) {
  try {
    const requiredSessions = Object.keys(scenarioConfig.tmux_sessions);
    const existingSessions = await getExistingSessions();
    
    const sessionStatus = {
      required: requiredSessions,
      existing: existingSessions,
      existingSessions: requiredSessions.filter(session => existingSessions.includes(session)),
      missingSessions: requiredSessions.filter(session => !existingSessions.includes(session)),
      allSessionsExist: requiredSessions.every(session => existingSessions.includes(session)),
      noSessionsExist: !requiredSessions.some(session => existingSessions.includes(session))
    };
    
    return sessionStatus;
  } catch (error) {
    throw new Error(`Failed to check tmux sessions: ${error.message}`);
  }
}

/**
 * Get list of existing tmux sessions
 */
async function getExistingSessions() {
  try {
    const result = await execCommand('tmux list-sessions -F "#{session_name}"');
    return result.stdout.trim().split('\n').filter(s => s.length > 0);
  } catch (error) {
    // No sessions exist
    return [];
  }
}

/**
 * Check if specific session exists
 */
async function sessionExists(sessionName) {
  try {
    await execCommand(`tmux has-session -t "${sessionName}"`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get detailed session information
 */
async function getSessionInfo(sessionName) {
  try {
    const exists = await sessionExists(sessionName);
    if (!exists) {
      return { exists: false };
    }
    
    // Get session details
    const sessionResult = await execCommand(
      `tmux display-message -t "${sessionName}" -p "#{session_name}:#{session_windows}:#{session_created}"`
    );
    
    const [name, windowCount, created] = sessionResult.stdout.trim().split(':');
    
    // Get pane information
    const panesResult = await execCommand(
      `tmux list-panes -t "${sessionName}" -F "#{pane_index}:#{pane_current_command}:#{pane_pid}"`
    );
    
    const panes = panesResult.stdout.trim().split('\n').map(line => {
      const [index, command, pid] = line.split(':');
      return {
        index: parseInt(index),
        command,
        pid: parseInt(pid),
        isActive: command !== 'bash' && command !== 'zsh' && command !== 'sh'
      };
    });
    
    return {
      exists: true,
      name,
      windowCount: parseInt(windowCount),
      created,
      panes,
      activePanes: panes.filter(p => p.isActive).length
    };
  } catch (error) {
    throw new Error(`Failed to get session info for ${sessionName}: ${error.message}`);
  }
}

/**
 * Check if Claude Code is running in sessions
 */
async function checkClaudeStatus(scenarioConfig) {
  try {
    const sessions = Object.keys(scenarioConfig.tmux_sessions);
    const claudeStatus = {};
    
    for (const sessionName of sessions) {
      const sessionInfo = await getSessionInfo(sessionName);
      
      if (sessionInfo.exists) {
        const claudePanes = sessionInfo.panes.filter(pane => 
          pane.command.includes('claude') || 
          pane.command.includes('python') ||
          pane.command.includes('node')
        );
        
        claudeStatus[sessionName] = {
          exists: true,
          totalPanes: sessionInfo.panes.length,
          claudePanes: claudePanes.length,
          activePanes: sessionInfo.activePanes,
          panes: claudePanes.map(p => ({
            index: p.index,
            command: p.command
          }))
        };
      } else {
        claudeStatus[sessionName] = {
          exists: false,
          totalPanes: 0,
          claudePanes: 0,
          activePanes: 0,
          panes: []
        };
      }
    }
    
    return claudeStatus;
  } catch (error) {
    throw new Error(`Failed to check Claude status: ${error.message}`);
  }
}

/**
 * Get comprehensive tmux status
 */
async function getFullTmuxStatus() {
  try {
    const existingSessions = await getExistingSessions();
    const sessionDetails = {};
    
    for (const sessionName of existingSessions) {
      sessionDetails[sessionName] = await getSessionInfo(sessionName);
    }
    
    // Get tmux server info
    let serverInfo = {};
    try {
      const serverResult = await execCommand('tmux info');
      const serverLines = serverResult.stdout.split('\n');
      
      serverInfo = {
        version: extractInfo(serverLines, 'tmux'),
        pid: extractInfo(serverLines, 'pid'),
        sessions: existingSessions.length
      };
    } catch (error) {
      serverInfo = { error: 'Failed to get server info' };
    }
    
    return {
      server: serverInfo,
      sessions: existingSessions,
      details: sessionDetails,
      totalSessions: existingSessions.length,
      totalPanes: Object.values(sessionDetails).reduce((sum, session) => 
        sum + (session.panes ? session.panes.length : 0), 0
      )
    };
  } catch (error) {
    throw new Error(`Failed to get full tmux status: ${error.message}`);
  }
}

/**
 * Check if tmux server is running
 */
async function isTmuxServerRunning() {
  try {
    await execCommand('tmux info');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract information from tmux info output
 */
function extractInfo(lines, key) {
  const line = lines.find(l => l.toLowerCase().includes(key.toLowerCase()));
  if (line) {
    const parts = line.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }
  return 'unknown';
}

/**
 * Execute command and return result
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
  checkTmuxSessions,
  getExistingSessions,
  sessionExists,
  getSessionInfo,
  checkClaudeStatus,
  getFullTmuxStatus,
  isTmuxServerRunning
};