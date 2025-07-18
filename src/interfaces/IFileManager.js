/**
 * Interface for file management operations
 * Follows Interface Segregation Principle by focusing only on file operations
 */
export class IFileManager {
  /**
   * Ensure directories exist
   * @param {string[]} directories - Array of directory paths
   * @returns {Promise<void>}
   */
  async ensureDirectories(directories) {
    throw new Error('Method ensureDirectories must be implemented');
  }

  /**
   * Clean up files
   * @param {string[]} filePaths - Array of file paths to clean up
   * @returns {Promise<void>}
   */
  async cleanup(filePaths) {
    throw new Error('Method cleanup must be implemented');
  }

  /**
   * Get file metadata
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(filePath) {
    throw new Error('Method getFileMetadata must be implemented');
  }

  /**
   * Get media duration in seconds
   * @param {string} filePath - Media file path
   * @returns {Promise<number>} Duration in seconds
   */
  async getMediaDuration(filePath) {
    throw new Error('Method getMediaDuration must be implemented');
  }

  /**
   * Generate unique file path
   * @param {string} directory - Target directory
   * @param {string} prefix - File prefix
   * @param {string} extension - File extension
   * @returns {string} Unique file path
   */
  generateUniqueFilePath(directory, prefix, extension) {
    throw new Error('Method generateUniqueFilePath must be implemented');
  }
} 