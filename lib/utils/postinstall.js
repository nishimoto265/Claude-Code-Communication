#!/usr/bin/env node

/**
 * Post-install script for claude-agents
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

async function postInstall() {
  try {
    console.log(chalk.cyan('🚀 Claude Agents post-install setup'));
    console.log('');
    
    // Check if we're in a global install
    const isGlobal = __dirname.includes('node_modules') && 
                     (__dirname.includes('/usr/local/lib/node_modules') || 
                      __dirname.includes('/.npm/lib/node_modules'));
    
    if (isGlobal) {
      console.log(chalk.green('✅ Global installation detected'));
      console.log('');
      console.log(chalk.cyan('📋 Quick Start:'));
      console.log('  1. cd to your project directory');
      console.log('  2. claude-agents init');
      console.log('  3. claude-agents start');
      console.log('');
      console.log(chalk.cyan('🔗 Commands available:'));
      console.log('  • claude-agents or ca - Main CLI');
      console.log('  • claude-agents --help - Show help');
      console.log('');
    } else {
      console.log(chalk.yellow('📦 Local installation detected'));
      console.log('');
      console.log(chalk.cyan('📋 Usage options:'));
      console.log('  1. npx claude-agents init');
      console.log('  2. npm run start (if configured in scripts)');
      console.log('  3. node bin/claude-agents.js');
      console.log('');
    }
    
    // Check system dependencies
    console.log(chalk.yellow('🔍 Checking system dependencies...'));
    
    const dependencyChecker = require('./dependency-checker');
    const depCheck = await dependencyChecker.checkDependencies();
    
    if (depCheck.success) {
      console.log(chalk.green('✅ All dependencies are satisfied'));
    } else {
      console.log(chalk.yellow('⚠️ Some dependencies are missing:'));
      depCheck.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
      console.log('');
      console.log(chalk.cyan('💡 Install missing dependencies:'));
      depCheck.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
    }
    
    console.log('');
    console.log(chalk.green('🎉 Claude Agents installation complete!'));
    console.log('');
    console.log(chalk.gray('Learn more: https://github.com/claude-agents/claude-agents'));
    
  } catch (error) {
    console.error(chalk.red('❌ Post-install error:'), error.message);
    // Don't fail the installation for post-install errors
    process.exit(0);
  }
}

// Only run if called directly
if (require.main === module) {
  postInstall();
}

module.exports = postInstall;