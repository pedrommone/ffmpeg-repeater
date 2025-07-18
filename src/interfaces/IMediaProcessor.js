/**
 * Interface for media processing operations
 */
export class IMediaProcessor {
  /**
   * Process media (loop and merge video with audio)
   * @param {string} videoPath - Video file path
   * @param {string} audioPath - Audio file path
   * @param {number} durationMinutes - Target duration in minutes
   * @param {string} outputPath - Optional output path
   * @returns {Promise<string>} Path to processed output file
   */
  async processMedia(videoPath, audioPath, durationMinutes, outputPath = null) {
    throw new Error('Method processMedia must be implemented');
  }

  /**
   * Get output file metadata
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File metadata
   */
  async getOutputMetadata(filePath) {
    throw new Error('Method getOutputMetadata must be implemented');
  }

  /**
   * Clean up temporary files
   * @param {string[]} filePaths - Array of file paths to clean up
   * @returns {Promise<void>}
   */
  async cleanup(filePaths) {
    throw new Error('Method cleanup must be implemented');
  }
} 