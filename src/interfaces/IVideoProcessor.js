/**
 * Interface for video processing operations
 * Follows Interface Segregation Principle by focusing only on video operations
 */
export class IVideoProcessor {
  /**
   * Loop video to specified duration
   * @param {string} inputPath - Input video file path
   * @param {number} durationMinutes - Target duration in minutes
   * @param {string} outputPath - Optional output path
   * @returns {Promise<string>} Path to processed video file
   */
  async loopVideo(inputPath, durationMinutes, outputPath = null) {
    throw new Error('Method loopVideo must be implemented');
  }

  /**
   * Get video information
   * @param {string} filePath - Video file path
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoInfo(filePath) {
    throw new Error('Method getVideoInfo must be implemented');
  }

  /**
   * Apply video filters/transformations
   * @param {string} inputPath - Input video file path
   * @param {Object} filters - Video filters to apply
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} Path to processed video file
   */
  async applyFilters(inputPath, filters, outputPath) {
    throw new Error('Method applyFilters must be implemented');
  }
} 