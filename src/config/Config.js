import { logger } from '../logger.js';

/**
 * Configuration management class
 * Implements Open/Closed Principle by making configurations extensible
 */
export class Config {
  constructor() {
    this.loaded = false;
  }

  ensureLoaded() {
    if (!this.loaded) {
      this.loadConfiguration();
      this.loaded = true;
    }
  }

  loadConfiguration() {
    // Supabase Configuration
    this.supabase = {
      url: this.getRequiredEnv('SUPABASE_URL'),
      anonKey: this.getRequiredEnv('SUPABASE_ANON_KEY')
    };

    // File Storage Configuration
    this.storage = {
      tempDir: process.env.TEMP_DIR || './temp',
      outputDir: process.env.OUTPUT_DIR || './output'
    };

    // Backblaze B2 Configuration
    this.backblaze = {
      endpoint: this.getRequiredEnv('B2_ENDPOINT'),
      region: this.getRequiredEnv('B2_REGION'),
      accessKeyId: this.getRequiredEnv('B2_ACCESS_KEY_ID'),
      secretAccessKey: this.getRequiredEnv('B2_SECRET_ACCESS_KEY'),
      bucket: this.getRequiredEnv('B2_BUCKET'),
      publicBaseUrl: process.env.B2_PUBLIC_BASE_URL || 'https://f004.backblazeb2.com/file/gpm-n8n-storage',
      keyPattern: 'dark_channel_sounds/channel_{channelId}/finals/rendered_version_{videoId}.mp4'
    };

    // FFmpeg Configuration
    this.ffmpeg = {
      path: process.env.FFMPEG_PATH || 'ffmpeg',
      probePath: process.env.FFPROBE_PATH || 'ffprobe',
      videoCodec: process.env.FFMPEG_VIDEO_CODEC || 'libx264',
      audioCodec: process.env.FFMPEG_AUDIO_CODEC || 'aac',
      preset: process.env.FFMPEG_PRESET || 'ultrafast',
      crf: parseInt(process.env.FFMPEG_CRF) || 18,
      threads: parseInt(process.env.FFMPEG_THREADS) || 0
    };

    // Download Configuration
    this.download = {
      timeout: parseInt(process.env.DOWNLOAD_TIMEOUT) || 300000,
      userAgent: process.env.USER_AGENT || 'VideoRenderer/1.0',
      retries: parseInt(process.env.DOWNLOAD_RETRIES) || 3
    };

    // Upload Configuration
    this.upload = {
      partSize: parseInt(process.env.UPLOAD_PART_SIZE) || (1024 * 1024 * 10), // 10MB
      queueSize: parseInt(process.env.UPLOAD_QUEUE_SIZE) || 4,
      contentType: process.env.UPLOAD_CONTENT_TYPE || 'video/mp4'
    };

    // Validation Configuration
    this.validation = {
      minVideoSize: parseInt(process.env.MIN_VIDEO_SIZE) || (1024 * 10), // 10KB
      minAudioSize: parseInt(process.env.MIN_AUDIO_SIZE) || (1024 * 5),  // 5KB
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || (1024 * 1024 * 1024 * 2) // 2GB
    };

    // Logging Configuration
    this.logging = {
      level: process.env.LOG_LEVEL || 'info'
    };

    logger.info('Configuration loaded successfully');
  }

  getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get Backblaze key for a video
   */
  getBackblazeKey(channelId, videoId) {
    this.ensureLoaded();
    return this.backblaze.keyPattern
      .replace('{channelId}', channelId)
      .replace('{videoId}', videoId);
  }

  /**
   * Validate all required configuration
   */
  validate() {
    this.ensureLoaded();
    const requiredSections = ['supabase', 'backblaze'];
    
    for (const section of requiredSections) {
      if (!this[section]) {
        throw new Error(`Missing required configuration section: ${section}`);
      }
    }

    logger.info('Configuration validation passed');
    return true;
  }

  /**
   * Get configuration for a specific component
   */
  getComponentConfig(componentName) {
    this.ensureLoaded();
    const configs = {
      supabase: this.supabase,
      storage: this.storage,
      backblaze: this.backblaze,
      ffmpeg: this.ffmpeg,
      download: this.download,
      upload: this.upload,
      validation: this.validation,
      logging: this.logging
    };

    return configs[componentName] || {};
  }
}

// Singleton instance
export const config = new Config(); 