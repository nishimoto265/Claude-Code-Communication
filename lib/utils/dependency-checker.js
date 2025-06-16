/**
 * Dependency checker for claude-agents
 */

const { spawn } = require('child_process');
const os = require('os');

/**
 * Check all dependencies and return status
 */
async function checkDependencies() {
  const checks = [
    checkTmux(),
    checkClaude(),
    checkNode()
  ];
  
  const results = await Promise.all(checks);
  
  const errors = [];
  const recommendations = [];
  
  results.forEach(result => {
    if (!result.success) {
      errors.push(result.error);
      if (result.recommendation) {
        recommendations.push(result.recommendation);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors,
    recommendations
  };
}

/**
 * Check if tmux is available
 */
async function checkTmux() {
  try {
    await execCommand('tmux -V');
    return { success: true };
  } catch (error) {
    const platform = os.platform();
    let recommendation = '';
    
    switch (platform) {
      case 'darwin':
        recommendation = 'brew install tmux';
        break;
      case 'linux':
        recommendation = 'sudo apt update && sudo apt install tmux';
        break;
      default:
        recommendation = 'Install tmux for your operating system';
    }
    
    return {
      success: false,
      error: 'tmux is not installed',
      recommendation
    };
  }
}

/**
 * Check if Claude CLI is available
 */
async function checkClaude() {
  try {
    await execCommand('claude --version');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Claude Code CLI is not installed',
      recommendation: 'Download Claude Code CLI from https://claude.ai/code'
    };
  }
}

/**
 * Check Node.js version
 */
async function checkNode() {
  try {
    const result = await execCommand('node --version');
    const version = result.stdout.trim();
    const majorVersion = parseInt(version.substring(1).split('.')[0]);
    
    if (majorVersion >= 14) {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Node.js version ${version} is too old (requires >= 14.0.0)`,
        recommendation: 'Update Node.js to version 14 or higher'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Node.js is not installed',
      recommendation: 'Install Node.js from https://nodejs.org/'
    };
  }
}

/**
 * Check if project is in a git repository
 */
async function checkGitRepository() {
  try {
    await execCommand('git rev-parse --git-dir');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Not in a git repository',
      recommendation: 'git init (optional but recommended)'
    };
  }
}

/**
 * Check tmux server status
 */
async function checkTmuxServer() {
  try {
    await execCommand('tmux list-sessions');
    return { 
      success: true, 
      hasSessions: true 
    };
  } catch (error) {
    // No sessions is normal
    return { 
      success: true, 
      hasSessions: false 
    };
  }
}

/**
 * Check available disk space
 */
async function checkDiskSpace() {
  try {
    const result = await execCommand('df -h .');
    const lines = result.stdout.trim().split('\n');
    
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const available = parts[3];
      
      // Extract numeric value (rough check)
      const availableNum = parseFloat(available);
      const unit = available.slice(-1).toLowerCase();
      
      let availableMB = 0;
      if (unit === 'g') {
        availableMB = availableNum * 1024;
      } else if (unit === 'm') {
        availableMB = availableNum;
      } else if (unit === 'k') {
        availableMB = availableNum / 1024;
      }
      
      if (availableMB < 100) {
        return {
          success: false,
          error: `Low disk space: ${available} available`,
          recommendation: 'Free up disk space before proceeding'
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    // Disk space check is optional
    return { success: true };
  }
}

/**
 * Comprehensive system check
 */
async function fullSystemCheck() {
  const checks = [
    { name: 'Node.js', check: checkNode() },
    { name: 'tmux', check: checkTmux() },
    { name: 'Claude CLI', check: checkClaude() },
    { name: 'Git Repository', check: checkGitRepository() },
    { name: 'Tmux Server', check: checkTmuxServer() },
    { name: 'Disk Space', check: checkDiskSpace() }
  ];
  
  const results = {};
  
  for (const { name, check } of checks) {
    try {
      results[name] = await check;
    } catch (error) {
      results[name] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
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
  checkDependencies,
  checkTmux,
  checkClaude,
  checkNode,
  checkGitRepository,
  checkTmuxServer,
  checkDiskSpace,
  fullSystemCheck
};