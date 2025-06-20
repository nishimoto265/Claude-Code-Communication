#!/usr/bin/env node

/**
 * Claude Agents CLI
 * Multi-agent collaboration system for Claude Code
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');

// Import commands
const initCommand = require('../lib/commands/init');
const startCommand = require('../lib/commands/start');
const switchCommand = require('../lib/commands/switch');
const sendCommand = require('../lib/commands/send');
const statusCommand = require('../lib/commands/status');
const createScenarioCommand = require('../lib/commands/create-scenario');
const autoCommand = require('../lib/commands/auto');

const program = new Command();

// CLI configuration
program
  .name('claude-agents')
  .description(chalk.cyan('🤖 Multi-agent collaboration system for Claude Code'))
  .version(version, '-v, --version', 'display version number')
  .helpOption('-h, --help', 'display help for command');

// Global options
program
  .option('--verbose', 'enable verbose logging')
  .option('--no-color', 'disable colored output');

// Commands
program
  .command('init')
  .description('Initialize claude-agents in current project')
  .option('-s, --scenario <type>', 'initial scenario type', 'business-strategy')
  .option('-f, --force', 'overwrite existing configuration')
  .action(initCommand);

program
  .command('start [scenario]')
  .description('Start agents with specified scenario')
  .option('-p, --project <path>', 'project root path', '.')
  .option('--no-claude', 'skip Claude Code startup')
  .action(startCommand);

program
  .command('switch <scenario>')
  .alias('sw')
  .description('Switch to different scenario')
  .option('--preserve-sessions', 'preserve existing tmux sessions')
  .action(switchCommand);

program
  .command('send <agent> <message>')
  .description('Send message to specific agent')
  .option('-w, --wait <seconds>', 'wait time after sending', '0.5')
  .action(sendCommand);

program
  .command('status')
  .alias('st')
  .description('Show system status and agent information')
  .option('-a, --agents', 'show detailed agent mapping')
  .option('-t, --tmux', 'show tmux session status')
  .action(statusCommand);

program
  .command('list')
  .alias('ls')
  .description('List available scenarios')
  .option('-d, --detailed', 'show detailed scenario information')
  .action(async (options) => {
    const { listScenarios } = require('../lib/core/scenario-manager');
    await listScenarios(options);
  });

program
  .command('reset')
  .description('Reset all sessions and cleanup environment')
  .option('-f, --force', 'force reset without confirmation')
  .action(async (options) => {
    const { resetEnvironment } = require('../lib/core/scenario-manager');
    await resetEnvironment(options);
  });

program
  .command('create-scenario')
  .alias('create')
  .description('Create new custom scenario with interactive wizard')
  .option('-n, --name <name>', 'scenario name')
  .option('-d, --description <desc>', 'scenario description')
  .option('-c, --category <category>', 'scenario category')
  .option('-a, --author <author>', 'scenario author')
  .option('--initial-message <message>', 'initial message for scenario')
  .action(createScenarioCommand);

program
  .command('auto')
  .description('Enable agent automation system')
  .option('-i, --interval <seconds>', 'check interval in seconds', '30')
  .option('-m, --mode <mode>', 'automation mode (development/production)', 'development')
  .option('-d, --daemon', 'run in daemon mode with continuous monitoring')
  .action(autoCommand);

// Help customization
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ claude-agents init                     Initialize in current project');
  console.log('  $ claude-agents start business-strategy  Start business strategy scenario');
  console.log('  $ claude-agents send ceo "Hello"         Send message to CEO agent');
  console.log('  $ claude-agents switch market-analysis   Switch to market analysis');
  console.log('  $ claude-agents create-scenario          Create new custom scenario');
  console.log('  $ claude-agents auto --interval 30       Enable automation (30s interval)');
  console.log('  $ claude-agents status                   Show current status');
  console.log('');
  console.log(chalk.cyan('Quick Start:'));
  console.log('  $ npx claude-agents init && claude-agents start');
  console.log('');
  console.log(chalk.yellow('Learn more: https://github.com/claude-agents/claude-agents'));
});

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err) {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}