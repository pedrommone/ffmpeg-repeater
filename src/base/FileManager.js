import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

/**
 * Base class for common file operations
 * Implements DRY principle by centralizing file management
 */
export class FileManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath = this.baseDir) {
    try {
      await fs.ensureDir(dirPath);
      logger.debug(`Directory ensured: ${dirPath}`);
      return true;
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Error getting file size for ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    return await fs.pathExists(filePath);
  }

  /**
   * Validate file (existence and minimum size)
   */
  async validateFile(filePath, minSizeBytes = 1024) {
    try {
      const exists = await this.fileExists(filePath);
      if (!exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const size = await this.getFileSize(filePath);
      if (size < minSizeBytes) {
        throw new Error(`File too small (${size} bytes): ${filePath}`);
      }

      logger.debug(`File validated: ${filePath} (${size} bytes)`);
      return { valid: true, size };
    } catch (error) {
      logger.error(`File validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up files
   */
  async cleanup(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        if (filePath && await this.fileExists(filePath)) {
          await fs.remove(filePath);
          logger.debug(`Cleaned up: ${filePath}`);
          results.push({ filePath, success: true });
        }
      } catch (error) {
        logger.error(`Error cleaning up ${filePath}:`, error);
        results.push({ filePath, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Generate unique filename with extension
   */
  generateUniqueFilename(extension, prefix = '') {
    const timestamp = Date.now();
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${uuidv4()}.${extension}`;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath)
      };
    } catch (error) {
      logger.error(`Error getting metadata for ${filePath}:`, error);
      throw error;
    }
  }
} 