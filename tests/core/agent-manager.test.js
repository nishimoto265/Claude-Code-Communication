/**
 * Tests for agent-manager.js
 */

const fs = require('fs-extra');
const path = require('path');

const agentManager = require('../../lib/core/agent-manager');

describe('Agent Manager', () => {
  let originalCwd;
  
  beforeEach(async () => {
    originalCwd = process.cwd();
    process.chdir(global.testUtils.TEST_DIR);
    // tmpディレクトリを確実に作成
    await fs.ensureDir('./tmp');
  });
  
  afterEach(async () => {
    // tmpディレクトリをクリーンアップ
    if (await fs.pathExists('./tmp')) {
      await fs.remove('./tmp');
    }
    process.chdir(originalCwd);
  });

  describe('getAgentMapping', () => {
    test('JSONマッピングファイルが存在する場合は読み込める', async () => {
      const mapping = {
        agent1: 'session1:1.1',
        agent2: 'session1:1.2'
      };
      
      await fs.ensureDir('./tmp');
      await fs.writeJSON('./tmp/agent_mapping.json', mapping);
      
      const result = await agentManager.getAgentMapping();
      
      expect(result).toEqual(mapping);
    });

    test('シェルスクリプト形式のマッピングファイルを読み込める', async () => {
      const shellContent = `#!/bin/bash
# Auto-generated agent mapping for tmux targets

get_agent_target() {
    case "$1" in
        "agent1") echo "session1:1.1" ;;
        "agent2") echo "session1:1.2" ;;
        *) echo "" ;;
    esac
}

# Export function for sourcing
export -f get_agent_target 2>/dev/null || true
`;
      
      await fs.ensureDir('./tmp');
      await fs.writeFile('./tmp/agent_mapping.sh', shellContent);
      
      const result = await agentManager.getAgentMapping();
      
      expect(result.agent1).toBe('session1:1.1');
      expect(result.agent2).toBe('session1:1.2');
    });

    test('マッピングファイルが存在しない場合は空オブジェクトを返す', async () => {
      const result = await agentManager.getAgentMapping();
      
      expect(result).toEqual({});
    });

    test('不正なJSONファイルの場合はエラーが発生する', async () => {
      await fs.ensureDir('./tmp');
      await fs.writeFile('./tmp/agent_mapping.json', 'invalid json content');
      
      await expect(agentManager.getAgentMapping())
        .rejects
        .toThrow('Failed to get agent mapping');
    });
  });

  describe('saveAgentMapping', () => {
    test('エージェントマッピングをJSONとシェルスクリプト両方で保存できる', async () => {
      const mapping = {
        ceo: 'strategy:1.1',
        cto: 'strategy:1.2',
        cmo: 'strategy:1.3'
      };
      
      await agentManager.saveAgentMapping(mapping);
      
      // JSONファイルの確認
      expect(await fs.pathExists('./tmp/agent_mapping.json')).toBe(true);
      const jsonContent = await fs.readJSON('./tmp/agent_mapping.json');
      expect(jsonContent).toEqual(mapping);
      
      // シェルスクリプトファイルの確認
      expect(await fs.pathExists('./tmp/agent_mapping.sh')).toBe(true);
      const shellContent = await fs.readFile('./tmp/agent_mapping.sh', 'utf8');
      expect(shellContent).toContain('"ceo") echo "strategy:1.1"');
      expect(shellContent).toContain('"cto") echo "strategy:1.2"');
      expect(shellContent).toContain('"cmo") echo "strategy:1.3"');
    });

    test('シェルスクリプトファイルに実行権限が設定される', async () => {
      const mapping = { agent1: 'session:1.1' };
      
      await agentManager.saveAgentMapping(mapping);
      
      const stats = await fs.stat('./tmp/agent_mapping.sh');
      expect(stats.mode & parseInt('755', 8)).toBeTruthy();
    });

    test('tmpディレクトリが存在しない場合は作成される', async () => {
      const mapping = { agent1: 'session:1.1' };
      
      // tmpディレクトリを一時削除
      await fs.remove('./tmp');
      
      await agentManager.saveAgentMapping(mapping);
      
      expect(await fs.pathExists('./tmp')).toBe(true);
      expect(await fs.pathExists('./tmp/agent_mapping.json')).toBe(true);
    });
  });

  describe('generateAgentMappingForScenario', () => {
    test('シナリオ設定からエージェントマッピングを生成できる', async () => {
      const scenarioConfig = {
        agents: {
          ceo: { session: 'strategy', pane: 0 },
          cto: { session: 'strategy', pane: 1 },
          product_manager: { session: 'analysis', pane: 0 }
        },
        tmux_sessions: {
          strategy: { window_name: 'strategy-team' },
          analysis: { window_name: 'analysis-team' }
        }
      };
      
      const result = await agentManager.generateAgentMappingForScenario('test-scenario', scenarioConfig);
      
      expect(result.ceo).toBe('strategy:strategy-team.1');
      expect(result.cto).toBe('strategy:strategy-team.2');
      expect(result.product_manager).toBe('analysis:analysis-team.1');
      
      // ファイルも保存されることを確認
      const savedMapping = await agentManager.getAgentMapping();
      expect(savedMapping).toEqual(result);
    });

    test('window_nameが設定されていない場合はシンプル形式を使用する', async () => {
      const scenarioConfig = {
        agents: {
          agent1: { session: 'main', pane: 0 },
          agent2: { session: 'main', pane: 1 }
        },
        tmux_sessions: {
          main: {} // window_nameなし
        }
      };
      
      const result = await agentManager.generateAgentMappingForScenario('test-scenario', scenarioConfig);
      
      expect(result.agent1).toBe('main:0.0');
      expect(result.agent2).toBe('main:0.1');
    });

    test('不正なシナリオ設定の場合はエラーが発生する', async () => {
      const invalidConfig = {
        agents: {
          agent1: { session: 'main', pane: 0 }
        }
        // tmux_sessionsが不足
      };
      
      await expect(agentManager.generateAgentMappingForScenario('invalid', invalidConfig))
        .rejects
        .toThrow('Failed to generate agent mapping');
    });
  });

  describe('validateAgentMapping', () => {
    test('有効なマッピングの場合はvalidがtrueを返す', async () => {
      const mapping = {
        ceo: 'strategy:1.1',
        cto: 'strategy:strategy-team.2',
        product_manager: 'analysis:0.0'
      };
      
      const result = await agentManager.validateAgentMapping(mapping);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('不正なエージェント名の場合はエラーを返す', async () => {
      const mapping = {
        '': 'strategy:1.1',  // 空文字
        123: 'strategy:1.2',  // 数値
        null: 'strategy:1.3'  // null
      };
      
      const result = await agentManager.validateAgentMapping(mapping);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('Invalid agent name'))).toBe(true);
    });

    test('不正なターゲット形式の場合はエラーを返す', async () => {
      const mapping = {
        agent1: 'invalid-format',  // コロンなし
        agent2: 'session:',        // 不完全
        agent3: ':1.1',           // セッション名なし
        agent4: 'session:abc'      // 不正なペイン番号
      };
      
      const result = await agentManager.validateAgentMapping(mapping);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('Invalid tmux target format'))).toBe(true);
    });

    test('空のマッピングでも有効とする', async () => {
      const result = await agentManager.validateAgentMapping({});
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('getAgentList', () => {
    test('エージェント一覧を詳細情報付きで取得できる', async () => {
      const mapping = {
        ceo: 'strategy:strategy-team.1',
        cto: 'strategy:strategy-team.2',
        product_manager: 'analysis:0.1'
      };
      
      await fs.ensureDir('./tmp');
      await fs.writeJSON('./tmp/agent_mapping.json', mapping);
      
      const result = await agentManager.getAgentList();
      
      expect(result).toHaveLength(3);
      
      const ceoAgent = result.find(agent => agent.name === 'ceo');
      expect(ceoAgent.target).toBe('strategy:strategy-team.1');
      expect(ceoAgent.session).toBe('strategy');
      expect(ceoAgent.window).toBe('strategy-team');
      expect(ceoAgent.pane).toBe(1);
      
      const pmAgent = result.find(agent => agent.name === 'product_manager');
      expect(pmAgent.target).toBe('analysis:0.1');
      expect(pmAgent.session).toBe('analysis');
      expect(pmAgent.window).toBe('0');
      expect(pmAgent.pane).toBe(1);
    });

    test('エージェント一覧がアルファベット順でソートされる', async () => {
      const mapping = {
        zebra: 'session:1.1',
        alpha: 'session:1.2',
        beta: 'session:1.3'
      };
      
      await fs.ensureDir('./tmp');
      await fs.writeJSON('./tmp/agent_mapping.json', mapping);
      
      const result = await agentManager.getAgentList();
      
      expect(result[0].name).toBe('alpha');
      expect(result[1].name).toBe('beta');
      expect(result[2].name).toBe('zebra');
    });

    test('マッピングが存在しない場合は空配列を返す', async () => {
      const result = await agentManager.getAgentList();
      
      expect(result).toEqual([]);
    });
  });

  describe('findAgent', () => {
    beforeEach(async () => {
      const mapping = {
        ceo: 'strategy:1.1',
        cto: 'strategy:1.2',
        cmo: 'strategy:1.3',
        product_manager: 'analysis:1.1'
      };
      
      await fs.ensureDir('./tmp');
      await fs.writeJSON('./tmp/agent_mapping.json', mapping);
    });

    test('完全一致するエージェント名で検索できる', async () => {
      const result = await agentManager.findAgent('ceo');
      
      expect(result.name).toBe('ceo');
      expect(result.target).toBe('strategy:1.1');
    });

    test('大文字小文字を無視して検索できる', async () => {
      const result = await agentManager.findAgent('CEO');
      
      expect(result.name).toBe('ceo');
      expect(result.target).toBe('strategy:1.1');
    });

    test('部分一致で検索できる', async () => {
      const result = await agentManager.findAgent('product');
      
      expect(result.name).toBe('product_manager');
      expect(result.target).toBe('analysis:1.1');
    });

    test('シナリオ設定でエイリアス解決ができる', async () => {
      const scenarioConfig = {
        agents: {
          cmo: { role: 'CMO', aliases: ['marketing_director'] }
        }
      };
      
      const result = await agentManager.findAgent('marketing_director', scenarioConfig);
      
      expect(result.name).toBe('cmo');
      expect(result.target).toBe('strategy:1.3');
    });

    test('存在しないエージェント名の場合はnullを返す', async () => {
      const result = await agentManager.findAgent('non-existent');
      
      expect(result).toBeNull();
    });

    test('シナリオ設定が提供されない場合でも通常の検索は動作する', async () => {
      const result = await agentManager.findAgent('cto');
      
      expect(result.name).toBe('cto');
      expect(result.target).toBe('strategy:1.2');
    });

    test('エイリアスが存在しないエージェントでも通常通り動作する', async () => {
      const scenarioConfig = {
        agents: {
          ceo: { role: 'CEO' } // aliasesなし
        }
      };
      
      const result = await agentManager.findAgent('ceo', scenarioConfig);
      
      expect(result.name).toBe('ceo');
      expect(result.target).toBe('strategy:1.1');
    });

    test('マッピングファイルが存在しない場合はnullを返す', async () => {
      await fs.remove('./tmp/agent_mapping.json');
      
      const result = await agentManager.findAgent('ceo');
      
      expect(result).toBeNull();
    });
  });
});