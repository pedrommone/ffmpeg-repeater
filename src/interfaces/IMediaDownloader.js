/**
 * Interface for media downloading operations
 */
export class IMediaDownloader {
  /**
   * Download media files (video and audio)
   * @param {string} videoUrl - Video URL
   * @param {string} audioUrl - Audio URL
   * @returns {Promise<{videoPath: string, audioPath: string}>} Downloaded file paths
   */
  async downloadMediaFiles(videoUrl, audioUrl) {
    throw new Error('Method downloadMediaFiles must be implemented');
  }

  /**
   * Validate downloaded file
   * @param {string} filePath - File path to validate
   * @param {number} minSizeBytes - Minimum file size in bytes
   * @returns {Promise<{valid: boolean, size: number}>} Validation result
   */
  async validateFile(filePath, minSizeBytes = 1024) {
    throw new Error('Method validateFile must be implemented');
  }

  /**
   * Clean up downloaded files
   * @param {string[]} filePaths - Array of file paths to clean up
   * @returns {Promise<void>}
   */
  async cleanup(filePaths) {
    throw new Error('Method cleanup must be implemented');
  }
} 