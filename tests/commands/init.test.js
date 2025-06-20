/**
 * Tests for init command
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const inquirer = require('inquirer');

// 依存関係をモック
jest.mock('fs-extra');
jest.mock('js-yaml');
jest.mock('inquirer');
jest.mock('../../lib/core/scenario-manager');
jest.mock('../../lib/utils/file-helpers');
jest.mock('../../lib/utils/dependency-checker');

const initCommand = require('../../lib/commands/init');
const scenarioManager = require('../../lib/core/scenario-manager');
const fileHelpers = require('../../lib/utils/file-helpers');
const dependencyChecker = require('../../lib/utils/dependency-checker');

describe('Init Command', () => {
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

    // 依存関係チェック成功をデフォルトに
    dependencyChecker.checkDependencies.mockResolvedValue({ success: true });
    
    // シナリオ設定のモック
    scenarioManager.getScenarioConfig.mockResolvedValue({
      'business-strategy': { name: 'Business Strategy' },
      'hello-world': { name: 'Hello World' }
    });

    // ファイルヘルパーのモック
    fileHelpers.setupDirectories.mockResolvedValue();

    // fs-extraのモック
    fs.pathExists = jest.fn().mockResolvedValue(false);
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.copy = jest.fn().mockResolvedValue();
    fs.readFile = jest.fn().mockResolvedValue('');

    // js-yamlのモック
    yaml.dump = jest.fn().mockReturnValue('mocked yaml content');

    // inquirerのモック
    inquirer.prompt = jest.fn();

    // path.basenameのモック
    jest.spyOn(path, 'basename').mockReturnValue('test-project');
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  describe('正常系', () => {
    test('オプション指定でのシナリオ初期化が成功する', async () => {
      const options = { scenario: 'business-strategy' };

      await initCommand(options);

      expect(dependencyChecker.checkDependencies).toHaveBeenCalled();
      expect(fileHelpers.setupDirectories).toHaveBeenCalled();
      expect(scenarioManager.getScenarioConfig).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith('./claude-agents.yaml', 'mocked yaml content');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎉 初期化が完了しました！'));
    });

    test('対話式でのシナリオ選択が成功する', async () => {
      inquirer.prompt.mockResolvedValue({ scenario: 'hello-world' });

      await initCommand({});

      expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          type: 'list',
          name: 'scenario'
        })
      ]));
      expect(scenarioManager.getScenarioConfig).toHaveBeenCalled();
    });

    test('forceオプション指定時は既存設定を上書きする', async () => {
      fs.pathExists.mockResolvedValue(true);
      const options = { scenario: 'business-strategy', force: true };

      await initCommand(options);

      expect(inquirer.prompt).not.toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'overwrite' })
      ]));
      expect(scenarioManager.getScenarioConfig).toHaveBeenCalled();
    });

    test('既存設定がある場合の上書き確認が正常動作する', async () => {
      fs.pathExists.mockResolvedValue(true);
      inquirer.prompt
        .mockResolvedValueOnce({ overwrite: true })
        .mockResolvedValueOnce({ scenario: 'business-strategy' });

      await initCommand({});

      expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          type: 'confirm',
          name: 'overwrite'
        })
      ]));
    });

    test('上書き拒否時は初期化をキャンセルする', async () => {
      fs.pathExists.mockResolvedValue(true);
      inquirer.prompt.mockResolvedValue({ overwrite: false });

      await initCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('初期化をキャンセルしました'));
      expect(fileHelpers.setupDirectories).not.toHaveBeenCalled();
    });
  });

  describe('エラー処理', () => {
    test('依存関係チェック失敗時はプロセス終了する', async () => {
      dependencyChecker.checkDependencies.mockResolvedValue({
        success: false,
        errors: ['tmux not found'],
        recommendations: ['brew install tmux']
      });

      await initCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 依存関係エラー:'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('ファイル作成エラー時は適切なエラーメッセージを表示する', async () => {
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await initCommand({ scenario: 'business-strategy' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ 初期化エラー:'),
        'Permission denied'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('verboseオプション指定時はスタックトレースを表示する', async () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      fs.writeFile.mockRejectedValue(error);

      await initCommand({ scenario: 'business-strategy', verbose: true });

      expect(console.error).toHaveBeenCalledWith('Test stack trace');
    });
  });

  describe('設定ファイル生成', () => {
    test('正しい設定内容でYAMLファイルを生成する', async () => {
      const mockDate = '2023-01-01T00:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      await initCommand({ scenario: 'business-strategy' });

      const yamlDumpCall = yaml.dump.mock.calls[0];
      const configObject = yamlDumpCall[0];
      
      expect(configObject).toEqual({
        version: '2.0.0',
        currentScenario: 'business-strategy',
        projectName: 'test-project',
        scenarios: {
          'business-strategy': { name: 'Business Strategy' },
          'hello-world': { name: 'Hello World' }
        },
        settings: {
          tmuxPrefix: 'C-b',
          autoStartClaude: true,
          logLevel: 'info',
          colorOutput: true
        },
        createdAt: mockDate,
        lastUpdated: mockDate
      });
    });
  });

  describe('テンプレートファイル処理', () => {
    test('共通テンプレートとシナリオ別テンプレートをコピーする', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(true)  // common template
        .mockResolvedValueOnce(true); // scenario template

      await initCommand({ scenario: 'business-strategy' });

      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('templates/common'),
        '.',
        expect.objectContaining({ overwrite: true })
      );
      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('templates/scenarios/business-strategy'),
        './scenarios',
        expect.objectContaining({ overwrite: true })
      );
    });

    test('テンプレートが存在しない場合はスキップする', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(false) // common template
        .mockResolvedValueOnce(false); // scenario template

      await initCommand({ scenario: 'business-strategy' });

      expect(fs.copy).not.toHaveBeenCalled();
    });
  });

  describe('.gitignore処理', () => {
    test('新規.gitignoreファイルを作成する', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(false) // common template
        .mockResolvedValueOnce(false) // scenario template
        .mockResolvedValueOnce(false); // .gitignore

      await initCommand({ scenario: 'business-strategy' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        './.gitignore',
        expect.stringContaining('# Claude Agents')
      );
    });

    test('既存.gitignoreに不足エントリを追加する', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(false) // common template
        .mockResolvedValueOnce(false) // scenario template
        .mockResolvedValueOnce(true);  // .gitignore exists

      fs.readFile.mockResolvedValue('existing content\n');

      await initCommand({ scenario: 'business-strategy' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        './.gitignore',
        expect.stringContaining('existing content')
      );
    });
  });
});