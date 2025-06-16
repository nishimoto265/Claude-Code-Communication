/**
 * Claude Agents - Multi-agent collaboration system for Claude Code
 * Main library entry point
 */

// Core modules
const configManager = require('./core/config-manager');
const scenarioManager = require('./core/scenario-manager');

// Commands
const initCommand = require('./commands/init');
const startCommand = require('./commands/start');
const sendCommand = require('./commands/send');
const switchCommand = require('./commands/switch');
const statusCommand = require('./commands/status');

// Utilities
const dependencyChecker = require('./utils/dependency-checker');

// Main API
const ClaudeAgents = {
  // Configuration management
  config: {
    load: configManager.loadConfig,
    save: configManager.saveConfig,
    getCurrentScenario: configManager.getCurrentScenario,
    setCurrentScenario: configManager.setCurrentScenario,
    getScenarioConfig: configManager.getScenarioConfig,
    updateScenarioConfig: configManager.updateScenarioConfig,
    getSettings: configManager.getSettings,
    updateSettings: configManager.updateSettings,
    initialize: configManager.initializeConfig,
    validate: configManager.validateConfig
  },

  // Scenario management
  scenarios: {
    list: scenarioManager.listScenarios,
    reset: scenarioManager.resetEnvironment,
    getConfig: scenarioManager.getScenarioConfig
  },

  // Commands
  commands: {
    init: initCommand,
    start: startCommand,
    send: sendCommand,
    switch: switchCommand,
    status: statusCommand
  },

  // Utilities
  utils: {
    checkDependencies: dependencyChecker.checkDependencies,
    fullSystemCheck: dependencyChecker.fullSystemCheck
  },

  // Convenience methods
  async init(options = {}) {
    return await initCommand(options);
  },

  async start(scenario, options = {}) {
    return await startCommand(scenario, options);
  },

  async send(agent, message, options = {}) {
    return await sendCommand(agent, message, options);
  },

  async switch(scenario, options = {}) {
    return await switchCommand(scenario, options);
  },

  async status(options = {}) {
    return await statusCommand(options);
  },

  async listScenarios(options = {}) {
    return await scenarioManager.listScenarios(options);
  },

  async reset(options = {}) {
    return await scenarioManager.resetEnvironment(options);
  }
};

// For CommonJS compatibility
module.exports = ClaudeAgents;

// For ES6 module compatibility
module.exports.default = ClaudeAgents;