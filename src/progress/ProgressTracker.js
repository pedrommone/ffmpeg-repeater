import { logger } from '../logger.js';

/**
 * Progress tracking class - implements Single Responsibility Principle
 * Responsible only for tracking and reporting job progress
 */
export class ProgressTracker {
  constructor(jobManager) {
    this.jobManager = jobManager;
    this.currentJob = null;
    this.stages = {
      VALIDATION: { progress: 5, name: 'Validating job data' },
      DOWNLOAD_START: { progress: 10, name: 'Starting download' },
      DOWNLOAD_COMPLETE: { progress: 25, name: 'Media downloaded, starting processing' },
      PROCESSING_START: { progress: 30, name: 'Processing media files' },
      PROCESSING_COMPLETE: { progress: 90, name: 'Processing complete, uploading to storage' },
      UPLOAD_COMPLETE: { progress: 95, name: 'Upload complete, finalizing' },
      COMPLETE: { progress: 100, name: 'Job completed successfully' }
    };
  }

  /**
   * Start tracking progress for a job
   * @param {Object} job - Job object
   */
  startTracking(job) {
    this.currentJob = job;
    this.startTime = Date.now();
    logger.info(`Started progress tracking for job ${job.id}`);
  }

  /**
   * Update progress to a specific stage
   * @param {string} stage - Stage name from this.stages
   * @param {Object} additionalData - Additional data to log
   */
  async updateStage(stage, additionalData = {}) {
    if (!this.currentJob) {
      logger.warn('No job being tracked for progress update');
      return;
    }

    const stageInfo = this.stages[stage];
    if (!stageInfo) {
      logger.warn(`Unknown progress stage: ${stage}`);
      return;
    }

    const elapsedMs = Date.now() - this.startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);

    logger.info(`Job ${this.currentJob.id} progress: ${stageInfo.progress}% - ${stageInfo.name} (${elapsedSeconds}s elapsed)`);

    if (additionalData.details) {
      logger.debug(`Additional details:`, additionalData.details);
    }

    // Update job progress in database
    try {
      await this.jobManager.updateProgress(
        this.currentJob.id, 
        stageInfo.progress, 
        stageInfo.name
      );
    } catch (error) {
      logger.error(`Failed to update progress for job ${this.currentJob.id}:`, error);
    }
  }

  /**
   * Update with custom progress and message
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  async updateCustom(progress, message) {
    if (!this.currentJob) {
      logger.warn('No job being tracked for progress update');
      return;
    }

    const elapsedMs = Date.now() - this.startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);

    logger.info(`Job ${this.currentJob.id} progress: ${progress}% - ${message} (${elapsedSeconds}s elapsed)`);

    try {
      await this.jobManager.updateProgress(this.currentJob.id, progress, message);
    } catch (error) {
      logger.error(`Failed to update progress for job ${this.currentJob.id}:`, error);
    }
  }

  /**
   * Mark job as completed and calculate final metrics
   * @param {Object} result - Job completion result
   */
  async complete(result = {}) {
    if (!this.currentJob) {
      logger.warn('No job being tracked for completion');
      return;
    }

    const totalTimeMs = Date.now() - this.startTime;
    const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2);

    const metrics = {
      jobId: this.currentJob.id,
      totalProcessingTime: totalTimeSeconds,
      completedAt: new Date().toISOString(),
      ...result
    };

    logger.info(`✅ Job ${this.currentJob.id} completed successfully in ${totalTimeSeconds}s`);
    
    if (result.outputUrl) {
      logger.info(`Output uploaded to: ${result.outputUrl}`);
    }

    if (result.fileSize) {
      const sizeMB = (result.fileSize / (1024 * 1024)).toFixed(2);
      logger.info(`Output file size: ${sizeMB}MB`);
    }

    await this.updateStage('COMPLETE', { details: metrics });

    // Reset tracking
    this.currentJob = null;
    this.startTime = null;

    return metrics;
  }

  /**
   * Mark job as failed and log error details
   * @param {Error} error - Error that caused failure
   */
  async fail(error) {
    if (!this.currentJob) {
      logger.warn('No job being tracked for failure');
      return;
    }

    const totalTimeMs = Date.now() - this.startTime;
    const totalTimeSeconds = (totalTimeMs / 1000).toFixed(2);

    const errorInfo = {
      jobId: this.currentJob.id,
      error: error.message,
      failedAfter: totalTimeSeconds,
      failedAt: new Date().toISOString()
    };

    logger.error(`❌ Job ${this.currentJob.id} failed after ${totalTimeSeconds}s: ${error.message}`);

    // Reset tracking
    this.currentJob = null;
    this.startTime = null;

    return errorInfo;
  }

  /**
   * Get current job being tracked
   */
  getCurrentJob() {
    return this.currentJob;
  }

  /**
   * Get elapsed time for current job
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get all available stages
   */
  getStages() {
    return { ...this.stages };
  }
} 