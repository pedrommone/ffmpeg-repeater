/**
 * Interface for workflow notification operations
 * Follows Single Responsibility Principle by separating workflow notifications
 * from job management operations
 */
export class IWorkflowNotifier {
  /**
   * Notify external workflow of job completion
   * @param {number} jobId - Job ID
   * @param {string} notificationUrl - URL to notify
   * @param {string} outputUrl - URL of completed output
   * @param {Object} additionalData - Additional notification data
   * @returns {Promise<boolean>} Success status
   */
  async notifyJobCompletion(jobId, notificationUrl, outputUrl, additionalData = {}) {
    throw new Error('Method notifyJobCompletion must be implemented');
  }

  /**
   * Notify external workflow of job failure
   * @param {number} jobId - Job ID
   * @param {string} notificationUrl - URL to notify
   * @param {Error} error - Error that caused failure
   * @param {Object} additionalData - Additional notification data
   * @returns {Promise<boolean>} Success status
   */
  async notifyJobFailure(jobId, notificationUrl, error, additionalData = {}) {
    throw new Error('Method notifyJobFailure must be implemented');
  }

  /**
   * Notify external workflow of job progress
   * @param {number} jobId - Job ID
   * @param {string} notificationUrl - URL to notify
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} currentStep - Current processing step
   * @param {Object} additionalData - Additional notification data
   * @returns {Promise<boolean>} Success status
   */
  async notifyJobProgress(jobId, notificationUrl, progress, currentStep = '', additionalData = {}) {
    throw new Error('Method notifyJobProgress must be implemented');
  }
} 