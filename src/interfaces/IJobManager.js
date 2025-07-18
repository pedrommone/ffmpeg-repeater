/**
 * Interface for job management operations
 * Implements Dependency Inversion Principle by defining abstractions
 */
export class IJobManager {
  /**
   * Get and claim a job for processing
   * @returns {Promise<Object|null>} Job object or null if none available
   */
  async getAndClaimJob() {
    throw new Error('Method getAndClaimJob must be implemented');
  }

  /**
   * Update job status
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<boolean>} Success status
   */
  async updateJobStatus(jobId, status, additionalData = {}) {
    throw new Error('Method updateJobStatus must be implemented');
  }

  /**
   * Mark job as completed
   * @param {number} jobId - Job ID
   * @param {string} outputUrl - URL of completed output
   * @param {Object} metadata - Job metadata
   * @returns {Promise<boolean>} Success status
   */
  async completeJob(jobId, outputUrl, metadata = {}) {
    throw new Error('Method completeJob must be implemented');
  }

  /**
   * Mark job as failed
   * @param {number} jobId - Job ID
   * @param {Error} error - Error that caused failure
   * @returns {Promise<boolean>} Success status
   */
  async failJob(jobId, error) {
    throw new Error('Method failJob must be implemented');
  }

  /**
   * Update job progress
   * @param {number} jobId - Job ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} currentStep - Current processing step description
   * @returns {Promise<boolean>} Success status
   */
  async updateProgress(jobId, progress, currentStep = '') {
    throw new Error('Method updateProgress must be implemented');
  }
} 