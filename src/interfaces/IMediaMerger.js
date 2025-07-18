/**
 * Interface for media merging operations
 * Follows Interface Segregation Principle by focusing only on merging operations
 */
export class IMediaMerger {
  /**
   * Merge video and audio files
   * @param {string} videoPath - Input video file path
   * @param {string} audioPath - Input audio file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Merging options
   * @returns {Promise<string>} Path to merged output file
   */
  async mergeVideoAudio(videoPath, audioPath, outputPath, options = {}) {
    throw new Error('Method mergeVideoAudio must be implemented');
  }

  /**
   * Merge multiple video files
   * @param {string[]} videoPaths - Array of input video file paths
   * @param {string} outputPath - Output file path
   * @param {Object} options - Merging options
   * @returns {Promise<string>} Path to merged output file
   */
  async mergeVideos(videoPaths, outputPath, options = {}) {
    throw new Error('Method mergeVideos must be implemented');
  }

  /**
   * Merge multiple audio files
   * @param {string[]} audioPaths - Array of input audio file paths
   * @param {string} outputPath - Output file path
   * @param {Object} options - Merging options
   * @returns {Promise<string>} Path to merged output file
   */
  async mergeAudios(audioPaths, outputPath, options = {}) {
    throw new Error('Method mergeAudios must be implemented');
  }
} 