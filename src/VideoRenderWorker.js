import { logger } from './logger.js';
import { JobValidator } from './validators/JobValidator.js';
import { ProgressTracker } from './progress/ProgressTracker.js';
import { config } from './config/Config.js';

/**
 * Refactored VideoRenderWorker - implements Single Responsibility Principle
 * Responsible only for orchestrating the video rendering workflow
 */
export class VideoRenderWorker {
  constructor(dependencies = {}) {
    // Dependency injection for better testability and flexibility
    this.jobManager = dependencies.jobManager;
    this.downloader = dependencies.downloader;
    this.processor = dependencies.processor;
    this.uploader = dependencies.uploader;
    
    // Specialized components for single responsibilities
    this.validator = new JobValidator(config);
    this.progressTracker = new ProgressTracker(this.jobManager);
    
    this.config = config;
    
    this.validateDependencies();
  }

  /**
   * Validate all required dependencies are provided
   */
  validateDependencies() {
    const requiredDeps = ['jobManager', 'downloader', 'processor', 'uploader'];
    const missingDeps = requiredDeps.filter(dep => !this[dep]);
    
    if (missingDeps.length > 0) {
      throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}`);
    }
    
    logger.info('All dependencies validated successfully');
  }

  /**
   * Start the batch processing workflow
   */
  async start() {
    logger.info('Video Render Worker starting...');
    
    // Validate configuration
    this.config.validate();
    
    // Check for FFmpeg availability
    await this.checkFFmpegAvailability();
    
    // Process all available jobs and exit
    const stats = await this.processAllJobs();
    
    logger.info('All jobs processed. Exiting...');
    return stats;
  }

  /**
   * Check FFmpeg availability
   */
  async checkFFmpegAvailability() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('ffmpeg -version');
      logger.info('FFmpeg is available:', stdout.split('\n')[0]);
    } catch (error) {
      logger.error('FFmpeg not found. Please install FFmpeg and ensure it\'s in your PATH');
      throw new Error('FFmpeg not available');
    }
  }

  /**
   * Process all available jobs in batch mode
   */
  async processAllJobs() {
    let totalProcessed = 0;
    let totalFailed = 0;
    const jobResults = [];
    
    logger.info('Looking for jobs to process...');
    
    while (true) {
      try {
        // Get and claim a job
        const job = await this.jobManager.getAndClaimJob();
        
        if (!job) {
          logger.info(`No more jobs available. Processed: ${totalProcessed}, Failed: ${totalFailed}`);
          break;
        }

        logger.info(`Processing job ${job.id} (${totalProcessed + totalFailed + 1}):`, {
          id: job.id,
          channel_id: job.channel_id,
          input_video_url: job.input_video_url,
          soundtrack_url: job.soundtrack_url,
          length_minutes: job.length_minutes,
          status: job.status
        });

        try {
          const result = await this.renderVideo(job);
          totalProcessed++;
          jobResults.push({ jobId: job.id, success: true, result });
          logger.info(`✅ Job ${job.id} completed successfully`);
        } catch (error) {
          totalFailed++;
          jobResults.push({ jobId: job.id, success: false, error: error.message });
          logger.error(`❌ Job ${job.id} failed:`, error.message);
        }

      } catch (error) {
        logger.error('Error in job processing:', error);
        totalFailed++;
        jobResults.push({ jobId: 'unknown', success: false, error: error.message });
      }
    }
    
    const stats = {
      totalProcessed,
      totalFailed,
      total: totalProcessed + totalFailed,
      results: jobResults
    };
    
    logger.info(`🎉 Batch processing complete! Processed: ${totalProcessed}, Failed: ${totalFailed}`);
    return stats;
  }

  /**
   * Render a single video job - main workflow orchestration
   */
  async renderVideo(job) {
    // Start progress tracking
    this.progressTracker.startTracking(job);

    try {
      // Step 1: Validate job data
      const validation = this.validator.validateJobData(job);
      if (!validation.isValid) {
        throw new Error(this.validator.getErrorMessage(validation));
      }
      
      await this.progressTracker.updateStage('VALIDATION');
      logger.info('Processing complete video+audio job');

      // Step 2: Download media files
      await this.progressTracker.updateStage('DOWNLOAD_START');
      const { videoPath, audioPath } = await this.downloader.downloadMediaFiles(
        job.input_video_url,
        job.soundtrack_url
      );

      // Validate downloaded files
      await this.downloader.validateFile(videoPath, this.config.validation.minVideoSize);
      await this.downloader.validateFile(audioPath, this.config.validation.minAudioSize);

      await this.progressTracker.updateStage('DOWNLOAD_COMPLETE');

      // Step 3: Process media
      await this.progressTracker.updateStage('PROCESSING_START');
      const outputPath = await this.processor.processMedia(
        videoPath,
        audioPath,
        job.length_minutes
      );

      await this.progressTracker.updateStage('PROCESSING_COMPLETE');

      // Step 4: Get metadata before upload (while file still exists locally)
      const metadata = await this.processor.getOutputMetadata(outputPath);

      // Step 5: Upload result
      const uploadResult = await this.uploader.uploadAndCleanup(
        outputPath,
        job.channel_id,
        job.id,
        false // Don't keep local file after upload
      );

      await this.progressTracker.updateStage('UPLOAD_COMPLETE');

      // Step 6: Complete job with metadata
      await this.jobManager.completeJob(job.id, uploadResult.url, metadata);

      // Step 7: Cleanup
      await this.downloader.cleanup([videoPath, audioPath]);

      // Complete progress tracking
      const metrics = await this.progressTracker.complete({
        outputUrl: uploadResult.url,
        fileSize: uploadResult.size
      });

      return {
        success: true,
        outputUrl: uploadResult.url,
        fileSize: uploadResult.size,
        metrics
      };

    } catch (error) {
      // Handle failure
      await this.jobManager.failJob(job.id, error);
      await this.progressTracker.fail(error);
      
      throw error;
    }
  }

  /**
   * Get worker statistics
   */
  getStats() {
    return {
      configValid: true,
      dependencies: {
        jobManager: !!this.jobManager,
        downloader: !!this.downloader,
        processor: !!this.processor,
        uploader: !!this.uploader
      },
      currentJob: this.progressTracker.getCurrentJob(),
      elapsedTime: this.progressTracker.getElapsedTime()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Worker shutting down gracefully...');
    
    // If there's a current job, wait for it to complete or timeout
    const currentJob = this.progressTracker.getCurrentJob();
    if (currentJob) {
      logger.info(`Waiting for current job ${currentJob.id} to complete...`);
      // In a real implementation, you might want to add timeout logic here
    }
    
    logger.info('Worker shutdown complete');
  }
} 