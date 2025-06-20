/**
 * Tests for create-scenario command (main command function)
 */

const fs = require('fs-extra');
const inquirer = require('inquirer');

// 依存関係をモック
jest.mock('fs-extra');
jest.mock('inquirer');
jest.mock('../../lib/utils/scenario-generator');
jest.mock('../../lib/core/config-manager');

const createScenarioCommand = require('../../lib/commands/create-scenario');
const scenarioGenerator = require('../../lib/utils/scenario-generator');
const configManager = require('../../lib/core/config-manager');

describe('Create Scenario Command', () => {
  let originalExit;
  let originalConsoleLog;
  let originalConsoleError;

  beforeEach(() => {
    // console出力とprocess.exitをモック
    originalExit = process.exit;
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    
    process.exit = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();

    // モックの初期化
    jest.clearAllMocks();

    // fs-extraのモック
    fs.pathExists = jest.fn().mockResolvedValue(true);

    // inquirerのモック
    inquirer.prompt = jest.fn();

    // scenario-generatorのモック
    scenarioGenerator.generateScenarioFiles = jest.fn().mockResolvedValue();

    // config-managerのモック
    configManager.updateMainConfig = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  describe('正常系', () => {
    test('完全なシナリオ作成フローが正常動作する', async () => {
      // 基本情報のモック（collectBasicInfo用）
      inquirer.prompt.mockResolvedValueOnce({
        name: 'Test Scenario',
        description: 'Test Description',
        category: 'business',
        author: 'Test Author',
        initialMessage: 'Test Initial Message'
      });
      
      // エージェント数のモック（collectAgentConfig用）
      inquirer.prompt.mockResolvedValueOnce({ agentCount: 3 });
      
      // エージェント1の情報
      inquirer.prompt.mockResolvedValueOnce({
        name: 'agent_1',
        role: 'Role 1',
        responsibilities: ['Task 1', 'Task 2'],
        color: 'red'
      });
      
      // エージェント2の情報
      inquirer.prompt.mockResolvedValueOnce({
        name: 'agent_2',
        role: 'Role 2',
        responsibilities: ['Task 3', 'Task 4'],
        color: 'green'
      });
      
      // エージェント3の情報
      inquirer.prompt.mockResolvedValueOnce({
        name: 'agent_3',
        role: 'Role 3',
        responsibilities: ['Task 5', 'Task 6'],
        color: 'blue'
      });
      
      // tmux構成のモック（collectTmuxConfig用）
      inquirer.prompt.mockResolvedValueOnce({ sessionStrategy: 'single' });
      
      // 確認のモック（confirmConfiguration用）
      inquirer.prompt.mockResolvedValueOnce({ confirm: true });

      try {
        await createScenarioCommand({});
      } catch (error) {
        console.log('Error:', error.message);
        throw error;
      }

      // デバッグ用
      console.log('generateScenarioFiles calls:', scenarioGenerator.generateScenarioFiles.mock.calls.length);
      console.log('updateMainConfig calls:', configManager.updateMainConfig.mock.calls.length);
      console.log('console.log calls:', console.log.mock.calls.length);
      console.log('console.error calls:', console.error.mock.calls.length);
      console.log('process.exit calls:', process.exit.mock.calls.length);

      expect(scenarioGenerator.generateScenarioFiles).toHaveBeenCalled();
      expect(configManager.updateMainConfig).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎉 シナリオ作成完了!'));
    });

    test('オプション指定での基本情報入力をスキップする', async () => {
      const options = {
        name: 'Preset Scenario',
        description: 'Preset Description',
        category: 'development',
        author: 'Preset Author',
        initialMessage: 'Preset Message'
      };

      inquirer.prompt
        .mockResolvedValueOnce({ agentCount: 2 })
        .mockResolvedValueOnce({
          name: 'dev_1',
          role: 'Developer',
          responsibilities: 'Coding',
          color: 'cyan'
        })
        .mockResolvedValueOnce({
          name: 'tester_1',
          role: 'Tester',
          responsibilities: 'Testing',
          color: 'magenta'
        })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: true });

      await createScenarioCommand(options);

      // 基本情報の最初のpromptで、デフォルト値がオプションから設定されることを確認
      const basicInfoCall = inquirer.prompt.mock.calls[0][0];
      expect(basicInfoCall[0].default).toBe('Preset Scenario');
      expect(basicInfoCall[1].default).toBe('Preset Description');
      expect(basicInfoCall[2].default).toBe('development');
    });

    test('複数セッション構成が正常動作する', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Multi Session Scenario',
          description: 'Multi Description',
          category: 'business',
          author: 'Multi Author',
          initialMessage: 'Multi Message'
        })
        .mockResolvedValueOnce({ agentCount: 6 })
        .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ name: 'agent3', role: 'Role3', responsibilities: 'Task3', color: 'blue' })
        .mockResolvedValueOnce({ name: 'agent4', role: 'Role4', responsibilities: 'Task4', color: 'yellow' })
        .mockResolvedValueOnce({ name: 'agent5', role: 'Role5', responsibilities: 'Task5', color: 'magenta' })
        .mockResolvedValueOnce({ name: 'agent6', role: 'Role6', responsibilities: 'Task6', color: 'cyan' })
        .mockResolvedValueOnce({ sessionStrategy: 'multiple' })
        .mockResolvedValueOnce({ confirm: true });

      await createScenarioCommand({});

      expect(scenarioGenerator.generateScenarioFiles).toHaveBeenCalled();
      const generateCall = scenarioGenerator.generateScenarioFiles.mock.calls[0];
      const tmuxConfig = generateCall[2];
      
      // 複数セッションが作成されることを確認
      expect(Object.keys(tmuxConfig.sessions).length).toBeGreaterThan(1);
    });
  });

  describe('エラー処理', () => {
    test('シナリオ生成エラー時は適切なエラーメッセージを表示する', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Error Scenario',
          description: 'Error Description',
          category: 'business',
          author: 'Error Author',
          initialMessage: 'Error Message'
        })
        .mockResolvedValueOnce({ agentCount: 2 })
        .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: true });

      scenarioGenerator.generateScenarioFiles.mockRejectedValue(new Error('Generation failed'));

      await createScenarioCommand({});

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌ エラー: Generation failed'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('設定更新エラー時は適切なエラーメッセージを表示する', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Config Error Scenario',
          description: 'Config Error Description',
          category: 'business',
          author: 'Config Error Author',
          initialMessage: 'Config Error Message'
        })
        .mockResolvedValueOnce({ agentCount: 2 })
        .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: true });

      configManager.updateMainConfig.mockRejectedValue(new Error('Config update failed'));

      await createScenarioCommand({});

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌ エラー: Config update failed'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('作成確認で拒否した場合はプロセス終了する', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Rejected Scenario',
          description: 'Rejected Description',
          category: 'business',
          author: 'Rejected Author',
          initialMessage: 'Rejected Message'
        })
        .mockResolvedValueOnce({ agentCount: 2 })
        .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: false });

      await createScenarioCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ キャンセルされました'));
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(scenarioGenerator.generateScenarioFiles).not.toHaveBeenCalled();
    });
  });

  describe('入力バリデーション', () => {
    test('シナリオ名の空文字入力は拒否される', async () => {
      const mockPrompt = jest.fn();
      inquirer.prompt = mockPrompt;

      await createScenarioCommand({});

      // バリデーション関数をテスト
      const basicInfoQuestions = mockPrompt.mock.calls[0][0];
      const nameQuestion = basicInfoQuestions.find(q => q.name === 'name');
      
      expect(nameQuestion.validate('')).toBe('シナリオ名は必須です');
      expect(nameQuestion.validate('Valid Name')).toBe(true);
    });

    test('説明の空文字入力は拒否される', async () => {
      const mockPrompt = jest.fn();
      inquirer.prompt = mockPrompt;

      await createScenarioCommand({});

      const basicInfoQuestions = mockPrompt.mock.calls[0][0];
      const descriptionQuestion = basicInfoQuestions.find(q => q.name === 'description');
      
      expect(descriptionQuestion.validate('  ')).toBe('説明は必須です');
      expect(descriptionQuestion.validate('Valid Description')).toBe(true);
    });

    test('エージェント数は2-8の範囲でバリデーションされる', async () => {
      inquirer.prompt.mockResolvedValueOnce({
        name: 'Test Scenario',
        description: 'Test Description',
        category: 'business',
        author: 'Test Author',
        initialMessage: 'Test Message'
      });

      const mockPrompt = jest.fn();
      inquirer.prompt = mockPrompt;

      await createScenarioCommand({});

      const agentCountQuestions = mockPrompt.mock.calls[1][0];
      const agentCountQuestion = agentCountQuestions.find(q => q.name === 'agentCount');
      
      expect(agentCountQuestion.validate(1)).toBe('2-8の範囲で入力してください');
      expect(agentCountQuestion.validate(9)).toBe('2-8の範囲で入力してください');
      expect(agentCountQuestion.validate(4)).toBe(true);
    });
  });

  describe('ID生成処理', () => {
    test('シナリオ名から適切なIDが生成される', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Test Scenario Name!@#',
          description: 'Test Description',
          category: 'business',
          author: 'Test Author',
          initialMessage: 'Test Message'
        })
        .mockResolvedValueOnce({ agentCount: 2 })
        .mockResolvedValueOnce({ name: 'Agent One!', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'Agent Two@', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: true });

      await createScenarioCommand({});

      const generateCall = scenarioGenerator.generateScenarioFiles.mock.calls[0];
      const basicInfo = generateCall[0];
      const agentConfig = generateCall[1];

      // シナリオIDが適切に生成されることを確認
      expect(basicInfo.id).toBe('test-scenario-name');
      
      // エージェントIDが適切に生成されることを確認
      expect(agentConfig.agents[0].id).toBe('agent_one');
      expect(agentConfig.agents[1].id).toBe('agent_two');
    });
  });

  describe('カテゴリ別タグ生成', () => {
    test('各カテゴリに対応したタグが生成される', async () => {
      const categories = [
        { category: 'business', expectedTags: ['strategy', 'executive', 'planning'] },
        { category: 'development', expectedTags: ['coding', 'technical', 'agile'] },
        { category: 'healthcare', expectedTags: ['medical', 'healthcare', 'consultation'] },
        { category: 'other', expectedTags: ['custom'] }
      ];

      for (const { category, expectedTags } of categories) {
        inquirer.prompt
          .mockResolvedValueOnce({
            name: `${category} Scenario`,
            description: `${category} Description`,
            category: category,
            author: 'Test Author',
            initialMessage: 'Test Message'
          })
          .mockResolvedValueOnce({ agentCount: 2 })
          .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
          .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
          .mockResolvedValueOnce({ sessionStrategy: 'single' })
          .mockResolvedValueOnce({ confirm: true });

        await createScenarioCommand({});

        const generateCall = scenarioGenerator.generateScenarioFiles.mock.calls[scenarioGenerator.generateScenarioFiles.mock.calls.length - 1];
        const basicInfo = generateCall[0];

        expect(basicInfo.tags).toEqual(expectedTags);
        
        // モックをリセット
        jest.clearAllMocks();
        scenarioGenerator.generateScenarioFiles = jest.fn().mockResolvedValue();
        configManager.updateMainConfig = jest.fn().mockResolvedValue();
      }
    });
  });

  describe('tmux構成生成', () => {
    test('単一セッション構成が正しく生成される', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          name: 'Single Session Test',
          description: 'Single Session Description',
          category: 'business',
          author: 'Test Author',
          initialMessage: 'Test Message'
        })
        .mockResolvedValueOnce({ agentCount: 4 })
        .mockResolvedValueOnce({ name: 'agent1', role: 'Role1', responsibilities: 'Task1', color: 'red' })
        .mockResolvedValueOnce({ name: 'agent2', role: 'Role2', responsibilities: 'Task2', color: 'green' })
        .mockResolvedValueOnce({ name: 'agent3', role: 'Role3', responsibilities: 'Task3', color: 'blue' })
        .mockResolvedValueOnce({ name: 'agent4', role: 'Role4', responsibilities: 'Task4', color: 'yellow' })
        .mockResolvedValueOnce({ sessionStrategy: 'single' })
        .mockResolvedValueOnce({ confirm: true });

      await createScenarioCommand({});

      const generateCall = scenarioGenerator.generateScenarioFiles.mock.calls[0];
      const tmuxConfig = generateCall[2];

      expect(Object.keys(tmuxConfig.sessions)).toEqual(['main']);
      expect(tmuxConfig.sessions.main.layout).toBe('tiled');
      expect(tmuxConfig.sessions.main.agents).toHaveLength(4);
    });

    test('エージェント数に応じたレイアウトが選択される', async () => {
      const testCases = [
        { agentCount: 2, expectedLayout: 'even-horizontal' },
        { agentCount: 3, expectedLayout: 'main-horizontal' },
        { agentCount: 4, expectedLayout: 'tiled' },
        { agentCount: 6, expectedLayout: 'tiled' }
      ];

      for (const { agentCount, expectedLayout } of testCases) {
        // エージェント分のプロンプトモックを作成
        const agentPrompts = [];
        for (let i = 0; i < agentCount; i++) {
          agentPrompts.push({
            name: `agent${i + 1}`,
            role: `Role${i + 1}`,
            responsibilities: `Task${i + 1}`,
            color: ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'][i]
          });
        }

        inquirer.prompt
          .mockResolvedValueOnce({
            name: `Layout Test ${agentCount}`,
            description: 'Layout Test Description',
            category: 'business',
            author: 'Test Author',
            initialMessage: 'Test Message'
          })
          .mockResolvedValueOnce({ agentCount })
          .mockResolvedValueOnce(...agentPrompts.map(agent => agent))
          .mockResolvedValueOnce({ sessionStrategy: 'single' })
          .mockResolvedValueOnce({ confirm: true });

        // エージェント分のモックを追加
        for (let i = 0; i < agentCount; i++) {
          inquirer.prompt.mockResolvedValueOnce(agentPrompts[i]);
        }

        await createScenarioCommand({});

        const generateCall = scenarioGenerator.generateScenarioFiles.mock.calls[scenarioGenerator.generateScenarioFiles.mock.calls.length - 1];
        const tmuxConfig = generateCall[2];

        expect(tmuxConfig.sessions.main.layout).toBe(expectedLayout);

        // モックをリセット
        jest.clearAllMocks();
        scenarioGenerator.generateScenarioFiles = jest.fn().mockResolvedValue();
        configManager.updateMainConfig = jest.fn().mockResolvedValue();
      }
    });
  });
});