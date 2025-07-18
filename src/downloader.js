import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { FileManager } from './base/FileManager.js';
import { IMediaDownloader } from './interfaces/IMediaDownloader.js';
import { config } from './config/Config.js';

class MediaDownloader extends FileManager {
  constructor(tempDir = null, configOverride = null) {
    const actualTempDir = tempDir || config.getComponentConfig('storage').tempDir;
    super(actualTempDir);
    
    this.config = configOverride || config.getComponentConfig('download');
    this.validationConfig = config.getComponentConfig('validation');
    
    this.ensureDirectory();
  }

  /**
   * Download a file from URL to local temp directory
   */
  async downloadFile(url, expectedExtension) {
    try {
      logger.info(`Starting download: ${url}`);
      
      const fileName = `${uuidv4()}.${expectedExtension}`;
      const filePath = path.join(this.baseDir, fileName);

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': this.config.userAgent
        }
      });

      const writer = fs.createWriteStream(filePath);
      
      // Track download progress
      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;

      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        if (totalLength) {
          const progress = ((downloadedLength / totalLength) * 100).toFixed(1);
          if (downloadedLength % (1024 * 1024) === 0) { // Log every MB
            logger.debug(`Download progress: ${progress}%`);
          }
        }
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info(`Download completed: ${filePath}`);
          resolve(filePath);
        });

        writer.on('error', (error) => {
          logger.error('Download error:', error);
          reject(error);
        });

        response.data.on('error', (error) => {
          logger.error('Response stream error:', error);
          reject(error);
        });
      });

    } catch (error) {
      logger.error(`Failed to download ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Download video file (MP4)
   */
  async downloadVideo(videoUrl) {
    logger.info('Downloading video file...');
    return this.downloadFile(videoUrl, 'mp4');
  }

  /**
   * Download audio file (WAV)
   */
  async downloadAudio(audioUrl) {
    logger.info('Downloading audio file...');
    return this.downloadFile(audioUrl, 'wav');
  }

  /**
   * Download both video and audio files concurrently
   */
  async downloadMediaFiles(videoUrl, audioUrl) {
    try {
      logger.info('Starting concurrent download of video and audio...');
      
      const [videoPath, audioPath] = await Promise.all([
        this.downloadVideo(videoUrl),
        this.downloadAudio(audioUrl)
      ]);

      logger.info('Both media files downloaded successfully');
      return { videoPath, audioPath };

    } catch (error) {
      logger.error('Error downloading media files:', error);
      throw error;
    }
  }

  /**
   * Validate downloaded file with configuration-based minimum sizes
   */
  async validateFile(filePath, minSizeBytes = null) {
    const actualMinSize = minSizeBytes || this.getMinSizeForFile(filePath);
    return super.validateFile(filePath, actualMinSize);
  }

  /**
   * Get minimum file size based on file type
   */
  getMinSizeForFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.mp4':
      case '.avi':
      case '.mov':
        return this.validationConfig.minVideoSize;
      case '.wav':
      case '.mp3':
      case '.aac':
        return this.validationConfig.minAudioSize;
      default:
        return 1024; // 1KB default
    }
  }

  /**
   * Download with retry logic
   */
  async downloadWithRetry(url, expectedExtension, maxRetries = null) {
    const retries = maxRetries || this.config.retries;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.downloadFile(url, expectedExtension);
      } catch (error) {
        logger.warn(`Download attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Validate all downloaded files in a batch
   */
  async validateAllFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.validateFile(filePath);
        results.push({ filePath, ...result });
      } catch (error) {
        results.push({ 
          filePath, 
          valid: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * Get download statistics
   */
  async getDownloadStats(filePath) {
    const metadata = await this.getFileMetadata(filePath);
    return {
      ...metadata,
      downloadedAt: new Date().toISOString(),
      isVideo: this.isVideoFile(filePath),
      isAudio: this.isAudioFile(filePath)
    };
  }

  /**
   * Check if file is a video file
   */
  isVideoFile(filePath) {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    return videoExtensions.includes(path.extname(filePath).toLowerCase());
  }

  /**
   * Check if file is an audio file
   */
  isAudioFile(filePath) {
    const audioExtensions = ['.wav', '.mp3', '.aac', '.ogg', '.flac'];
    return audioExtensions.includes(path.extname(filePath).toLowerCase());
  }
}

export default MediaDownloader; 