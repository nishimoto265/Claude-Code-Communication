/**
 * Configuration management for claude-agents
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const scenarioLoader = require('./scenario-loader');

const CONFIG_FILE = './claude-agents.yaml';

/**
 * Load configuration from file
 */
async function loadConfig() {
  try {
    // Try YAML format first
    if (await fs.pathExists(CONFIG_FILE)) {
      const content = await fs.readFile(CONFIG_FILE, 'utf8');
      const config = yaml.load(content);
      
      // Basic validation
      if (!config.version) {
        throw new Error('Invalid configuration file: missing version');
      }
      
      if (!config.scenarios) {
        throw new Error('Invalid configuration file: missing scenarios');
      }
      
      return config;
    }
    
    // Fallback to JSON format for backward compatibility
    const jsonConfigFile = './claude-agents.json';
    if (await fs.pathExists(jsonConfigFile)) {
      console.warn('⚠️ Using legacy JSON config. Consider running: claude-agents init --migrate');
      const config = await fs.readJSON(jsonConfigFile);
      
      // Basic validation
      if (!config.version) {
        throw new Error('Invalid configuration file: missing version');
      }
      
      if (!config.scenarios) {
        throw new Error('Invalid configuration file: missing scenarios');
      }
      
      return config;
    }
    
    throw new Error('Configuration file not found. Run: claude-agents init');
  } catch (error) {
    throw new Error(`Configuration load error: ${error.message}`);
  }
}

/**
 * Save configuration to file
 */
async function saveConfig(config) {
  try {
    // Update timestamp
    config.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(CONFIG_FILE, yaml.dump(config, { indent: 2, lineWidth: 120 }));
  } catch (error) {
    throw new Error(`Configuration save error: ${error.message}`);
  }
}

/**
 * Get current scenario
 */
async function getCurrentScenario() {
  try {
    const config = await loadConfig();
    return config.currentScenario || null;
  } catch (error) {
    return null;
  }
}

/**
 * Set current scenario
 */
async function setCurrentScenario(scenario) {
  try {
    const config = await loadConfig();
    
    // Validate scenario exists
    if (!config.scenarios[scenario]) {
      throw new Error(`Invalid scenario: ${scenario}`);
    }
    
    config.currentScenario = scenario;
    await saveConfig(config);
    
    // Also save to temp file for shell script compatibility
    await fs.ensureDir('./tmp');
    await fs.writeFile('./tmp/current_scenario.txt', scenario);
    
  } catch (error) {
    throw new Error(`Set scenario error: ${error.message}`);
  }
}

/**
 * Get scenario configuration with external file support
 */
async function getScenarioConfig(scenarioName = null) {
  try {
    const config = await loadConfig();
    
    if (scenarioName) {
      // Try to load from external files first
      try {
        const externalConfig = await scenarioLoader.loadScenarioFromFiles(scenarioName);
        return externalConfig;
      } catch (externalError) {
        // Fallback to internal configuration
        if (!config.scenarios[scenarioName]) {
          throw new Error(`Scenario not found: ${scenarioName}`);
        }
        return config.scenarios[scenarioName];
      }
    }
    
    return config.scenarios;
  } catch (error) {
    throw new Error(`Get scenario config error: ${error.message}`);
  }
}

/**
 * Update scenario configuration
 */
async function updateScenarioConfig(scenarioName, updates) {
  try {
    const config = await loadConfig();
    
    if (!config.scenarios[scenarioName]) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }
    
    // Merge updates
    config.scenarios[scenarioName] = {
      ...config.scenarios[scenarioName],
      ...updates
    };
    
    await saveConfig(config);
  } catch (error) {
    throw new Error(`Update scenario config error: ${error.message}`);
  }
}

/**
 * Get application settings
 */
async function getSettings() {
  try {
    const config = await loadConfig();
    return config.settings || {};
  } catch (error) {
    return {};
  }
}

/**
 * Update application settings
 */
async function updateSettings(updates) {
  try {
    const config = await loadConfig();
    
    config.settings = {
      ...config.settings,
      ...updates
    };
    
    await saveConfig(config);
  } catch (error) {
    throw new Error(`Update settings error: ${error.message}`);
  }
}

/**
 * Initialize default configuration
 */
async function initializeConfig(options = {}) {
  const defaultConfig = {
    version: '2.0.0',
    currentScenario: options.scenario || 'business-strategy',
    projectName: options.projectName || path.basename(process.cwd()),
    scenarios: {
      'hello-world': {
        name: 'Hello World Demo',
        description: '基本的なマルチエージェント通信デモ',
        tmux_sessions: {
          president: {
            window_name: 'president',
            panes: [{ role: 'president', color: 'magenta' }]
          },
          multiagent: {
            window_name: 'multiagent-team',
            panes: [
              { role: 'boss1', color: 'red' },
              { role: 'worker1', color: 'blue' },
              { role: 'worker2', color: 'blue' },
              { role: 'worker3', color: 'blue' }
            ]
          }
        },
        agents: {
          president: { role: '統括責任者', session: 'president', pane: 0 },
          boss1: { role: 'チームリーダー', session: 'multiagent', pane: 0 },
          worker1: { role: 'ワーカー1', session: 'multiagent', pane: 1 },
          worker2: { role: 'ワーカー2', session: 'multiagent', pane: 2 },
          worker3: { role: 'ワーカー3', session: 'multiagent', pane: 3 }
        }
      },
      'business-strategy': {
        name: 'Business Strategy Discussion',
        description: '事業戦略や経営方針を議論するシナリオ',
        tmux_sessions: {
          strategy: {
            window_name: 'strategy-team',
            panes: [
              { role: 'ceo', color: 'magenta' },
              { role: 'cto', color: 'red' },
              { role: 'cfo', color: 'green' },
              { role: 'cmo', color: 'yellow' }
            ]
          },
          analysis: {
            window_name: 'analysis-team',
            panes: [
              { role: 'product_manager', color: 'blue' },
              { role: 'data_analyst', color: 'cyan' }
            ]
          }
        },
        agents: {
          ceo: { role: '最高経営責任者', session: 'strategy', pane: 0 },
          cto: { role: '最高技術責任者', session: 'strategy', pane: 1 },
          cfo: { role: '最高財務責任者', session: 'strategy', pane: 2 },
          cmo: { role: '最高マーケティング責任者', session: 'strategy', pane: 3 },
          product_manager: { role: 'プロダクトマネージャー', session: 'analysis', pane: 0 },
          data_analyst: { role: 'データアナリスト', session: 'analysis', pane: 1 }
        }
      }
    },
    settings: {
      tmuxPrefix: 'C-b',
      autoStartClaude: true,
      logLevel: 'info',
      colorOutput: true,
      messageWaitTime: 0.5
    },
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  await saveConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Validate configuration file
 */
async function validateConfig() {
  try {
    const config = await loadConfig();
    const errors = [];
    
    // Check required fields
    if (!config.version) errors.push('Missing version');
    if (!config.scenarios) errors.push('Missing scenarios');
    if (!config.settings) errors.push('Missing settings');
    
    // Check scenarios
    if (config.scenarios) {
      for (const [name, scenario] of Object.entries(config.scenarios)) {
        if (!scenario.name) errors.push(`Scenario ${name}: missing name`);
        if (!scenario.tmux_sessions) errors.push(`Scenario ${name}: missing tmux_sessions`);
        if (!scenario.agents) errors.push(`Scenario ${name}: missing agents`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Update main configuration with new scenario
 */
async function updateMainConfig(basicInfo) {
  try {
    const config = await loadConfig();
    
    // Add new scenario to configuration
    config.scenarios[basicInfo.id] = {
      name: basicInfo.name,
      description: basicInfo.description,
      type: 'external',
      path: `scenarios/${basicInfo.id}`
    };
    
    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();
    
    await saveConfig(config);
  } catch (error) {
    throw new Error(`Update main config error: ${error.message}`);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  getCurrentScenario,
  setCurrentScenario,
  getScenarioConfig,
  updateScenarioConfig,
  getSettings,
  updateSettings,
  initializeConfig,
  validateConfig,
  updateMainConfig
};