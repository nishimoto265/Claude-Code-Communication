/**
 * Auto mode command - エージェント自動化システム
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const { loadConfig, getScenarioConfig } = require('../core/config-manager');
const sendCommand = require('./send');

async function autoCommand(options) {
  console.log(chalk.cyan('🤖 エージェント自動化システム起動'));
  console.log('');

  try {
    // 設定確認
    const config = await loadConfig();
    const currentScenario = config.currentScenario;
    
    if (!currentScenario) {
      console.log(chalk.red('❌ アクティブなシナリオがありません'));
      console.log(chalk.yellow('💡 まずシナリオを開始してください: claude-agents start <scenario>'));
      process.exit(1);
    }

    const scenarioConfig = await getScenarioConfig(currentScenario);
    const interval = parseInt(options.interval) || 30;
    const mode = options.mode || 'development';

    console.log(chalk.blue(`🎭 シナリオ: ${scenarioConfig.name}`));
    console.log(chalk.blue(`⏱️ チェック間隔: ${interval}秒`));
    console.log(chalk.blue(`🔧 モード: ${mode}`));
    console.log('');

    // 自動化ファイルの初期化
    await initializeAutomationFiles(currentScenario, scenarioConfig);

    // エージェントに自動化指示を送信
    await sendAutomationInstructions(scenarioConfig, interval);

    // 自動化ループの開始
    if (options.daemon) {
      console.log(chalk.green('🔄 デーモンモードで自動化ループを開始します...'));
      await startAutomationLoop(scenarioConfig, interval, mode);
    } else {
      console.log(chalk.green('✅ 自動化指示を送信完了'));
      console.log(chalk.yellow('💡 デーモンモードで実行するには --daemon オプションを使用してください'));
      showAutomationInstructions();
    }

  } catch (error) {
    console.error(chalk.red('❌ 自動化システムエラー:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function initializeAutomationFiles(scenario, scenarioConfig) {
  console.log(chalk.yellow('📋 自動化ファイルを初期化中...'));

  // tmpディレクトリ作成
  await fs.ensureDir('./tmp');

  // テンプレートからファイルをコピー・初期化
  const templateDir = path.join(__dirname, '../../templates/automation');
  
  // tasks.yaml初期化
  if (!await fs.pathExists('./tmp/tasks.yaml')) {
    const tasksTemplate = await fs.readFile(path.join(templateDir, 'tasks.yaml'), 'utf8');
    const tasksData = yaml.load(tasksTemplate);
    
    tasksData.metadata.created = new Date().toISOString();
    tasksData.metadata.scenario = scenario;
    
    await fs.writeFile('./tmp/tasks.yaml', yaml.dump(tasksData));
    console.log(chalk.green('  ✅ tasks.yaml 初期化完了'));
  }

  // agent-states.yaml初期化
  if (!await fs.pathExists('./tmp/agent-states.yaml')) {
    const statesTemplate = await fs.readFile(path.join(templateDir, 'agent-states.yaml'), 'utf8');
    const statesData = yaml.load(statesTemplate);
    
    statesData.metadata.scenario = scenario;
    statesData.metadata.last_updated = new Date().toISOString();
    
    // シナリオからエージェント情報を追加
    statesData.agents = {};
    if (scenarioConfig.agents) {
      for (const [agentName, agentConfig] of Object.entries(scenarioConfig.agents)) {
        statesData.agents[agentName] = {
          status: 'idle',
          last_activity: new Date().toISOString(),
          current_focus: null,
          assigned_tasks: [],
          completed_tasks: [],
          role: agentConfig.role || agentName,
          performance: {
            tasks_completed: 0,
            average_response_time: 0,
            success_rate: 1.0
          }
        };
      }
    }
    
    await fs.writeFile('./tmp/agent-states.yaml', yaml.dump(statesData));
    console.log(chalk.green('  ✅ agent-states.yaml 初期化完了'));
  }

  // automation.yamlをコピー
  if (!await fs.pathExists('./tmp/automation.yaml')) {
    await fs.copy(path.join(templateDir, 'automation.yaml'), './tmp/automation.yaml');
    console.log(chalk.green('  ✅ automation.yaml 初期化完了'));
  }

  console.log(chalk.green('📋 自動化ファイル初期化完了'));
  console.log('');
}

async function sendAutomationInstructions(scenarioConfig, interval) {
  console.log(chalk.yellow('📤 エージェントに自動化指示を送信中...'));

  // Presidentへの指示
  const presidentAgents = Object.keys(scenarioConfig.agents).filter(name => 
    scenarioConfig.agents[name].role?.includes('統括') || 
    scenarioConfig.agents[name].role?.includes('President') ||
    name === 'president'
  );

  if (presidentAgents.length > 0) {
    const presidentName = presidentAgents[0];
    await sendCommand(presidentName, `
🤖 **自動化モードを開始します**

あなたは自動化システムの最高責任者として、以下のファイルを定期的に監視・管理してください：

📋 **管理ファイル**
- tmp/tasks.yaml: 全タスクの状況
- tmp/agent-states.yaml: エージェント状態  
- tmp/automation.yaml: 自動化設定

🎯 **主要責任**
1. **新規リクエスト処理**: ユーザーからの指示を受けたら即座にタスクに分解
2. **全体統括**: プロジェクト全体の進行状況を監視
3. **品質管理**: 完了タスクの品質チェック
4. **問題解決**: エスカレーションされた問題の解決

⏰ **${interval}秒ごとに以下を確認してください**:
- tmp/tasks.yamlの新規タスクの有無
- プロジェクト全体の進捗状況
- 問題や遅延の発生状況

🔄 **タスク分解の手順**:
1. リクエストを具体的なタスクに分解
2. 各タスクにID（T001, T002...）を付与
3. tmp/tasks.yamlに以下の形式で追加:
   \`\`\`yaml
   - id: "T001"
     title: "タスクタイトル"
     description: "詳細説明"
     status: "pending"
     priority: "medium"
     estimated_time: "30分"
   \`\`\`

常に全体を俯瞰し、チーム全体の効率的な運営を心がけてください。
    `, { wait: 1.0 });
    
    console.log(chalk.green(`  ✅ ${presidentName} に指示送信完了`));
  }

  // Boss/マネージャーへの指示
  const bossAgents = Object.keys(scenarioConfig.agents).filter(name => 
    scenarioConfig.agents[name].role?.includes('リーダー') || 
    scenarioConfig.agents[name].role?.includes('boss') ||
    name.includes('boss') || name.includes('lead')
  );

  for (const bossName of bossAgents) {
    await sendCommand(bossName, `
🤖 **自動管理モードを開始します**

あなたはチームマネージャーとして、worker達の作業を自動的に管理してください：

📋 **管理対象ファイル**
- tmp/tasks.yaml: タスク状況の確認・更新
- tmp/agent-states.yaml: チームメンバーの状態追跡

🎯 **主要責任**
1. **タスク割り当て**: 未割当タスク（status: pending）を適切なworkerに配分
2. **進捗管理**: 各workerの作業状況を定期的にチェック
3. **品質保証**: 完了タスクの内容確認
4. **問題解決**: workerからの相談や問題に対応

⏰ **${interval}秒ごとに以下を実行**:
1. tmp/tasks.yamlで未割当タスクをチェック
2. 各workerの進捗状況を確認
3. 遅延や問題があるタスクを特定

📤 **タスク割り当て方法**:
未割当タスクを発見したら以下のコマンドで指示:
\`claude-agents send [worker名] "新しいタスク: [タスクタイトル]
詳細: [説明]
タスクID: [ID]

作業完了時は 'claude-agents send ${bossName} \"完了報告: [タスクID]\"' で報告してください"\`

チーム全体の効率的な協働を実現してください。
    `, { wait: 1.0 });
    
    console.log(chalk.green(`  ✅ ${bossName} に指示送信完了`));
  }

  // Worker/実行者への指示
  const workerAgents = Object.keys(scenarioConfig.agents).filter(name => 
    scenarioConfig.agents[name].role?.includes('ワーカー') || 
    scenarioConfig.agents[name].role?.includes('worker') ||
    name.includes('worker') || name.includes('engineer')
  );

  for (const workerName of workerAgents) {
    await sendCommand(workerName, `
🤖 **自動実行モードを開始します**

あなたは実行担当者として、割り当てられたタスクを自動的に処理してください：

📋 **参照ファイル**
- tmp/tasks.yaml: 自分に割り当てられたタスクを確認
- tmp/agent-states.yaml: 自分の状態を更新

🎯 **主要責任**
1. **タスク実行**: 割り当てられたタスクを確実に実行
2. **進捗報告**: 作業状況をリアルタイムで更新
3. **問題報告**: 困った時は即座に上司に相談
4. **品質確保**: 完了基準を満たす成果物を作成

⏰ **定期的に以下を実行**:
1. tmp/tasks.yamlで自分のタスク状況をチェック
2. 進捗状況をファイルに更新
3. 必要に応じて上司に状況報告

📝 **作業手順**:
1. 新しいタスクが割り当てられたら即座に着手
2. tmp/tasks.yamlのstatusを "in_progress" に更新
3. 作業中の進捗を定期的に記録
4. 完了時は以下で報告:
   \`claude-agents send [上司名] "完了報告: [タスクID] - [成果物の説明]"\`

❓ **困った時**:
判断に迷ったら以下で相談:
\`claude-agents send [上司名] "判断要請: [タスクID] - [問題内容]"\`

積極的で効率的な作業を心がけてください。
    `, { wait: 1.0 });
    
    console.log(chalk.green(`  ✅ ${workerName} に指示送信完了`));
  }

  console.log(chalk.green('📤 全エージェントへの指示送信完了'));
  console.log('');
}

async function startAutomationLoop(scenarioConfig, interval, mode) {
  let loopCount = 0;
  
  const loop = setInterval(async () => {
    loopCount++;
    console.log(chalk.gray(`🔄 自動チェック #${loopCount} (${new Date().toLocaleTimeString()})`));

    try {
      // YAMLファイルの状態チェック
      await checkTaskStatus();
      await checkAgentStates(scenarioConfig, interval);
      
      // 自動化設定の再読み込み
      const automationConfig = await loadAutomationConfig();
      if (!automationConfig.automation.enabled) {
        console.log(chalk.yellow('⏸️ 自動化が無効化されました。ループを停止します。'));
        clearInterval(loop);
        return;
      }

    } catch (error) {
      console.error(chalk.red('❌ 自動チェックエラー:'), error.message);
      if (mode === 'development') {
        console.error(error.stack);
      }
    }

  }, interval * 1000);

  // 終了処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏸️ 自動化ループを停止しています...'));
    clearInterval(loop);
    console.log(chalk.green('✅ 自動化システム停止完了'));
    process.exit(0);
  });
}

async function checkTaskStatus() {
  if (!await fs.pathExists('./tmp/tasks.yaml')) {
    return;
  }

  const tasksData = yaml.load(await fs.readFile('./tmp/tasks.yaml', 'utf8'));
  const tasks = tasksData.tasks || [];
  
  // 統計情報更新
  const stats = {
    total_tasks: tasks.length,
    pending_tasks: tasks.filter(t => t.status === 'pending').length,
    assigned_tasks: tasks.filter(t => t.status === 'assigned').length,
    in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
    completed_tasks: tasks.filter(t => t.status === 'completed').length,
    blocked_tasks: tasks.filter(t => t.status === 'blocked').length
  };

  tasksData.statistics = stats;
  tasksData.metadata.last_updated = new Date().toISOString();
  
  await fs.writeFile('./tmp/tasks.yaml', yaml.dump(tasksData));

  // アラート条件チェック
  if (stats.pending_tasks > 0) {
    console.log(chalk.yellow(`⚠️ 未割当タスク: ${stats.pending_tasks}件`));
  }
  
  if (stats.blocked_tasks > 0) {
    console.log(chalk.red(`🚫 ブロックされたタスク: ${stats.blocked_tasks}件`));
  }
}

async function checkAgentStates(scenarioConfig, interval) {
  if (!await fs.pathExists('./tmp/agent-states.yaml')) {
    return;
  }

  const statesData = yaml.load(await fs.readFile('./tmp/agent-states.yaml', 'utf8'));
  const agents = statesData.agents || {};
  
  const now = new Date();
  const alertThreshold = 5 * 60 * 1000; // 5分

  for (const [agentName, agentState] of Object.entries(agents)) {
    const lastActivity = new Date(agentState.last_activity);
    const inactiveTime = now - lastActivity;

    if (inactiveTime > alertThreshold) {
      console.log(chalk.yellow(`⚠️ ${agentName} が ${Math.floor(inactiveTime / 60000)}分間非活動状態`));
      
      // リマインダー送信（開発モードでは実際に送信しない）
      if (process.env.NODE_ENV === 'production') {
        await sendCommand(agentName, `
進捗確認です。現在の状況を報告してください。

以下を更新してください：
1. tmp/tasks.yamlの進捗状況
2. tmp/agent-states.yamlのlast_activity

問題があれば遠慮なく相談してください。
        `, { wait: 0.5 });
      }
    }
  }

  // 全体状態の更新
  statesData.metadata.last_updated = new Date().toISOString();
  await fs.writeFile('./tmp/agent-states.yaml', yaml.dump(statesData));
}

async function loadAutomationConfig() {
  if (!await fs.pathExists('./tmp/automation.yaml')) {
    return { automation: { enabled: true } };
  }
  
  return yaml.load(await fs.readFile('./tmp/automation.yaml', 'utf8'));
}

function showAutomationInstructions() {
  console.log('');
  console.log(chalk.cyan('📋 自動化システムの使用方法:'));
  console.log('');
  console.log(chalk.white('1. タスクの投入:'));
  console.log(chalk.gray('   claude-agents send president "新しい機能を開発してください"'));
  console.log('');
  console.log(chalk.white('2. 状況確認:'));
  console.log(chalk.gray('   cat tmp/tasks.yaml          # タスク状況'));
  console.log(chalk.gray('   cat tmp/agent-states.yaml   # エージェント状態'));
  console.log('');
  console.log(chalk.white('3. 手動指示:'));
  console.log(chalk.gray('   claude-agents send boss1 "進捗状況を確認してください"'));
  console.log('');
  console.log(chalk.white('4. 自動化停止:'));
  console.log(chalk.gray('   tmp/automation.yamlでenabled: falseに設定'));
  console.log('');
}

module.exports = autoCommand;