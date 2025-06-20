/**
 * Tests for switch command
 */

const fs = require('fs-extra');
const inquirer = require('inquirer');
const { spawn } = require('child_process');

// 依存関係をモック
jest.mock('fs-extra');
jest.mock('inquirer');
jest.mock('child_process');
jest.mock('../../lib/core/config-manager');
jest.mock('../../lib/core/tmux-manager');
jest.mock('../../lib/core/tmux-checker');

const switchCommand = require('../../lib/commands/switch');
const configManager = require('../../lib/core/config-manager');
const tmuxManager = require('../../lib/core/tmux-manager');
const tmuxChecker = require('../../lib/core/tmux-checker');

describe('Switch Command', () => {
  let originalExit;
  let originalConsoleLog;
  let originalConsoleError;
  let mockSpawn;

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

    // child_processのモック
    mockSpawn = jest.fn();
    spawn.mockImplementation(mockSpawn);
    
    mockSpawn.mockImplementation(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          process.nextTick(() => callback(0));
        }
      })
    }));

    // fs-extraのモック
    fs.pathExists = jest.fn().mockResolvedValue(true);
    fs.readJSON = jest.fn().mockResolvedValue({
      ceo: 'strategy:1.1',
      cto: 'strategy:1.2'
    });

    // inquirerのモック
    inquirer.prompt = jest.fn();

    // config-managerのモック
    configManager.loadConfig.mockResolvedValue({
      currentScenario: 'business-strategy',
      scenarios: {
        'business-strategy': {
          name: 'Business Strategy',
          tmux_sessions: { strategy: {} }
        },
        'hello-world': {
          name: 'Hello World',
          tmux_sessions: { president: {} }
        }
      }
    });
    configManager.setCurrentScenario = jest.fn().mockResolvedValue();

    // tmux-managerのモック
    tmuxManager.setupTmuxSessions = jest.fn().mockResolvedValue();
    tmuxManager.generateAgentMapping = jest.fn().mockResolvedValue();

    // tmux-checkerのモック
    tmuxChecker.checkTmuxSessions.mockResolvedValue({
      existingSessions: [],
      allSessionsExist: false
    });
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  describe('正常系', () => {
    test('異なるシナリオへの切り替えが成功する', async () => {
      await switchCommand('hello-world', {});

      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(tmuxManager.setupTmuxSessions).toHaveBeenCalled();
      expect(tmuxManager.generateAgentMapping).toHaveBeenCalled();
      expect(configManager.setCurrentScenario).toHaveBeenCalledWith('hello-world');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ シナリオ切り替え完了'));
    });

    test('同じシナリオ指定時は現在状態を表示する', async () => {
      await switchCommand('business-strategy', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 既に business-strategy シナリオが設定されています'));
      expect(tmuxManager.setupTmuxSessions).not.toHaveBeenCalled();
    });

    test('preserveSessionsオプション指定時は既存セッションを保持する', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['strategy'],
        allSessionsExist: true
      });

      await switchCommand('hello-world', { preserveSessions: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 既存セッションを再利用します'));
      expect(tmuxManager.setupTmuxSessions).not.toHaveBeenCalled();
      expect(tmuxManager.generateAgentMapping).toHaveBeenCalled();
    });

    test('既存セッション確認で保持を選択した場合', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['strategy'],
        allSessionsExist: true
      });
      inquirer.prompt.mockResolvedValue({ preserve: true });

      await switchCommand('hello-world', {});

      expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          type: 'confirm',
          name: 'preserve',
          message: '既存のClaude Codeセッションを保持しますか？'
        })
      ]));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 既存セッションを再利用します'));
    });

    test('既存セッション確認で破棄を選択した場合', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['strategy'],
        allSessionsExist: false
      });
      inquirer.prompt.mockResolvedValue({ preserve: false });

      await switchCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🗑️ 既存セッションを終了中...'));
      expect(tmuxManager.setupTmuxSessions).toHaveBeenCalled();
    });
  });

  describe('エラー処理', () => {
    test('設定ファイル不存在時はプロセス終了する', async () => {
      fs.pathExists.mockResolvedValue(false);

      await switchCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 設定ファイルが見つかりません'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('無効なシナリオ指定時はプロセス終了する', async () => {
      await switchCommand('invalid-scenario', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 無効なシナリオ: invalid-scenario'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('💡 利用可能シナリオ:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎯 business-strategy - Business Strategy'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📦 hello-world - Hello World'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('tmux構築エラー時は適切なエラーメッセージを表示する', async () => {
      tmuxManager.setupTmuxSessions.mockRejectedValue(new Error('tmux setup failed'));

      await switchCommand('hello-world', {});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ 切り替えエラー:'),
        'tmux setup failed'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('verboseオプション指定時はスタックトレースを表示する', async () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      tmuxManager.setupTmuxSessions.mockRejectedValue(error);

      await switchCommand('hello-world', { verbose: true });

      expect(console.error).toHaveBeenCalledWith('Test stack trace');
    });
  });

  describe('既存セッション処理', () => {
    test('既存セッション終了が成功する', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['strategy', 'other'],
        allSessionsExist: false
      });
      inquirer.prompt.mockResolvedValue({ preserve: false });

      await switchCommand('hello-world', {});

      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'strategy'], { stdio: 'pipe' });
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'other'], { stdio: 'pipe' });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ セッション終了: strategy'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ セッション終了: other'));
    });

    test('既存セッション終了失敗時は警告を表示する', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['strategy'],
        allSessionsExist: false
      });
      inquirer.prompt.mockResolvedValue({ preserve: false });

      mockSpawn.mockImplementation(() => ({
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(1)); // エラー終了
          }
        })
      }));

      await switchCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️ セッション終了失敗: strategy'));
    });
  });

  describe('切り替え結果表示', () => {
    test('新規作成時の結果表示が正常動作する', async () => {
      await switchCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎯 切り替え完了情報:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('新しいシナリオ: hello-world'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('説明: Hello World'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション状態: 新規作成'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tmux attach-session -t president'));
    });

    test('既存利用時の結果表示が正常動作する', async () => {
      tmuxChecker.checkTmuxSessions.mockResolvedValue({
        existingSessions: ['president'],
        allSessionsExist: true
      });

      await switchCommand('hello-world', { preserveSessions: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション状態: 既存利用'));
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('新規セッションのため'));
    });

    test('エージェント情報取得エラー時は警告を表示する', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('agent_mapping.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      await switchCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️ エージェント情報の取得に失敗'));
    });
  });

  describe('現在状態表示', () => {
    test('現在のシナリオ情報が正常表示される', async () => {
      await switchCommand('business-strategy', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 現在のシナリオ状態:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('シナリオ: business-strategy'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('名前: Business Strategy'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ceo → strategy:1.1'));
    });

    test('エージェントマッピングが存在しない場合は表示しない', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('agent_mapping.json')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      await switchCommand('business-strategy', {});

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('エージェント:'));
    });
  });

  describe('設定ファイル確認', () => {
    test('YAMLとJSONファイル両方を確認する', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(false); // claude-agents.json

      await switchCommand('hello-world', {});

      expect(fs.pathExists).toHaveBeenCalledWith('./claude-agents.yaml');
      expect(fs.pathExists).toHaveBeenCalledWith('./claude-agents.json');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('JSONファイルが存在する場合は処理を継続する', async () => {
      fs.pathExists
        .mockResolvedValueOnce(false) // claude-agents.yaml
        .mockResolvedValueOnce(true);  // claude-agents.json

      await switchCommand('hello-world', {});

      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });
  });
});