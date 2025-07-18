import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import { IJobManager } from './interfaces/IJobManager.js';
import { config } from './config/Config.js';

/**
 * Supabase-based job manager implementation
 * Follows Single Responsibility Principle - only handles database operations
 * Uses dependency injection for workflow notifications (Dependency Inversion Principle)
 */
class SupabaseJobManager extends IJobManager {
  constructor(configOverride = null, workflowNotifier = null) {
    super();
    this.config = configOverride || config.getComponentConfig('supabase');
    this.workflowNotifier = workflowNotifier; // Optional dependency injection
    this.supabase = null;
    this.init();
  }

  init() {
    if (!this.config.url || !this.config.anonKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    this.supabase = createClient(this.config.url, this.config.anonKey);
    logger.info('Supabase client initialized');
  }

  /**
   * Get a single job with status 'waiting_render' and update it to 'rendering'
   * Uses a transaction-like approach to prevent race conditions
   */
  async getAndClaimJob() {
    try {
      logger.info('Looking for available jobs...');

      // Get jobs that are ready to be processed, excluding failed and completed jobs
      const { data: jobs, error: fetchError } = await this.supabase
        .from('dark_channel_soundtrack_videos')
        .select('*')
        .in('status', ['waiting_render']) // Only jobs waiting to be rendered
        .is('final_video_url', null) // Exclude jobs that have already been processed (have final output)
        .order('id', { ascending: true })
        .limit(1);

      if (fetchError) {
        logger.error('Error fetching jobs:', fetchError);
        return null;
      }

      if (!jobs || jobs.length === 0) {
        logger.debug('No jobs available for rendering');
        return null;
      }

      const job = jobs[0];
      logger.info(`Found job ${job.id}, attempting to claim it...`);

      // Try to update the job status to 'rendering'
      // This helps prevent race conditions if multiple workers are running
      const { data: updatedJob, error: updateError } = await this.supabase
        .from('dark_channel_soundtrack_videos')
        .update({
          status: 'rendering',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .eq('status', 'waiting_render') // Only update if still waiting to be rendered
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating job status:', updateError);
        return null;
      }

      if (!updatedJob) {
        logger.warn(`Job ${job.id} was claimed by another worker`);
        return null;
      }

      logger.info(`Successfully claimed job ${updatedJob.id}`);
      return updatedJob;

    } catch (error) {
      logger.error('Error in getAndClaimJob:', error);
      return null;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const { data, error } = await this.supabase
        .from('dark_channel_soundtrack_videos')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        logger.error(`Error updating job ${jobId} to ${status}:`, error);
        return false;
      }

      logger.info(`Job ${jobId} updated to ${status}`);
      return true;

    } catch (error) {
      logger.error(`Error updating job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Mark job as completed with output file information
   * Uses dependency injection for workflow notifications (Dependency Inversion Principle)
   */
  async completeJob(jobId, outputUrl, metadata = {}) {
    try {
      // First get the job to access waiting_node_url
      const job = await this.getJobById(jobId);
      if (!job) {
        logger.error(`Job ${jobId} not found when completing`);
        return false;
      }

      // Update job status to rendered
      const updateSuccess = await this.updateJobStatus(jobId, 'rendered', {
        final_video_url: outputUrl,
        updated_at: new Date().toISOString()
      });

      if (!updateSuccess) {
        logger.error(`Failed to update job ${jobId} status to rendered`);
        return false;
      }

      // Trigger workflow notification if waiting_node_url is present and notifier is available
      if (job.waiting_node_url && this.workflowNotifier) {
        await this.workflowNotifier.notifyJobCompletion(
          jobId, 
          job.waiting_node_url, 
          outputUrl, 
          metadata
        );
      } else if (job.waiting_node_url && !this.workflowNotifier) {
        logger.warn(`Job ${jobId} has waiting_node_url but no workflow notifier configured`);
      } else {
        logger.debug(`Job ${jobId} has no waiting_node_url, skipping workflow notification`);
      }

      return true;

    } catch (error) {
      logger.error(`Error completing job ${jobId}:`, error);
      return false;
    }
  }



  /**
   * Mark job as failed with error information
   * Uses dependency injection for workflow notifications (Dependency Inversion Principle)
   */
  async failJob(jobId, error) {
    try {
      // First get the job to access waiting_node_url for potential notification
      const job = await this.getJobById(jobId);
      
      // Update status to failed
      const updateSuccess = await this.updateJobStatus(jobId, 'failed', {
        updated_at: new Date().toISOString()
      });

      // Optionally notify workflow about failure if notifier is available
      if (job && job.waiting_node_url && this.workflowNotifier) {
        await this.workflowNotifier.notifyJobFailure(jobId, job.waiting_node_url, error);
      }

      return updateSuccess;
    } catch (failureError) {
      logger.error(`Error in failJob for ${jobId}:`, failureError);
      // Fallback to basic status update
      return this.updateJobStatus(jobId, 'failed', {
        updated_at: new Date().toISOString()
      });
    }
  }

  /**
   * Update job progress (simplified for this schema)
   */
  async updateProgress(jobId, progress, currentStep = '') {
    logger.info(`Job ${jobId} progress: ${progress}% - ${currentStep}`);
    // Only log progress, don't update job status
    // Job status should be managed separately by completeJob/failJob methods
    return true;
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId) {
    try {
      const { data, error } = await this.supabase
        .from('dark_channel_soundtrack_videos')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        logger.error(`Error fetching job ${jobId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error(`Error getting job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('dark_channel_soundtrack_videos')
        .select('*')
        .eq('status', status)
        .order('id', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error(`Error fetching jobs with status ${status}:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error(`Error getting jobs by status ${status}:`, error);
      return [];
    }
  }
}

export default SupabaseJobManager; 