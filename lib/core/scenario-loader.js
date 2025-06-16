/**
 * External scenario configuration loader for claude-agents
 * Supports loading scenarios from external YAML files
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Load scenario configuration from external files
 * @param {string} scenarioName - Name of the scenario
 * @returns {Object} Complete scenario configuration
 */
async function loadScenarioFromFiles(scenarioName) {
  const scenarioPath = path.join('./scenarios', scenarioName);
  
  // Check if scenario directory exists
  if (!await fs.pathExists(scenarioPath)) {
    throw new Error(`Scenario directory not found: ${scenarioPath}`);
  }
  
  try {
    // Load main scenario metadata
    const scenarioFile = path.join(scenarioPath, 'scenario.yaml');
    const scenario = await loadYamlFile(scenarioFile, 'scenario metadata');
    
    // Load agents configuration
    const agentsFile = path.join(scenarioPath, 'agents.yaml');
    const agents = await loadYamlFile(agentsFile, 'agents configuration');
    
    // Load layout configuration
    const layoutFile = path.join(scenarioPath, 'layout.yaml');
    const layout = await loadYamlFile(layoutFile, 'layout configuration');
    
    // Combine all configurations
    const completeConfig = {
      name: scenario.name,
      description: scenario.description,
      version: scenario.version || '1.0.0',
      author: scenario.author || 'Unknown',
      tags: scenario.tags || [],
      initial_message: scenario.initial_message || '',
      settings: scenario.settings || {},
      tmux_sessions: layout.tmux_sessions,
      agents: agents,
      layout_descriptions: layout.layout_descriptions || {}
    };
    
    // Load instruction files for agents
    for (const [agentName, agentConfig] of Object.entries(agents)) {
      if (agentConfig.instruction_file) {
        const instructionPath = path.join(scenarioPath, agentConfig.instruction_file);
        if (await fs.pathExists(instructionPath)) {
          try {
            agentConfig.instructions = await fs.readFile(instructionPath, 'utf8');
          } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not load instructions for ${agentName}: ${error.message}`));
          }
        }
      }
    }
    
    return completeConfig;
    
  } catch (error) {
    throw new Error(`Failed to load scenario ${scenarioName}: ${error.message}`);
  }
}

/**
 * Load and validate YAML file
 * @param {string} filePath - Path to YAML file
 * @param {string} description - Description for error messages
 * @returns {Object} Parsed YAML object
 */
async function loadYamlFile(filePath, description) {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`Missing ${description} file: ${filePath}`);
  }
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = yaml.load(content);
    return parsed;
  } catch (error) {
    throw new Error(`Invalid YAML in ${description} file ${filePath}: ${error.message}`);
  }
}

/**
 * Get list of available external scenarios
 * @returns {Array} List of scenario names that have external configurations
 */
async function getAvailableExternalScenarios() {
  const scenariosDir = './scenarios';
  
  if (!await fs.pathExists(scenariosDir)) {
    return [];
  }
  
  try {
    const dirs = await fs.readdir(scenariosDir);
    const scenarios = [];
    
    for (const dir of dirs) {
      const dirPath = path.join(scenariosDir, dir);
      const stat = await fs.stat(dirPath);
      
      if (stat.isDirectory()) {
        // Check if required YAML files exist
        const requiredFiles = ['scenario.yaml', 'agents.yaml', 'layout.yaml'];
        const hasAllFiles = await Promise.all(
          requiredFiles.map(file => fs.pathExists(path.join(dirPath, file)))
        );
        
        if (hasAllFiles.every(exists => exists)) {
          scenarios.push(dir);
        }
      }
    }
    
    return scenarios;
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not scan scenarios directory: ${error.message}`));
    return [];
  }
}

/**
 * Validate external scenario configuration
 * @param {string} scenarioName - Name of the scenario to validate
 * @returns {Object} Validation result
 */
async function validateExternalScenario(scenarioName) {
  const errors = [];
  const warnings = [];
  
  try {
    const config = await loadScenarioFromFiles(scenarioName);
    
    // Validate required fields
    if (!config.name) errors.push('Missing scenario name');
    if (!config.tmux_sessions) errors.push('Missing tmux_sessions configuration');
    if (!config.agents) errors.push('Missing agents configuration');
    
    // Validate agents vs sessions consistency
    if (config.agents && config.tmux_sessions) {
      for (const [agentName, agentConfig] of Object.entries(config.agents)) {
        const sessionName = agentConfig.session;
        if (!config.tmux_sessions[sessionName]) {
          errors.push(`Agent ${agentName} references non-existent session: ${sessionName}`);
        }
      }
    }
    
    // Check for instruction files
    for (const [agentName, agentConfig] of Object.entries(config.agents || {})) {
      if (agentConfig.instruction_file) {
        const instructionPath = path.join('./scenarios', scenarioName, agentConfig.instruction_file);
        if (!await fs.pathExists(instructionPath)) {
          warnings.push(`Instruction file not found for ${agentName}: ${agentConfig.instruction_file}`);
        }
      } else {
        warnings.push(`No instruction file specified for agent: ${agentName}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings: [],
      config: null
    };
  }
}

/**
 * Resolve agent aliases to primary agent names
 * @param {Object} agents - Agents configuration
 * @param {string} requestedAgent - Requested agent name (might be alias)
 * @returns {string|null} Primary agent name or null if not found
 */
function resolveAgentAlias(agents, requestedAgent) {
  // Direct match
  if (agents[requestedAgent]) {
    return requestedAgent;
  }
  
  // Check aliases
  for (const [agentName, agentConfig] of Object.entries(agents)) {
    if (agentConfig.aliases && agentConfig.aliases.includes(requestedAgent)) {
      return agentName;
    }
  }
  
  return null;
}

/**
 * Get agent configuration with alias resolution
 * @param {Object} agents - Agents configuration
 * @param {string} requestedAgent - Requested agent name (might be alias)
 * @returns {Object|null} Agent configuration or null if not found
 */
function getAgentConfig(agents, requestedAgent) {
  const resolvedAgent = resolveAgentAlias(agents, requestedAgent);
  return resolvedAgent ? agents[resolvedAgent] : null;
}

/**
 * Create external scenario files for existing scenario
 * @param {string} scenarioName - Name of the scenario
 * @param {Object} scenarioConfig - Existing scenario configuration
 */
async function createExternalFiles(scenarioName, scenarioConfig) {
  const scenarioPath = path.join('./scenarios', scenarioName);
  
  // Ensure scenario directory exists
  await fs.ensureDir(scenarioPath);
  await fs.ensureDir(path.join(scenarioPath, 'instructions'));
  
  // Create scenario.json
  const scenarioMeta = {
    name: scenarioConfig.name,
    description: scenarioConfig.description,
    version: "2.0.0",
    author: "Claude Agents",
    tags: getTags(scenarioName),
    initial_message: getInitialMessage(scenarioConfig),
    settings: {
      auto_start_claude: true,
      message_wait_time: 0.5,
      enable_logging: true
    }
  };
  
  await fs.writeFile(path.join(scenarioPath, 'scenario.yaml'), yaml.dump(scenarioMeta, { indent: 2 }));
  
  // Create agents.yaml
  const agentsConfig = {};
  for (const [agentName, agentData] of Object.entries(scenarioConfig.agents || {})) {
    agentsConfig[agentName] = {
      role: agentData.role,
      session: agentData.session,
      pane: agentData.pane,
      responsibilities: getResponsibilities(agentName),
      communication_style: getCommunicationStyle(agentName),
      color: getColor(agentName, scenarioConfig),
      instruction_file: `instructions/${agentName}.md`
    };
    
    // No aliases needed for CMO
  }
  
  await fs.writeFile(path.join(scenarioPath, 'agents.yaml'), yaml.dump(agentsConfig, { indent: 2 }));
  
  // Create layout.yaml
  const layoutConfig = {
    tmux_sessions: scenarioConfig.tmux_sessions,
    layout_descriptions: {
      "tiled": "2x2 grid layout for 4 panes",
      "even-horizontal": "Horizontal split for 2 panes",
      "even-vertical": "Vertical split for 2 panes",
      "main-horizontal": "Main pane with horizontal splits"
    }
  };
  
  await fs.writeFile(path.join(scenarioPath, 'layout.yaml'), yaml.dump(layoutConfig, { indent: 2 }));
  
  console.log(chalk.green(`✓ Created external configuration files for scenario: ${scenarioName}`));
}

/**
 * Helper functions for creating external files
 */
function getTags(scenarioName) {
  const tagMap = {
    'business-strategy': ['strategy', 'executive', 'planning'],
    'collaborative-coding': ['development', 'coding', 'teamwork'],
    'market-analysis': ['research', 'analysis', 'market'],
    'hello-world': ['demo', 'basic', 'tutorial']
  };
  return tagMap[scenarioName] || ['general'];
}

function getInitialMessage(scenarioConfig) {
  return scenarioConfig.initial_command || 'シナリオを開始してください';
}

function getResponsibilities(agentName) {
  const responsibilityMap = {
    'ceo': ['戦略方針決定', '全体統括', '意思決定'],
    'cto': ['技術的実現可能性', 'アーキテクチャ設計', '技術投資'],
    'cfo': ['財務分析', 'ROI計算', '予算管理'],
    'cmo': ['市場分析', '競合調査', 'マーケティング戦略'],
    'product_manager': ['プロダクト戦略', '要件定義', 'ロードマップ'],
    'data_analyst': ['データ分析', 'KPI設計', 'レポート作成']
  };
  return responsibilityMap[agentName] || ['専門業務の実行'];
}

function getCommunicationStyle(agentName) {
  const styleMap = {
    'ceo': 'リーダーシップを発揮し、戦略的思考で経営判断を下す',
    'cto': '技術的根拠とデータに基づいた提案を行う',
    'cfo': '数値とデータで証明された財務的観点で判断する',
    'cmo': '市場と顧客の視点から戦略を評価し、具体的施策を提案',
    'product_manager': '顧客ニーズとビジネス価値を結びつけたプロダクト提案',
    'data_analyst': 'データに基づいた洞察と定量的分析で意思決定を支援'
  };
  return styleMap[agentName] || '専門知識を活かした建設的な議論を行う';
}

function getColor(agentName, scenarioConfig) {
  // Try to get color from tmux_sessions panes
  if (scenarioConfig.tmux_sessions) {
    for (const session of Object.values(scenarioConfig.tmux_sessions)) {
      if (session.panes) {
        const pane = session.panes.find(p => p.role === agentName);
        if (pane && pane.color) {
          return pane.color;
        }
      }
    }
  }
  
  // Default colors
  const colorMap = {
    'ceo': 'magenta',
    'cto': 'red', 
    'cfo': 'green',
    'cmo': 'yellow',
    'product_manager': 'blue',
    'data_analyst': 'cyan'
  };
  return colorMap[agentName] || 'white';
}

module.exports = {
  loadScenarioFromFiles,
  getAvailableExternalScenarios,
  validateExternalScenario,
  resolveAgentAlias,
  getAgentConfig,
  createExternalFiles
};