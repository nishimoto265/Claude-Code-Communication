/**
 * Tests for scenario-manager.js
 * エラーハンドリング重視、カバレッジ90%目標
 */

const scenarioManager = require('../../lib/core/scenario-manager');
const configManager = require('../../lib/core/config-manager');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const EventEmitter = require('events');

// Mock dependencies
jest.mock('../../lib/core/config-manager');
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

describe('Scenario Manager', () => {
  let mockConfig;
  let mockProcess;
  let originalConsole;
  
  beforeEach(() => {
    mockConfig = {
      currentScenario: 'business-strategy',
      scenarios: {
        'hello-world': {
          name: 'Hello World Demo',
          description: '基本的なマルチエージェント通信デモ',
          agents: {
            president: { role: '統括責任者', session: 'president', pane: 0 },
            boss1: { role: 'チームリーダー', session: 'multiagent', pane: 0 }
          },
          tmux_sessions: {
            president: { window_name: 'president', panes: [{ role: 'president' }] },
            multiagent: { window_name: 'multiagent-team', panes: [{ role: 'boss1' }] }
          }
        },
        'business-strategy': {
          name: 'Business Strategy Discussion',
          description: '事業戦略や経営方針を議論するシナリオ',
          agents: {
            ceo: { role: '最高経営責任者', session: 'strategy', pane: 0 },
            cto: { role: '最高技術責任者', session: 'strategy', pane: 1 },
            cfo: { role: '最高財務責任者', session: 'strategy', pane: 2 }
          },
          tmux_sessions: {
            strategy: { window_name: 'strategy-team', panes: [
              { role: 'ceo' }, { role: 'cto' }, { role: 'cfo' }
            ]}
          }
        }
      }
    };
    
    // Mock config manager
    configManager.loadConfig = jest.fn().mockResolvedValue(mockConfig);
    
    // Mock fs-extra
    fs.pathExists = jest.fn().mockResolvedValue(true);
    fs.readdir = jest.fn().mockResolvedValue([]);
    fs.remove = jest.fn().mockResolvedValue();
    fs.ensureDir = jest.fn().mockResolvedValue();
    fs.move = jest.fn().mockResolvedValue();
    
    // Mock spawn
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    spawn.mockReturnValue(mockProcess);
    
    // Mock console
    originalConsole = { ...console };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    process.exit.mockRestore();
  });

  describe('listScenarios', () => {
    test('正常ケース：シナリオ一覧表示', async () => {
      await scenarioManager.listScenarios();
      
      // ヘッダーが表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('利用可能シナリオ'));
      
      // 現在のシナリオがマークされる
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🎯'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('(現在)'));
      
      // 詳細モードのヒントが表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--detailed'));
    });

    test('詳細モード：エージェント数とセッション数表示', async () => {
      await scenarioManager.listScenarios({ detailed: true });
      
      // エージェント数が表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('エージェント'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3個'));
      
      // セッション数が表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1個'));
      
      // 主要エージェントが表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('主要エージェント'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ceo, cto, cfo'));
    });

    test('エージェントやセッションが未定義の場合', async () => {
      const configWithoutAgents = {
        ...mockConfig,
        scenarios: {
          empty: {
            name: 'Empty Scenario',
            description: 'No agents or sessions'
          }
        }
      };
      
      configManager.loadConfig.mockResolvedValue(configWithoutAgents);
      
      await scenarioManager.listScenarios({ detailed: true });
      
      // エラーにならず、0個と表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('0個'));
    });

    test('エラーハンドリング：設定読み込み失敗', async () => {
      configManager.loadConfig.mockRejectedValue(new Error('Config not found'));
      
      await scenarioManager.listScenarios();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('シナリオ一覧取得エラー'),
        expect.any(String)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('現在のシナリオが設定されていない場合', async () => {
      const configWithoutCurrent = {
        ...mockConfig,
        currentScenario: null
      };
      
      configManager.loadConfig.mockResolvedValue(configWithoutCurrent);
      
      await scenarioManager.listScenarios();
      
      // すべてのシナリオが非現在状態で表示される
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('🎯'));
    });
  });

  describe('resetEnvironment', () => {
    const inquirer = require('inquirer');
    
    test('正常ケース：強制リセット', async () => {
      // Mock tmux sessions
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'strategy\nanalysis\nother\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('環境リセット'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('環境リセット完了'));
    });

    test('確認ダイアログでキャンセル', async () => {
      inquirer.prompt.mockResolvedValue({ confirm: false });
      
      await scenarioManager.resetEnvironment();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('リセットをキャンセル'));
    });

    test('確認ダイアログで実行', async () => {
      inquirer.prompt.mockResolvedValue({ confirm: true });
      
      // Mock tmux sessions
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'strategy\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      await scenarioManager.resetEnvironment();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('環境リセット完了'));
    });

    test('エラーハンドリング：リセット処理失敗', async () => {
      fs.remove.mockRejectedValue(new Error('Permission denied'));
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('リセットエラー'),
        expect.any(String)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('getScenarioConfig', () => {
    test('正常ケース：設定取得', async () => {
      const result = await scenarioManager.getScenarioConfig();
      
      expect(result).toEqual(mockConfig.scenarios);
    });

    test('設定取得失敗時はデフォルト設定を返す', async () => {
      configManager.loadConfig.mockRejectedValue(new Error('Config not found'));
      
      const result = await scenarioManager.getScenarioConfig();
      
      // デフォルトシナリオが返される
      expect(result).toHaveProperty('hello-world');
      expect(result).toHaveProperty('business-strategy');
    });
  });

  describe('killAllRelatedSessions', () => {
    test('正常ケース：関連セッション削除', async () => {
      // Mock tmux list-sessions
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'strategy\nanalysis\nother\npersonal\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      // killAllRelatedSessions は直接公開されていないが、
      // resetEnvironment 経由でテストされる
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション終了'));
    });

    test('tmuxセッションが存在しない場合', async () => {
      // Mock empty sessions
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'no server running');
        mockProcess.emit('close', 1);
      }, 0);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tmuxセッションが見つかりません'));
    });

    test('セッション削除失敗時の処理', async () => {
      // First call: list sessions (success)
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'strategy\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      // Second call: kill session (failure)
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'session not found');
        mockProcess.emit('close', 1);
      }, 10);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション終了失敗'));
    });
  });

  describe('cleanupTempFiles', () => {
    test('正常ケース：テンポラリファイル削除', async () => {
      await scenarioManager.resetEnvironment({ force: true });
      
      // 各テンポラリファイルの削除が試行される
      expect(fs.remove).toHaveBeenCalledWith('./tmp/agent_mapping.sh');
      expect(fs.remove).toHaveBeenCalledWith('./tmp/agent_mapping.json');
      expect(fs.remove).toHaveBeenCalledWith('./tmp/current_scenario.txt');
      expect(fs.remove).toHaveBeenCalledWith('./tmp/session_status.json');
    });

    test('ファイル削除失敗時の処理', async () => {
      fs.remove.mockRejectedValue(new Error('Permission denied'));
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('削除失敗'));
    });

    test('空ディレクトリの削除', async () => {
      fs.readdir.mockResolvedValue([]); // 空ディレクトリ
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('空ディレクトリ削除'));
    });
  });

  describe('archiveLogs', () => {
    test('正常ケース：ログアーカイブ', async () => {
      fs.readdir.mockResolvedValue(['send_log.jsonl', 'error.log']);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('./logs/archive/'));
      expect(fs.move).toHaveBeenCalledWith('./logs/send_log.jsonl', expect.any(String));
      expect(fs.move).toHaveBeenCalledWith('./logs/error.log', expect.any(String));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ログアーカイブ完了'));
    });

    test('ログディレクトリが存在しない場合', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ログディレクトリが存在しません'));
    });

    test('ログファイルが存在しない場合', async () => {
      fs.readdir.mockResolvedValue([]);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('アーカイブするログファイルがありません'));
    });

    test('archiveディレクトリはスキップされる', async () => {
      fs.readdir.mockResolvedValue(['send_log.jsonl', 'archive']);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      // archiveディレクトリは移動されない
      expect(fs.move).toHaveBeenCalledWith('./logs/send_log.jsonl', expect.any(String));
      expect(fs.move).not.toHaveBeenCalledWith('./logs/archive', expect.any(String));
    });

    test('アーカイブ失敗時の処理', async () => {
      fs.readdir.mockResolvedValue(['error.log']);
      fs.move.mockRejectedValue(new Error('Permission denied'));
      
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('アーカイブ失敗'));
    });
  });

  describe('getDefaultScenarios', () => {
    test('デフォルトシナリオの構造確認', async () => {
      configManager.loadConfig.mockRejectedValue(new Error('No config'));
      
      const result = await scenarioManager.getScenarioConfig();
      
      // hello-worldシナリオが含まれる
      expect(result).toHaveProperty('hello-world');
      expect(result['hello-world']).toHaveProperty('name', 'Hello World Demo');
      expect(result['hello-world']).toHaveProperty('tmux_sessions');
      expect(result['hello-world']).toHaveProperty('agents');
      
      // business-strategyシナリオが含まれる
      expect(result).toHaveProperty('business-strategy');
      expect(result['business-strategy']).toHaveProperty('name', 'Business Strategy Discussion');
    });
  });

  describe('execCommand内部関数', () => {
    test('コマンド成功時', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'success output');
        mockProcess.emit('close', 0);
      }, 0);
      
      // execCommandは内部関数なので、公開メソッド経由でテスト
      await scenarioManager.resetEnvironment({ force: true });
      
      expect(spawn).toHaveBeenCalled();
    });

    test('コマンド失敗時', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error output');
        mockProcess.emit('close', 1);
      }, 0);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      // エラーが適切に処理される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tmuxセッションが見つかりません'));
    });
  });

  describe('エッジケースとバリデーション', () => {
    test('非常に長いセッション名のパターンマッチング', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'very-long-strategy-session-name\nanalysis-extended\nother\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      // パターンマッチングが正常に動作する
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション終了'));
    });

    test('特殊文字を含むセッション名', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'strategy@#$%\nanalysis-_-test\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      await scenarioManager.resetEnvironment({ force: true });
      
      // 特殊文字があってもパターンマッチングが動作する
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('セッション終了'));
    });

    test('空のシナリオ設定', async () => {
      const emptyConfig = {
        currentScenario: null,
        scenarios: {}
      };
      
      configManager.loadConfig.mockResolvedValue(emptyConfig);
      
      await scenarioManager.listScenarios();
      
      // 空の場合でもエラーにならない
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('利用可能シナリオ'));
    });

    test('inquirerモジュールが利用できない場合', async () => {
      const inquirer = require('inquirer');
      inquirer.prompt.mockRejectedValue(new Error('Inquirer error'));
      
      await expect(scenarioManager.resetEnvironment()).rejects.toThrow();
    });
  });
});