/**
 * File system utilities for claude-agents
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Setup required directory structure
 */
async function setupDirectories() {
  const directories = [
    './tmp',
    './logs',
    './scenarios',
    './.claude-agents'
  ];
  
  for (const dir of directories) {
    await fs.ensureDir(dir);
  }
}

/**
 * Copy template files from package to project
 */
async function copyTemplateFiles(templatePath, targetPath, options = {}) {
  if (!await fs.pathExists(templatePath)) {
    throw new Error(`Template path does not exist: ${templatePath}`);
  }
  
  const filter = (src) => {
    // Skip .DS_Store and other system files
    if (src.includes('.DS_Store') || src.includes('Thumbs.db')) {
      return false;
    }
    
    // Apply custom filter if provided
    if (options.filter && !options.filter(src)) {
      return false;
    }
    
    return true;
  };
  
  await fs.copy(templatePath, targetPath, {
    overwrite: options.overwrite || false,
    filter
  });
}

/**
 * Create a file with content, ensuring parent directories exist
 */
async function writeFileEnsure(filePath, content) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

/**
 * Read JSON file with error handling
 */
async function readJSONSafe(filePath, defaultValue = null) {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJSON(filePath);
    }
  } catch (error) {
    // Return default value on any error
  }
  
  return defaultValue;
}

/**
 * Write JSON file with formatting
 */
async function writeJSONSafe(filePath, data, options = {}) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, data, {
    spaces: options.spaces || 2,
    ...options
  });
}

/**
 * Check if file exists and is readable
 */
async function isReadable(filePath) {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if file exists and is writable
 */
async function isWritable(filePath) {
  try {
    if (await fs.pathExists(filePath)) {
      await fs.access(filePath, fs.constants.W_OK);
    } else {
      // Check if parent directory is writable
      await fs.access(path.dirname(filePath), fs.constants.W_OK);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file stats safely
 */
async function getStatsSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    return null;
  }
}

/**
 * Find files matching pattern recursively
 */
async function findFiles(directory, pattern, options = {}) {
  const results = [];
  const maxDepth = options.maxDepth || 10;
  
  async function search(dir, depth = 0) {
    if (depth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await search(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (pattern.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await search(directory);
  return results;
}

/**
 * Clean up old files based on age
 */
async function cleanupOldFiles(directory, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  if (!await fs.pathExists(directory)) {
    return { cleaned: 0, errors: 0 };
  }
  
  const now = Date.now();
  let cleaned = 0;
  let errors = 0;
  
  try {
    const files = await fs.readdir(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();
        
        if (age > maxAge) {
          await fs.remove(filePath);
          cleaned++;
        }
      } catch (error) {
        errors++;
      }
    }
  } catch (error) {
    errors++;
  }
  
  return { cleaned, errors };
}

/**
 * Create backup of file
 */
async function backupFile(filePath, backupDir = null) {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  
  const filename = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `${filename}.backup.${timestamp}`;
  
  const backupPath = backupDir 
    ? path.join(backupDir, backupFilename)
    : path.join(path.dirname(filePath), backupFilename);
  
  await fs.ensureDir(path.dirname(backupPath));
  await fs.copy(filePath, backupPath);
  
  return backupPath;
}

/**
 * Get directory size
 */
async function getDirectorySize(directory) {
  let totalSize = 0;
  
  async function calculateSize(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await calculateSize(directory);
  return totalSize;
}

module.exports = {
  setupDirectories,
  copyTemplateFiles,
  writeFileEnsure,
  readJSONSafe,
  writeJSONSafe,
  isReadable,
  isWritable,
  getStatsSafe,
  findFiles,
  cleanupOldFiles,
  backupFile,
  getDirectorySize
};