/**
 * Interface for file upload operations
 */
export class IUploader {
  /**
   * Upload file and optionally clean up local copy
   * @param {string} filePath - Local file path
   * @param {number} channelId - Channel ID
   * @param {number} videoId - Video ID
   * @param {boolean} keepLocal - Whether to keep local file after upload
   * @returns {Promise<{success: boolean, url: string, key: string, size: number}>} Upload result
   */
  async uploadAndCleanup(filePath, channelId, videoId, keepLocal = false) {
    throw new Error('Method uploadAndCleanup must be implemented');
  }

  /**
   * Validate upload result
   * @param {Object} uploadResult - Upload result object
   * @returns {boolean} Whether upload was successful
   */
  validateUpload(uploadResult) {
    throw new Error('Method validateUpload must be implemented');
  }
} 