/**
 * Tests for start command
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// 依存関係をモック
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('../../lib/core/config-manager');
jest.mock('../../lib/core/tmux-manager');
jest.mock('../../lib/core/claude-manager');

const startCommand = require('../../lib/commands/start');
const configManager = require('../../lib/core/config-manager');
const tmuxManager = require('../../lib/core/tmux-manager');
const claudeManager = require('../../lib/core/claude-manager');

describe('Start Command', () => {
  let originalExit;
  let originalConsoleLog;
  let originalConsoleError;
  let originalChdir;
  let mockSpawn;

  beforeEach(() => {
    // console出力とprocess.exitをモック
    originalExit = process.exit;
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalChdir = process.chdir;
    
    process.exit = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();
    process.chdir = jest.fn();

    // モックの初期化
    jest.clearAllMocks();

    // child_processのモック
    mockSpawn = jest.fn();
    spawn.mockImplementation(mockSpawn);
    
    mockSpawn.mockImplementation(() => ({
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          process.nextTick(() => callback(0));
        }
      })
    }));

    // fs-extraのモック
    fs.pathExists = jest.fn().mockResolvedValue(true);

    // config-managerのモック
    configManager.loadConfig.mockResolvedValue({
      currentScenario: 'business-strategy',
      scenarios: {
        'business-strategy': {
          name: 'Business Strategy',
          tmux_sessions: {
            strategy: {
              window_name: 'strategy-team',
              layout: 'tiled'
            }
          }
        }
      },
      settings: {
        autoStartClaude: true
      }
    });
    configManager.setCurrentScenario = jest.fn().mockResolvedValue();

    // tmux-managerのモック
    tmuxManager.setupTmuxSessions = jest.fn().mockResolvedValue();
    tmuxManager.generateAgentMapping = jest.fn().mockResolvedValue();

    // claude-managerのモック
    claudeManager.startClaudeAgents = jest.fn().mockResolvedValue();

    // path.resolveのモック
    jest.spyOn(path, 'resolve').mockReturnValue('/test/project');
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.chdir = originalChdir;
    jest.restoreAllMocks();
  });

  describe('正常系', () => {
    test('指定シナリオでの起動が成功する', async () => {
      await startCommand('business-strategy', {});

      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(tmuxManager.setupTmuxSessions).toHaveBeenCalled();
      expect(tmuxManager.generateAgentMapping).toHaveBeenCalled();
      expect(claudeManager.startClaudeAgents).toHaveBeenCalled();
      expect(configManager.setCurrentScenario).toHaveBeenCalledWith('business-strategy');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎉 エージェント起動完了！'));
    });

    test('デフォルトシナリオでの起動が成功する', async () => {
      await startCommand(null, {});

      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(tmuxManager.setupTmuxSessions).toHaveBeenCalled();
      expect(configManager.setCurrentScenario).toHaveBeenCalledWith('business-strategy');
    });

    test('プロジェクトパス指定が正常動作する', async () => {
      await startCommand('business-strategy', { project: '/custom/path' });

      expect(path.resolve).toHaveBeenCalledWith('/custom/path');
      expect(process.chdir).toHaveBeenCalledWith('/test/project');
    });

    test('noClaude指定時はClaude起動をスキップする', async () => {
      await startCommand('business-strategy', { noClaude: true });

      expect(claudeManager.startClaudeAgents).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Claude Code起動をスキップしました'));
    });

    test('autoStartClaude無効時はClaude起動をスキップする', async () => {
      configManager.loadConfig.mockResolvedValue({
        currentScenario: 'business-strategy',
        scenarios: {
          'business-strategy': {
            name: 'Business Strategy',
            tmux_sessions: { strategy: {} }
          }
        },
        settings: {
          autoStartClaude: false
        }
      });

      await startCommand('business-strategy', {});

      expect(claudeManager.startClaudeAgents).not.toHaveBeenCalled();
    });
  });

  describe('エラー処理', () => {
    test('設定ファイル不存在時はプロセス終了する', async () => {
      fs.pathExists.mockResolvedValue(false);

      await startCommand('business-strategy', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ claude-agents.yaml が見つかりません'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('無効なシナリオ指定時はプロセス終了する', async () => {
      await startCommand('invalid-scenario', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 無効なシナリオ: invalid-scenario'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('tmux構築エラー時は適切なエラーメッセージを表示する', async () => {
      tmuxManager.setupTmuxSessions.mockRejectedValue(new Error('tmux setup failed'));

      await startCommand('business-strategy', {});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ 起動エラー:'),
        'tmux setup failed'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('verboseオプション指定時はスタックトレースを表示する', async () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      tmuxManager.setupTmuxSessions.mockRejectedValue(error);

      await startCommand('business-strategy', { verbose: true });

      expect(console.error).toHaveBeenCalledWith('Test stack trace');
    });
  });

  describe('既存セッション確認', () => {
    test('既存セッションが存在する場合は警告を表示する', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(0)); // 既存セッション存在
          }
        })
      }));

      await startCommand('business-strategy', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️ 既存のtmuxセッション'));
    });

    test('既存セッション確認エラーは無視される', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            process.nextTick(() => callback(1)); // セッション存在しない
          }
        })
      }));

      await startCommand('business-strategy', {});

      expect(tmuxManager.setupTmuxSessions).toHaveBeenCalled();
    });
  });

  describe('起動後の案内表示', () => {
    test('hello-worldシナリオの場合は専用の案内を表示する', async () => {
      configManager.loadConfig.mockResolvedValue({
        currentScenario: 'hello-world',
        scenarios: {
          'hello-world': {
            name: 'Hello World',
            tmux_sessions: {
              president: {}
            }
          }
        },
        settings: { autoStartClaude: true }
      });

      await startCommand('hello-world', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tmux attach-session -t president'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('あなたはpresidentです'));
    });

    test('business-strategyシナリオの場合は専用の案内を表示する', async () => {
      await startCommand('business-strategy', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CEOペイン（左上）で以下を入力'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('あなたはCEOです'));
    });

    test('その他のシナリオの場合は汎用の案内を表示する', async () => {
      configManager.loadConfig.mockResolvedValue({
        currentScenario: 'custom-scenario',
        scenarios: {
          'custom-scenario': {
            name: 'Custom Scenario',
            tmux_sessions: {
              main: {}
            }
          }
        },
        settings: { autoStartClaude: true }
      });

      await startCommand('custom-scenario', {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('メインセッションに接続'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('適切なエージェントで初期コマンドを実行'));
    });
  });

  describe('手動起動案内', () => {
    test('noClaude指定時は手動起動案内を表示する', async () => {
      await startCommand('business-strategy', { noClaude: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📋 Claude Code手動起動手順:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("tmux send-keys -t strategy:0.0 'claude' C-m"));
    });
  });
});