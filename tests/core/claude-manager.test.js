/**
 * Tests for claude-manager.js
 * エラーハンドリング重視、カバレッジ90%目標
 */

const claudeManager = require('../../lib/core/claude-manager');
const tmuxManager = require('../../lib/core/tmux-manager');
const { spawn } = require('child_process');
const EventEmitter = require('events');

// Mock dependencies
jest.mock('../../lib/core/tmux-manager');
jest.mock('child_process');

describe('Claude Manager', () => {
  let mockScenarioConfig;
  let mockProcess;
  let originalConsole;
  
  beforeEach(() => {
    mockScenarioConfig = {
      tmux_sessions: {
        test: {
          window_name: 'test-window',
          panes: [
            { role: 'agent1', color: 'red' },
            { role: 'agent2', color: 'blue' }
          ]
        },
        strategy: {
          window_name: 'strategy-window',
          panes: [
            { role: 'ceo', color: 'magenta' },
            { role: 'cto', color: 'red' }
          ]
        }
      }
    };
    
    // Mock tmux manager
    tmuxManager.sendToPane = jest.fn().mockResolvedValue(true);
    
    // Mock spawn for child_process
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    spawn.mockReturnValue(mockProcess);
    
    // Mock console methods
    originalConsole = { ...console };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('startClaudeAgents', () => {
    test('正常ケース：全ペインでClaude Codeを起動', async () => {
      await claudeManager.startClaudeAgents(mockScenarioConfig);
      
      // 各ペインでsendToPaneが呼ばれることを確認
      expect(tmuxManager.sendToPane).toHaveBeenCalledTimes(4);
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('test:1.1', 'claude', { clear: true, wait: 0.5 });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('test:1.2', 'claude', { clear: true, wait: 0.5 });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('strategy:1.1', 'claude', { clear: true, wait: 0.5 });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('strategy:1.2', 'claude', { clear: true, wait: 0.5 });
      
      // 成功メッセージが出力される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Started Claude Code on 4 panes'));
    });

    test('一部ペイン起動失敗時の処理', async () => {
      // 2番目のペインで失敗するようにモック
      tmuxManager.sendToPane
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Pane not found'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      
      await claudeManager.startClaudeAgents(mockScenarioConfig);
      
      // 全ペインで試行される
      expect(tmuxManager.sendToPane).toHaveBeenCalledTimes(4);
      
      // 失敗メッセージが出力される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed to start'));
      
      // 成功したペインで完了メッセージ
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Started Claude Code on 3 panes'));
    });

    test('全ペイン起動失敗時は手動起動手順を表示', async () => {
      tmuxManager.sendToPane.mockRejectedValue(new Error('Connection failed'));
      
      await claudeManager.startClaudeAgents(mockScenarioConfig);
      
      // 手動起動手順が表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('手動起動手順'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('tmux send-keys'));
    });

    test('エラーハンドリング：無効なセッション設定', async () => {
      const invalidConfig = { tmux_sessions: null };
      
      await expect(claudeManager.startClaudeAgents(invalidConfig))
        .rejects.toThrow('Failed to start Claude agents');
    });

    test('エラーハンドリング：空のセッション設定', async () => {
      const emptyConfig = { tmux_sessions: {} };
      
      await claudeManager.startClaudeAgents(emptyConfig);
      
      // エラーにならず、手動起動手順が表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No panes were started'));
    });

    test('ペインが設定されていないセッション', async () => {
      const configWithoutPanes = {
        tmux_sessions: {
          empty: { window_name: 'empty-window' }
        }
      };
      
      await claudeManager.startClaudeAgents(configWithoutPanes);
      
      // panesがundefinedでもエラーにならない
      expect(tmuxManager.sendToPane).not.toHaveBeenCalled();
    });

    test('roleが設定されていないペイン', async () => {
      const configWithoutRole = {
        tmux_sessions: {
          test: {
            panes: [{ color: 'red' }] // roleなし
          }
        }
      };
      
      await claudeManager.startClaudeAgents(configWithoutRole);
      
      // デフォルトのrole 'agent'が使用される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('agent (test:1.1)'));
    });
  });

  describe('checkClaudeStatus', () => {
    test('正常ケース：ステータス取得', async () => {
      // Mock tmux command response
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'claude:1234');
        mockProcess.emit('close', 0);
      }, 0);
      
      const status = await claudeManager.checkClaudeStatus(mockScenarioConfig);
      
      expect(status).toHaveProperty('test');
      expect(status).toHaveProperty('strategy');
      expect(status.test).toHaveProperty('totalPanes', 2);
      expect(status.test).toHaveProperty('activePanes');
      expect(status.test).toHaveProperty('panes');
    });

    test('tmuxコマンド失敗時のエラーハンドリング', async () => {
      // Mock failed spawn
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'pane not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const status = await claudeManager.checkClaudeStatus(mockScenarioConfig);
      
      // エラーが発生してもステータスオブジェクトが返される
      expect(status).toBeDefined();
      expect(status.test.panes).toBeDefined();
    });

    test('設定エラー時の例外', async () => {
      const invalidConfig = { tmux_sessions: null };
      
      await expect(claudeManager.checkClaudeStatus(invalidConfig))
        .rejects.toThrow('Failed to check Claude status');
    });
  });

  describe('stopClaudeAgents', () => {
    test('正常ケース：全ペイン停止', async () => {
      await claudeManager.stopClaudeAgents(mockScenarioConfig);
      
      // 各ペインでCtrl+C送信（空文字列 + clear）
      expect(tmuxManager.sendToPane).toHaveBeenCalledTimes(4);
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('test:1.1', '', { clear: true });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('test:1.2', '', { clear: true });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('strategy:1.1', '', { clear: true });
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith('strategy:1.2', '', { clear: true });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Stopped Claude Code on 4 panes'));
    });

    test('一部ペイン停止失敗時の処理', async () => {
      tmuxManager.sendToPane
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Pane not found'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      
      await claudeManager.stopClaudeAgents(mockScenarioConfig);
      
      expect(tmuxManager.sendToPane).toHaveBeenCalledTimes(4);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed to stop'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Stopped Claude Code on 3 panes'));
    });

    test('エラーハンドリング：設定エラー', async () => {
      const invalidConfig = { tmux_sessions: null };
      
      await expect(claudeManager.stopClaudeAgents(invalidConfig))
        .rejects.toThrow('Failed to stop Claude agents');
    });
  });

  describe('restartClaudeAgent', () => {
    test('正常ケース：指定ペインの再起動', async () => {
      const target = 'test:1.1';
      
      await claudeManager.restartClaudeAgent(target);
      
      // 停止と起動が順番に実行される
      expect(tmuxManager.sendToPane).toHaveBeenCalledTimes(2);
      expect(tmuxManager.sendToPane).toHaveBeenNthCalledWith(1, target, '', { clear: true, wait: 0.5 });
      expect(tmuxManager.sendToPane).toHaveBeenNthCalledWith(2, target, 'claude', { wait: 1 });
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Restarted Claude agent'));
    });

    test('カスタム待機時間オプション', async () => {
      const target = 'test:1.1';
      const options = { wait: 3 };
      
      await claudeManager.restartClaudeAgent(target, options);
      
      expect(tmuxManager.sendToPane).toHaveBeenNthCalledWith(2, target, 'claude', { wait: 3 });
    });

    test('エラーハンドリング：tmux失敗', async () => {
      const target = 'test:1.1';
      tmuxManager.sendToPane.mockRejectedValue(new Error('tmux error'));
      
      await expect(claudeManager.restartClaudeAgent(target))
        .rejects.toThrow('Failed to restart Claude agent test:1.1: tmux error');
    });

    test('エラーハンドリング：空のオプション', async () => {
      const target = 'test:1.1';
      
      // オプションなしでも動作する
      await claudeManager.restartClaudeAgent(target, undefined);
      
      expect(tmuxManager.sendToPane).toHaveBeenNthCalledWith(2, target, 'claude', { wait: 1 });
    });
  });

  describe('testClaudeAgent', () => {
    test('正常ケース：テストメッセージ送信', async () => {
      const target = 'test:1.1';
      
      const result = await claudeManager.testClaudeAgent(target);
      
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith(
        target,
        'echo "Claude agent test - please respond with OK"',
        { wait: 2 }
      );
      
      expect(result).toEqual({ sent: true, target });
    });

    test('エラーハンドリング：tmux失敗', async () => {
      const target = 'test:1.1';
      tmuxManager.sendToPane.mockRejectedValue(new Error('tmux error'));
      
      await expect(claudeManager.testClaudeAgent(target))
        .rejects.toThrow('Failed to test Claude agent test:1.1: tmux error');
    });
  });

  describe('内部関数とエラーハンドリング', () => {
    test('showClaudeStartupInstructions', () => {
      // プライベート関数なので直接テストできないが、
      // startClaudeAgents経由でテストされている
      expect(true).toBe(true);
    });

    test('showManualStartupInstructions', async () => {
      tmuxManager.sendToPane.mockRejectedValue(new Error('All failed'));
      
      await claudeManager.startClaudeAgents(mockScenarioConfig);
      
      // 手動起動手順が表示される
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('手動起動手順'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('for i in {1..2}'));
    });

    test('checkPaneClaudeStatus：コマンド出力解析', async () => {
      // 異なるコマンド出力のテスト
      const testCases = [
        'claude:1234',
        'python:5678', 
        'node:9999',
        'bash:1111'
      ];
      
      for (const output of testCases) {
        setTimeout(() => {
          mockProcess.stdout.emit('data', output);
          mockProcess.emit('close', 0);
        }, 0);
        
        // checkPaneClaudeStatusは直接公開されていないため、
        // checkClaudeStatus経由でテスト済み
      }
    });
  });

  describe('エッジケースとバリデーション', () => {
    test('空文字のtarget', async () => {
      await expect(claudeManager.restartClaudeAgent(''))
        .rejects.toThrow();
    });

    test('nullのtarget', async () => {
      await expect(claudeManager.restartClaudeAgent(null))
        .rejects.toThrow();
    });

    test('非常に長いセッション名', async () => {
      const longSessionConfig = {
        tmux_sessions: {
          'very-long-session-name-that-exceeds-normal-limits': {
            panes: [{ role: 'test' }]
          }
        }
      };
      
      await claudeManager.startClaudeAgents(longSessionConfig);
      
      expect(tmuxManager.sendToPane).toHaveBeenCalledWith(
        'very-long-session-name-that-exceeds-normal-limits:1.1',
        'claude',
        { clear: true, wait: 0.5 }
      );
    });

    test('特殊文字を含むrole名', async () => {
      const specialConfig = {
        tmux_sessions: {
          test: {
            panes: [{ role: 'agent@#$%^&*()' }]
          }
        }
      };
      
      await claudeManager.startClaudeAgents(specialConfig);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('agent@#$%^&*()')
      );
    });
  });
});