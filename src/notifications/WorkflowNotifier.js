import { logger } from '../logger.js';
import { IWorkflowNotifier } from '../interfaces/IWorkflowNotifier.js';

/**
 * Concrete implementation of workflow notifier for n8n and similar systems
 * Follows Single Responsibility Principle - only handles workflow notifications
 * Uses dependency injection for HTTP client (Dependency Inversion Principle)
 */
export class WorkflowNotifier extends IWorkflowNotifier {
  constructor(httpClient) {
    super();
    if (!httpClient) {
      throw new Error('HttpClient is required for WorkflowNotifier');
    }
    this.httpClient = httpClient;
  }

  /**
   * Notify external workflow of job completion
   */
  async notifyJobCompletion(jobId, notificationUrl, outputUrl, additionalData = {}) {
    try {
      logger.info(`Triggering workflow completion notification for job ${jobId}: ${notificationUrl}`);
      
      const payload = {
        jobId: jobId,
        status: 'rendered',
        final_video_url: outputUrl,
        completed_at: new Date().toISOString(),
        ...additionalData
      };

      const response = await this.httpClient.post(notificationUrl, payload);

      if (response.success) {
        logger.info(`Workflow completion notification sent successfully for job ${jobId}, response status: ${response.status}`);
        return true;
      } else {
        logger.error(`Failed to send workflow completion notification for job ${jobId}: ${response.error}`);
        return false;
      }

    } catch (error) {
      // Don't fail the job completion if workflow notification fails
      logger.error(`Error sending workflow completion notification for job ${jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Notify external workflow of job failure
   */
  async notifyJobFailure(jobId, notificationUrl, error, additionalData = {}) {
    try {
      logger.info(`Triggering workflow failure notification for job ${jobId}: ${notificationUrl}`);
      
      const payload = {
        jobId: jobId,
        status: 'failed',
        error_message: error.message || 'Unknown error',
        failed_at: new Date().toISOString(),
        ...additionalData
      };

      const response = await this.httpClient.post(notificationUrl, payload);

      if (response.success) {
        logger.info(`Workflow failure notification sent successfully for job ${jobId}, response status: ${response.status}`);
        return true;
      } else {
        logger.error(`Failed to send workflow failure notification for job ${jobId}: ${response.error}`);
        return false;
      }

    } catch (notificationError) {
      logger.error(`Error sending workflow failure notification for job ${jobId}:`, notificationError.message);
      return false;
    }
  }

  /**
   * Notify external workflow of job progress
   */
  async notifyJobProgress(jobId, notificationUrl, progress, currentStep = '', additionalData = {}) {
    try {
      logger.debug(`Triggering workflow progress notification for job ${jobId}: ${progress}% - ${currentStep}`);
      
      const payload = {
        jobId: jobId,
        status: 'in_progress',
        progress: progress,
        current_step: currentStep,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const response = await this.httpClient.post(notificationUrl, payload);

      if (response.success) {
        logger.debug(`Workflow progress notification sent successfully for job ${jobId}`);
        return true;
      } else {
        logger.warn(`Failed to send workflow progress notification for job ${jobId}: ${response.error}`);
        return false;
      }

    } catch (error) {
      logger.warn(`Error sending workflow progress notification for job ${jobId}:`, error.message);
      return false;
    }
  }
} 