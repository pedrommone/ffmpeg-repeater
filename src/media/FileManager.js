import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../logger.js';
import { IFileManager } from '../interfaces/IFileManager.js';

/**
 * Concrete implementation of file management operations
 * Follows Single Responsibility Principle - only handles file operations
 */
export class FileManager extends IFileManager {
  constructor() {
    super();
  }

  /**
   * Ensure directories exist
   */
  async ensureDirectories(directories) {
    try {
      for (const directory of directories) {
        await fs.ensureDir(directory);
        logger.debug(`Directory ensured: ${directory}`);
      }
    } catch (error) {
      logger.error('Error creating directories:', error);
      throw error;
    }
  }

  /**
   * Clean up files
   */
  async cleanup(filePaths) {
    try {
      for (const filePath of filePaths) {
        if (filePath && await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          logger.debug(`Cleaned up: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        filePath,
        fileSize: stats.size,
        fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      return { filePath, error: error.message };
    }
  }

  /**
   * Get media duration in seconds
   */
  async getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration;
        resolve(parseFloat(duration));
      });
    });
  }

  /**
   * Generate unique file path
   */
  generateUniqueFilePath(directory, prefix, extension) {
    const uuid = uuidv4();
    const filename = `${prefix}_${uuid}.${extension}`;
    return path.join(directory, filename);
  }
} 