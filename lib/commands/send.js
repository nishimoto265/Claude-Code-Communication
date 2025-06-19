/**
 * Send message to specific agent
 */

const fs = require('fs-extra');
const chalk = require('chalk');
const { spawn } = require('child_process');

const { loadConfig, getScenarioConfig } = require('../core/config-manager');
const { getAgentMapping, findAgent } = require('../core/agent-manager');

async function sendCommand(agent, message, options) {
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
    
    if (!currentScenario) {
      console.log(chalk.red('❌ 現在のシナリオが設定されていません'));
      console.log(chalk.yellow('💡 シナリオを開始してください: claude-agents start <scenario>'));
      process.exit(1);
    }

    // シナリオ設定読み込み（エイリアス解決用）
    const scenarioConfig = await getScenarioConfig(currentScenario);
    
    // エージェントマッピング読み込み
    const agentMapping = await getAgentMapping();
    
    // エージェント存在確認（エイリアス対応）
    const foundAgent = await findAgent(agent, scenarioConfig);
    if (!foundAgent) {
      console.log(chalk.red(`❌ エージェント '${agent}' が見つかりません`));
      console.log(chalk.yellow('💡 利用可能なエージェント:'));
      Object.keys(agentMapping).forEach(agentName => {
        const target = agentMapping[agentName];
        console.log(`  - ${chalk.cyan(agentName)} → ${chalk.gray(target)}`);
      });
      
      // エイリアス情報表示
      if (scenarioConfig.agents) {
        console.log(chalk.yellow('💡 エイリアス:'));
        for (const [agentName, agentConfig] of Object.entries(scenarioConfig.agents)) {
          if (agentConfig.aliases && agentConfig.aliases.length > 0) {
            console.log(`  - ${chalk.cyan(agentConfig.aliases.join(', '))} → ${chalk.gray(agentName)}`);
          }
        }
      }
      process.exit(1);
    }

    const finalAgentName = foundAgent.name;
    const tmuxTarget = foundAgent.target;
    
    // メッセージ送信
    console.log(chalk.blue(`📤 メッセージ送信: ${chalk.cyan(finalAgentName)} (${chalk.gray(tmuxTarget)})`));
    if (finalAgentName !== agent) {
      console.log(chalk.gray(`🔗 エイリアス: ${chalk.cyan(agent)} → ${chalk.cyan(finalAgentName)}`));
    }
    console.log(chalk.gray(`💬 "${message}"`));
    
    await sendToTmux(tmuxTarget, message, options);
    
    // ログ記録
    await logMessage(finalAgentName, message, tmuxTarget);
    
    console.log(chalk.green('✅ メッセージ送信完了'));

  } catch (error) {
    console.error(chalk.red('❌ 送信エラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function sendToTmux(target, message, options) {
  const waitTime = parseFloat(options.wait) || 0.5;
  
  try {
    // プロンプトクリア（Ctrl+C）
    await execTmuxCommand(`tmux send-keys -t ${target} C-c`);
    await sleep(300); // 300ms待機
    
    // メッセージのみ送信（引用符なし）
    await execTmuxCommand(`tmux send-keys -t ${target} ${escapeMessage(message)}`);
    await sleep(100); // 100ms待機
    
    // Enterのみ送信
    await execTmuxCommand(`tmux send-keys -t ${target} C-m`);
    await sleep(500); // 500ms待機
    
    // 指定時間待機
    if (waitTime > 0) {
      await sleep(waitTime * 1000);
    }
    
  } catch (error) {
    throw new Error(`Tmux送信失敗: ${error.message}`);
  }
}

function escapeMessage(message) {
  // tmux用にエスケープ
  return message
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

async function execTmuxCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { stdio: 'pipe' });
    
    let stderr = '';
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command}: ${stderr}`));
      }
    });
  });
}

async function logMessage(agent, message, target) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    agent,
    target,
    message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
    length: message.length
  };
  
  // ログディレクトリ作成
  await fs.ensureDir('./logs');
  
  // 送信ログ記録
  const logFile = './logs/send_log.jsonl';
  const logLine = JSON.stringify(logEntry) + '\n';
  await fs.appendFile(logFile, logLine);
  
  // 日付別ログも記録
  const dateStr = new Date().toISOString().split('T')[0];
  const dailyLogFile = `./logs/send_${dateStr}.jsonl`;
  await fs.appendFile(dailyLogFile, logLine);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = sendCommand;