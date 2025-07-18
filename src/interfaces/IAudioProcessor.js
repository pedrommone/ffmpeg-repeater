/**
 * Interface for audio processing operations
 * Follows Interface Segregation Principle by focusing only on audio operations
 */
export class IAudioProcessor {
  /**
   * Loop audio to specified duration
   * @param {string} inputPath - Input audio file path
   * @param {number} durationMinutes - Target duration in minutes
   * @param {string} outputPath - Optional output path
   * @returns {Promise<string>} Path to processed audio file
   */
  async loopAudio(inputPath, durationMinutes, outputPath = null) {
    throw new Error('Method loopAudio must be implemented');
  }

  /**
   * Get audio information
   * @param {string} filePath - Audio file path
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioInfo(filePath) {
    throw new Error('Method getAudioInfo must be implemented');
  }

  /**
   * Convert audio format or apply audio filters
   * @param {string} inputPath - Input audio file path
   * @param {Object} options - Audio processing options
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} Path to processed audio file
   */
  async processAudio(inputPath, options, outputPath) {
    throw new Error('Method processAudio must be implemented');
  }
} 