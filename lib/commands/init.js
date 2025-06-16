/**
 * Initialize claude-agents in current project
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const yaml = require('js-yaml');
const { getScenarioConfig } = require('../core/scenario-manager');
const { setupDirectories } = require('../utils/file-helpers');
const { checkDependencies } = require('../utils/dependency-checker');

async function initCommand(options) {
  console.log(chalk.cyan('🚀 Claude Agents プロジェクト初期化'));
  console.log('');

  try {
    // 依存関係チェック
    console.log(chalk.yellow('📋 依存関係をチェック中...'));
    const depCheck = await checkDependencies();
    if (!depCheck.success) {
      console.log(chalk.red('❌ 依存関係エラー:'));
      depCheck.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
      console.log(chalk.yellow('💡 インストールコマンド:'));
      depCheck.recommendations.forEach(rec => console.log(chalk.cyan(`  ${rec}`)));
      process.exit(1);
    }
    console.log(chalk.green('✅ 依存関係OK'));

    // 既存設定チェック
    const configExists = await fs.pathExists('./claude-agents.yaml');
    if (configExists && !options.force) {
      console.log(chalk.yellow('⚠️  claude-agents.yaml が既に存在します'));
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: '既存の設定を上書きしますか？',
        default: false
      }]);
      
      if (!overwrite) {
        console.log(chalk.blue('初期化をキャンセルしました'));
        return;
      }
    }

    // シナリオ選択（対話式またはオプション指定）
    let selectedScenario = options.scenario;
    if (!selectedScenario) {
      const { scenario } = await inquirer.prompt([{
        type: 'list',
        name: 'scenario',
        message: '初期シナリオを選択してください:',
        choices: [
          { name: '🏢 Business Strategy - 事業戦略ディスカッション', value: 'business-strategy' },
          { name: '👋 Hello World - 基本的なマルチエージェント通信', value: 'hello-world' },
          { name: '💻 Collaborative Coding - 共同コーディング', value: 'collaborative-coding' },
          { name: '📊 Market Analysis - 市場分析・競合調査', value: 'market-analysis' },
          { name: '🚀 Product Development - プロダクト開発', value: 'product-development' }
        ],
        default: 'business-strategy'
      }]);
      selectedScenario = scenario;
    }

    // ディレクトリ構造作成
    console.log(chalk.yellow('📁 ディレクトリ構造を作成中...'));
    await setupDirectories();
    console.log(chalk.green('✅ ディレクトリ作成完了'));

    // 設定ファイル作成
    console.log(chalk.yellow('⚙️ 設定ファイルを作成中...'));
    const config = {
      version: '2.0.0',
      currentScenario: selectedScenario,
      projectName: path.basename(process.cwd()),
      scenarios: await getScenarioConfig(),
      settings: {
        tmuxPrefix: 'C-b',
        autoStartClaude: true,
        logLevel: 'info',
        colorOutput: true
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile('./claude-agents.yaml', yaml.dump(config, { indent: 2, lineWidth: 120 }));
    console.log(chalk.green('✅ claude-agents.yaml 作成完了'));

    // テンプレートファイルコピー
    console.log(chalk.yellow('📄 テンプレートファイルをコピー中...'));
    await copyTemplateFiles(selectedScenario);
    console.log(chalk.green('✅ テンプレートファイル配置完了'));

    // .gitignore更新
    await updateGitignore();

    // 完了メッセージ
    console.log('');
    console.log(chalk.green('🎉 初期化が完了しました！'));
    console.log('');
    console.log(chalk.cyan('📋 次のステップ:'));
    console.log(`  1. ${chalk.yellow('claude-agents start')} - エージェントを起動`);
    console.log(`  2. ${chalk.yellow('claude-agents status')} - システム状態を確認`);
    console.log(`  3. ${chalk.yellow('claude-agents list')} - 利用可能シナリオを確認`);
    console.log('');
    console.log(chalk.cyan('🎯 クイックスタート:'));
    console.log(chalk.yellow('  claude-agents start && tmux attach-session -t strategy'));

  } catch (error) {
    console.error(chalk.red('❌ 初期化エラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function copyTemplateFiles(scenario) {
  const templateDir = path.join(__dirname, '../../templates');
  
  // 共通テンプレート
  if (await fs.pathExists(path.join(templateDir, 'common'))) {
    await fs.copy(
      path.join(templateDir, 'common'),
      '.',
      { overwrite: true, filter: (src) => !src.includes('.DS_Store') }
    );
  }

  // シナリオ別テンプレート
  const scenarioTemplateDir = path.join(templateDir, 'scenarios', scenario);
  if (await fs.pathExists(scenarioTemplateDir)) {
    await fs.copy(
      scenarioTemplateDir,
      './scenarios',
      { overwrite: true, filter: (src) => !src.includes('.DS_Store') }
    );
  }
}

async function updateGitignore() {
  const gitignoreEntries = [
    '# Claude Agents',
    '.claude-agents/',
    'tmp/',
    'logs/',
    '*.log'
  ];

  const gitignorePath = './.gitignore';
  let gitignoreContent = '';
  
  if (await fs.pathExists(gitignorePath)) {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
  }

  const missingEntries = gitignoreEntries.filter(entry => 
    !gitignoreContent.includes(entry.replace('# ', ''))
  );

  if (missingEntries.length > 0) {
    const newContent = gitignoreContent + '\n\n' + missingEntries.join('\n') + '\n';
    await fs.writeFile(gitignorePath, newContent);
  }
}

module.exports = initCommand;