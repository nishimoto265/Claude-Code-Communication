/**
 * Agent management for claude-agents
 */

const fs = require('fs-extra');
const path = require('path');
const scenarioLoader = require('./scenario-loader');

/**
 * Get current agent mapping
 */
async function getAgentMapping() {
  try {
    // Try JSON format first (preferred for Node.js)
    const jsonPath = './tmp/agent_mapping.json';
    if (await fs.pathExists(jsonPath)) {
      return await fs.readJSON(jsonPath);
    }
    
    // Fallback to shell script format (for compatibility)
    const shellPath = './tmp/agent_mapping.sh';
    if (await fs.pathExists(shellPath)) {
      return await parseShellMapping(shellPath);
    }
    
    return {};
  } catch (error) {
    throw new Error(`Failed to get agent mapping: ${error.message}`);
  }
}

/**
 * Save agent mapping in multiple formats
 */
async function saveAgentMapping(mapping) {
  try {
    await fs.ensureDir('./tmp');
    
    // Save as JSON (preferred for Node.js)
    const jsonPath = './tmp/agent_mapping.json';
    await fs.writeJSON(jsonPath, mapping, { spaces: 2 });
    
    // Save as shell script (for compatibility with bash scripts)
    const shellPath = './tmp/agent_mapping.sh';
    await generateShellMapping(mapping, shellPath);
    
  } catch (error) {
    throw new Error(`Failed to save agent mapping: ${error.message}`);
  }
}

/**
 * Generate agent mapping for scenario
 */
async function generateAgentMappingForScenario(scenario, scenarioConfig) {
  try {
    const mapping = {};
    
    // Generate mapping based on scenario configuration
    for (const [agentName, agentConfig] of Object.entries(scenarioConfig.agents)) {
      const sessionName = agentConfig.session;
      const paneIndex = agentConfig.pane;
      
      // Handle different tmux target formats
      const sessionConfig = scenarioConfig.tmux_sessions[sessionName];
      if (sessionConfig && sessionConfig.window_name) {
        // Use window name format: session:window.pane
        mapping[agentName] = `${sessionName}:${sessionConfig.window_name}.${paneIndex + 1}`;
      } else {
        // Use simple format: session:0.pane
        mapping[agentName] = `${sessionName}:0.${paneIndex}`;
      }
    }
    
    await saveAgentMapping(mapping);
    return mapping;
  } catch (error) {
    throw new Error(`Failed to generate agent mapping: ${error.message}`);
  }
}

/**
 * Parse shell script mapping format
 */
async function parseShellMapping(shellPath) {
  try {
    const content = await fs.readFile(shellPath, 'utf8');
    const mapping = {};
    
    // Extract agent mappings from shell function
    const functionMatch = content.match(/get_agent_target\(\)\s*{([\s\S]*?)}/);
    if (functionMatch) {
      const functionBody = functionMatch[1];
      const caseMatches = functionBody.matchAll(/"([^"]+)"\)\s*echo\s*"([^"]+)"/g);
      
      for (const match of caseMatches) {
        const [, agent, target] = match;
        if (target.trim()) {
          mapping[agent] = target;
        }
      }
    }
    
    return mapping;
  } catch (error) {
    throw new Error(`Failed to parse shell mapping: ${error.message}`);
  }
}

/**
 * Generate shell script mapping format
 */
async function generateShellMapping(mapping, shellPath) {
  try {
    const caseLines = [];
    
    for (const [agent, target] of Object.entries(mapping)) {
      caseLines.push(`        "${agent}") echo "${target}" ;;`);
    }
    
    const shellContent = `#!/bin/bash
# Auto-generated agent mapping for tmux targets

get_agent_target() {
    case "$1" in
${caseLines.join('\n')}
        *) echo "" ;;
    esac
}

# Export function for sourcing
export -f get_agent_target 2>/dev/null || true
`;
    
    await fs.writeFile(shellPath, shellContent);
    await fs.chmod(shellPath, 0o755);
  } catch (error) {
    throw new Error(`Failed to generate shell mapping: ${error.message}`);
  }
}

/**
 * Validate agent mapping
 */
async function validateAgentMapping(mapping) {
  const errors = [];
  
  for (const [agent, target] of Object.entries(mapping)) {
    // Check agent name format
    if (!agent || typeof agent !== 'string') {
      errors.push(`Invalid agent name: ${agent}`);
      continue;
    }
    
    // Check target format
    if (!target || typeof target !== 'string') {
      errors.push(`Invalid target for agent ${agent}: ${target}`);
      continue;
    }
    
    // Check tmux target format (session:window.pane or session:0.pane)
    const targetRegex = /^[a-zA-Z0-9_-]+:(([a-zA-Z0-9_-]+\.\d+)|(\d+\.\d+))$/;
    if (!targetRegex.test(target)) {
      errors.push(`Invalid tmux target format for agent ${agent}: ${target}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get agent list with details
 */
async function getAgentList() {
  try {
    const mapping = await getAgentMapping();
    const agents = [];
    
    for (const [name, target] of Object.entries(mapping)) {
      const [session, windowPane] = target.split(':');
      const [window, pane] = windowPane.includes('.') 
        ? windowPane.split('.') 
        : ['0', windowPane];
      
      agents.push({
        name,
        target,
        session,
        window,
        pane: parseInt(pane)
      });
    }
    
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(`Failed to get agent list: ${error.message}`);
  }
}

/**
 * Find agent by name with alias support
 */
async function findAgent(agentName, scenarioConfig = null) {
  try {
    const mapping = await getAgentMapping();
    
    // If scenario config provided, try alias resolution
    if (scenarioConfig && scenarioConfig.agents) {
      const resolvedAgent = scenarioLoader.resolveAgentAlias(scenarioConfig.agents, agentName);
      if (resolvedAgent && mapping[resolvedAgent]) {
        return { name: resolvedAgent, target: mapping[resolvedAgent] };
      }
    }
    
    // Exact match first
    if (mapping[agentName]) {
      return { name: agentName, target: mapping[agentName] };
    }
    
    // Case-insensitive search
    const lowerName = agentName.toLowerCase();
    for (const [name, target] of Object.entries(mapping)) {
      if (name.toLowerCase() === lowerName) {
        return { name, target };
      }
    }
    
    // Partial match
    for (const [name, target] of Object.entries(mapping)) {
      if (name.toLowerCase().includes(lowerName)) {
        return { name, target };
      }
    }
    
    return null;
  } catch (error) {
    throw new Error(`Failed to find agent: ${error.message}`);
  }
}

module.exports = {
  getAgentMapping,
  saveAgentMapping,
  generateAgentMappingForScenario,
  validateAgentMapping,
  getAgentList,
  findAgent
};