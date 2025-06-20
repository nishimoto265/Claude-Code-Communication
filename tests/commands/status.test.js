/**
 * Tests for status command
 */

const fs = require('fs-extra');
const { spawn } = require('child_process');

// 依存関係をモック
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('../../lib/core/config-manager');
jest.mock('../../lib/core/agent-manager');

const statusCommand = require('../../lib/commands/status');
const configManager = require('../../lib/core/config-manager');
const agentManager = require('../../lib/core/agent-manager');

describe('Status Command', () => {
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
    fs.readFile = jest.fn().mockResolvedValue('{"timestamp":"2023-01-01T00:00:00Z","agent":"ceo","message":"test"}');

    // config-managerのモック
    configManager.loadConfig.mockResolvedValue({
      projectName: 'test-project',
      version: '2.0.0',
      currentScenario: 'business-strategy',
      scenarios: {
        'business-strategy': {
          name: 'Business Strategy',
          tmux_sessions: {
            strategy: { layout: 'tiled' }
          }
        }
      },
      lastUpdated: '2023-01-01T00:00:00Z'
    });

    // agent-managerのモック
    agentManager.getAgentMapping.mockResolvedValue({
      ceo: 'strategy:1.1',
      cto: 'strategy:1.2',
      cfo: 'strategy:1.3'
    });
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  describe('正常系', () => {
    test('基本情報とデフォルト概要表示が正常動作する', async () => {
      // tmuxセッション一覧のモック
      mockSpawn.mockImplementation((cmd, args) => {
        if (cmd === 'tmux' && args.includes('list-sessions')) {
          return {
            stdout: { on: (event, callback) => {
              if (event === 'data') callback('strategy\n');
            }},
            stderr: { on: jest.fn() },
            on: (event, callback) => {
              if (event === 'close') process.nextTick(() => callback(0));
            }
          };
        }
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: (event, callback) => {
            if (event === 'close') process.nextTick(() => callback(0));
          }
        };
      });

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 Claude Agents システム状態'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('プロジェクト: test-project'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('バージョン: 2.0.0'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('現在のシナリオ: business-strategy'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3個のエージェントが設定済み'));
    });

    test('tmuxオプション指定時は詳細なtmux情報を表示する', async () => {
      // tmuxセッション一覧とペイン情報のモック
      mockSpawn.mockImplementation((cmd, args) => {
        if (cmd === 'tmux' && args.includes('list-sessions')) {
          return {
            stdout: { on: (event, callback) => {
              if (event === 'data') callback('strategy\nother\n');
            }},
            stderr: { on: jest.fn() },
            on: (event, callback) => {
              if (event === 'close') process.nextTick(() => callback(0));
            }
          };
        }
        if (cmd === 'tmux' && args.includes('list-panes')) {
          return {
            stdout: { on: (event, callback) => {
              if (event === 'data') callback('0:bash\n1:claude\n2:vim\n');
            }},
            stderr: { on: jest.fn() },
            on: (event, callback) => {
              if (event === 'close') process.nextTick(() => callback(0));
            }
          };
        }
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: (event, callback) => {
            if (event === 'close') process.nextTick(() => callback(0));
          }
        };
      });

      await statusCommand({ tmux: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🖥️ Tmux詳細ステータス:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('strategy: 3ペイン'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('other: 3ペイン'));
    });

    test('agentsオプション指定時は詳細なエージェント情報を表示する', async () => {
      await statusCommand({ agents: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🤖 エージェント詳細:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ceo'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('strategy:1.1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('合計エージェント数: 3'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('strategyセッション: 3エージェント'));
    });

    test('シナリオが未設定の場合は適切なメッセージを表示する', async () => {
      configManager.loadConfig.mockResolvedValue({
        projectName: 'test-project',
        version: '2.0.0',
        currentScenario: null,
        scenarios: {},
        lastUpdated: '2023-01-01T00:00:00Z'
      });

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠️ シナリオが設定されていません'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude-agents start <scenario>'));
    });

    test('ログ情報が存在する場合は表示する', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('send_log.jsonl')) return Promise.resolve(true);
        return Promise.resolve(true);
      });

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📝 ログ情報:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('送信メッセージ数: 1'));
    });
  });

  describe('エラー処理', () => {
    test('設定ファイル不存在時はプロセス終了する', async () => {
      fs.pathExists.mockResolvedValue(false);

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 設定ファイルが見つかりません'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('設定読み込みエラー時は適切なエラーメッセージを表示する', async () => {
      configManager.loadConfig.mockRejectedValue(new Error('Config load failed'));

      await statusCommand({});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ ステータス確認エラー:'),
        'Config load failed'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('verboseオプション指定時はスタックトレースを表示する', async () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      configManager.loadConfig.mockRejectedValue(error);

      await statusCommand({ verbose: true });

      expect(console.error).toHaveBeenCalledWith('Test stack trace');
    });

    test('tmuxセッションが存在しない場合は適切なメッセージを表示する', async () => {
      mockSpawn.mockImplementation(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: (event, callback) => {
          if (event === 'close') process.nextTick(() => callback(1)); // エラー終了
        }
      }));

      await statusCommand({ tmux: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ Tmuxセッションが見つかりません'));
    });

    test('エージェントマッピング取得エラー時は適切なメッセージを表示する', async () => {
      agentManager.getAgentMapping.mockRejectedValue(new Error('Mapping error'));

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ エージェント情報の取得に失敗'));
    });

    test('エージェント詳細表示時にマッピングが空の場合は適切なメッセージを表示する', async () => {
      agentManager.getAgentMapping.mockResolvedValue({});

      await statusCommand({ agents: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ エージェントマッピングが見つかりません'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('claude-agents start'));
    });
  });

  describe('tmuxステータス処理', () => {
    test('tmuxペイン情報取得エラーは適切に処理される', async () => {
      mockSpawn.mockImplementation((cmd, args) => {
        if (cmd === 'tmux' && args.includes('list-sessions')) {
          return {
            stdout: { on: (event, callback) => {
              if (event === 'data') callback('strategy\n');
            }},
            stderr: { on: jest.fn() },
            on: (event, callback) => {
              if (event === 'close') process.nextTick(() => callback(0));
            }
          };
        }
        if (cmd === 'tmux' && args.includes('list-panes')) {
          return {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: (event, callback) => {
              if (event === 'close') process.nextTick(() => callback(1)); // エラー
            }
          };
        }
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: (event, callback) => {
            if (event === 'close') process.nextTick(() => callback(0));
          }
        };
      });

      await statusCommand({ tmux: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('strategy: 0ペイン'));
    });

    test('tmuxステータス取得エラー時は適切なエラーメッセージを表示する', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('tmux command failed');
      });

      await statusCommand({ tmux: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ Tmuxステータス取得エラー'));
    });
  });

  describe('日付フォーマット処理', () => {
    test('不正な日付文字列は適切に処理される', async () => {
      configManager.loadConfig.mockResolvedValue({
        projectName: 'test-project',
        version: '2.0.0',
        currentScenario: 'business-strategy',
        scenarios: {
          'business-strategy': { name: 'Business Strategy', tmux_sessions: {} }
        },
        lastUpdated: 'invalid-date'
      });

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('最終更新: invalid date'));
    });

    test('undefined日付は適切に処理される', async () => {
      configManager.loadConfig.mockResolvedValue({
        projectName: 'test-project',
        version: '2.0.0',
        currentScenario: 'business-strategy',
        scenarios: {
          'business-strategy': { name: 'Business Strategy', tmux_sessions: {} }
        },
        lastUpdated: undefined
      });

      await statusCommand({});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('最終更新: unknown'));
    });
  });

  describe('ログ統計処理', () => {
    test('ログファイルが存在しない場合は統計を表示しない', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('send_log.jsonl')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      await statusCommand({});

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('📝 ログ情報:'));
    });

    test('空のログファイルは適切に処理される', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('send_log.jsonl')) return Promise.resolve(true);
        return Promise.resolve(true);
      });
      fs.readFile.mockResolvedValue('');

      await statusCommand({});

      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('📝 ログ情報:'));
    });
  });
});