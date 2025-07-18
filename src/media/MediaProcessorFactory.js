import { logger } from '../logger.js';
import { FileManager } from './FileManager.js';
import { VideoProcessor } from './VideoProcessor.js';
import { AudioProcessor } from './AudioProcessor.js';
import { MediaMerger } from './MediaMerger.js';
import { MediaOrchestrator } from './MediaOrchestrator.js';

/**
 * Factory for creating MediaOrchestrator instances with proper dependency injection
 * Follows Factory pattern and Dependency Inversion Principle
 * Replaces static methods from old MediaProcessor class
 */
export class MediaProcessorFactory {
  /**
   * Get compression preset configurations optimized for YouTube
   * Based on official YouTube guidelines: https://support.google.com/youtube/answer/1722171
   */
  static getCompressionPresets() {
    return {
      // YouTube 4K optimized - highest quality, larger files
      'youtube-4k': {
        crf: 18,
        preset: 'slow',
        maxHeight: 2160, // 4K
        audioBitrate: '384k', // YouTube recommended stereo
        profile: 'high',
        level: '5.1',
        bframes: 2,
        gopSize: 12 // Half frame rate for 24fps
      },
      
      // YouTube 1440p optimized - high quality, medium files  
      'youtube-2k': {
        crf: 20,
        preset: 'medium',
        maxHeight: 1440, // 2K
        audioBitrate: '192k',
        profile: 'high',
        level: '5.0',
        bframes: 2,
        gopSize: 12
      },
      
      // YouTube 1080p optimized - best balance (~70-80% reduction)
      'youtube-1080p': {
        crf: 23,
        preset: 'medium',
        maxHeight: 1080, // 1080p
        audioBitrate: '128k',
        profile: 'high',
        level: '4.2',
        bframes: 2,
        gopSize: 12
      },
      
      // YouTube 720p optimized - small size, good quality (~80-90% reduction)
      'youtube-720p': {
        crf: 26,
        preset: 'medium',
        maxHeight: 720, // 720p
        audioBitrate: '96k',
        profile: 'high',
        level: '3.1',
        bframes: 2,
        gopSize: 12
      },
      
      // Legacy presets for backward compatibility
      'ultra': {
        crf: 18,
        preset: 'slow',
        maxHeight: null,
        audioBitrate: '192k',
        profile: 'high',
        level: '5.1'
      },
      'high': {
        crf: 21,
        preset: 'medium',
        maxHeight: 1440,
        audioBitrate: '128k',
        profile: 'high',
        level: '4.2'
      },
      'medium': {
        crf: 23,
        preset: 'medium',
        maxHeight: 1080,
        audioBitrate: '96k',
        profile: 'high',
        level: '4.0'
      },
      'small': {
        crf: 28,
        preset: 'fast',
        maxHeight: 720,
        audioBitrate: '64k',
        profile: 'main',
        level: '3.1'
      },
      'tiny': {
        crf: 32,
        preset: 'fast',
        maxHeight: 480,
        audioBitrate: '48k',
        profile: 'main',
        level: '3.0'
      }
    };
  }

  /**
   * Create MediaOrchestrator with preset compression settings
   * Uses dependency injection to wire all components
   */
  static createWithPreset(presetName, outputDir = './output', tempDir = './temp') {
    const presets = MediaProcessorFactory.getCompressionPresets();
    const settings = presets[presetName];
    
    if (!settings) {
      throw new Error(`Unknown compression preset: ${presetName}. Available: ${Object.keys(presets).join(', ')}`);
    }
    
    logger.info(`Creating MediaOrchestrator with preset: ${presetName} (CRF: ${settings.crf}, Max height: ${settings.maxHeight || 'original'})`);
    
    return MediaProcessorFactory.create(outputDir, tempDir, settings);
  }

  /**
   * Create MediaOrchestrator with custom compression settings
   * Main factory method with full dependency injection
   */
  static create(outputDir = './output', tempDir = './temp', compressionSettings = {}) {
    // Create all dependencies
    const fileManager = new FileManager();
    const videoProcessor = new VideoProcessor(fileManager, compressionSettings);
    const audioProcessor = new AudioProcessor(fileManager, compressionSettings);
    const mediaMerger = new MediaMerger(fileManager, compressionSettings);

    // Create orchestrator with all dependencies injected
    const orchestrator = new MediaOrchestrator(
      videoProcessor,
      audioProcessor,
      mediaMerger,
      fileManager
    );

    // Initialize directories
    orchestrator.initialize(outputDir, tempDir);

    return orchestrator;
  }

  /**
   * Create MediaOrchestrator with custom implementations
   * Allows for different processor implementations (Open/Closed Principle)
   */
  static createWithCustomProcessors(videoProcessor, audioProcessor, mediaMerger, fileManager) {
    return new MediaOrchestrator(videoProcessor, audioProcessor, mediaMerger, fileManager);
  }

  /**
   * Backward compatibility: create with same interface as old MediaProcessor
   */
  static withPreset(presetName, outputDir = './output', tempDir = './temp') {
    const orchestrator = MediaProcessorFactory.createWithPreset(presetName, outputDir, tempDir);
    
    // Add backward compatibility methods
    orchestrator.getCompressionPresets = MediaProcessorFactory.getCompressionPresets;
    
    return orchestrator;
  }
} 