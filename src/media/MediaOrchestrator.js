import path from 'path';
import { logger } from '../logger.js';

/**
 * MediaOrchestrator coordinates media processing operations
 * Follows Single Responsibility Principle - only orchestrates workflows
 * Uses dependency injection (Dependency Inversion Principle)
 * Open for extension via different processor implementations (Open/Closed Principle)
 */
export class MediaOrchestrator {
  constructor(videoProcessor, audioProcessor, mediaMerger, fileManager) {
    if (!videoProcessor || !audioProcessor || !mediaMerger || !fileManager) {
      throw new Error('All processors (video, audio, merger, fileManager) are required');
    }
    
    this.videoProcessor = videoProcessor;
    this.audioProcessor = audioProcessor;
    this.mediaMerger = mediaMerger;
    this.fileManager = fileManager;
  }

  /**
   * Complete media processing pipeline: loop video and audio, then merge
   * This is the main orchestration method
   */
  async processMedia(videoPath, audioPath, durationMinutes, outputPath = null) {
    let loopedVideoPath = null;
    let loopedAudioPath = null;

    try {
      logger.info(`Starting media processing pipeline for ${durationMinutes} minutes`);

      // Loop video and audio in parallel for maximum speed
      logger.info('Starting parallel video and audio looping...');
      [loopedVideoPath, loopedAudioPath] = await Promise.all([
        this.videoProcessor.loopVideo(videoPath, durationMinutes),
        this.audioProcessor.loopAudio(audioPath, durationMinutes)
      ]);

      // Merge the looped video and audio
      logger.info('Merging looped video and audio...');
      const finalOutputPath = await this.mediaMerger.mergeVideoAudio(
        loopedVideoPath, 
        loopedAudioPath, 
        outputPath
      );

      // Cleanup temporary files
      await this.fileManager.cleanup([loopedVideoPath, loopedAudioPath]);

      logger.info(`Media processing completed: ${finalOutputPath}`);
      return finalOutputPath;

    } catch (error) {
      logger.error('Error in media processing pipeline:', error);
      
      // Cleanup on error
      if (loopedVideoPath || loopedAudioPath) {
        await this.fileManager.cleanup([loopedVideoPath, loopedAudioPath].filter(Boolean));
      }
      
      throw error;
    }
  }

  /**
   * Get comprehensive output metadata combining video and file information
   */
  async getOutputMetadata(filePath) {
    try {
      const [fileMetadata, videoInfo] = await Promise.all([
        this.fileManager.getFileMetadata(filePath),
        this.videoProcessor.getVideoInfo(filePath)
      ]);
      
      return {
        ...fileMetadata,
        duration: videoInfo.duration,
        resolution: `${videoInfo.width}x${videoInfo.height}`,
        codec: videoInfo.codec,
        fps: videoInfo.fps
      };
    } catch (error) {
      logger.error('Error getting output metadata:', error);
      return { filePath, error: error.message };
    }
  }

  /**
   * Initialize required directories
   */
  async initialize(outputDir, tempDir) {
    await this.fileManager.ensureDirectories([outputDir, tempDir]);
  }

  /**
   * Process video with custom filters
   */
  async processVideoWithFilters(inputPath, filters, outputPath = null) {
    if (!outputPath) {
      outputPath = this.fileManager.generateUniqueFilePath(
        path.dirname(inputPath), 'processed_video', 'mp4'
      );
    }
    
    return await this.videoProcessor.applyFilters(inputPath, filters, outputPath);
  }

  /**
   * Process audio with custom options
   */
  async processAudioWithOptions(inputPath, options, outputPath = null) {
    if (!outputPath) {
      outputPath = this.fileManager.generateUniqueFilePath(
        path.dirname(inputPath), 'processed_audio', 'wav'
      );
    }
    
    return await this.audioProcessor.processAudio(inputPath, options, outputPath);
  }

  /**
   * Merge multiple videos
   */
  async mergeMultipleVideos(videoPaths, outputPath) {
    return await this.mediaMerger.mergeVideos(videoPaths, outputPath);
  }

  /**
   * Merge multiple audio files
   */
  async mergeMultipleAudios(audioPaths, outputPath) {
    return await this.mediaMerger.mergeAudios(audioPaths, outputPath);
  }

  /**
   * Clean up files
   */
  async cleanup(filePaths) {
    return await this.fileManager.cleanup(filePaths);
  }
} 