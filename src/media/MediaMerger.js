import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { logger } from '../logger.js';
import { IMediaMerger } from '../interfaces/IMediaMerger.js';

/**
 * Concrete implementation of media merging operations
 * Follows Single Responsibility Principle - only handles merging operations
 * Uses dependency injection for file management
 */
export class MediaMerger extends IMediaMerger {
  constructor(fileManager, compressionSettings = {}) {
    super();
    this.fileManager = fileManager;
    this.compressionSettings = {
      audioBitrate: '96k',
      ...compressionSettings
    };
    this.setupFFmpeg();
  }

  setupFFmpeg() {
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  /**
   * Merge video and audio files
   */
  async mergeVideoAudio(videoPath, audioPath, outputPath, options = {}) {
    try {
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = path.join(path.dirname(videoPath), `merged_${timestamp}.mp4`);
      }

      logger.info(`Merging video and audio: ${path.basename(videoPath)} + ${path.basename(audioPath)}`);

      return new Promise((resolve, reject) => {
        const mergeOptions = {
          videoCopy: true,
          audioBitrate: this.compressionSettings.audioBitrate,
          audioCodec: 'aac',
          fastStart: true,
          shortest: true,
          ...options
        };

        let command = ffmpeg()
          .input(videoPath)
          .input(audioPath);

        const outputOptions = [];

        if (mergeOptions.videoCopy) {
          outputOptions.push('-c:v copy');
        }
        
        outputOptions.push('-c:a', mergeOptions.audioCodec);
        outputOptions.push('-b:a', mergeOptions.audioBitrate);
        
        if (mergeOptions.fastStart) {
          outputOptions.push('-movflags +faststart');
        }
        
        if (mergeOptions.shortest) {
          outputOptions.push('-shortest');
        }

        command
          .outputOptions(outputOptions)
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg merge command:', cmdline);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.debug(`Merge progress: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', () => {
            logger.info(`Video and audio merged successfully: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Merge failed:', err);
            reject(err);
          })
          .run();
      });

    } catch (error) {
      logger.error('Error in mergeVideoAudio:', error);
      throw error;
    }
  }

  /**
   * Merge multiple video files
   */
  async mergeVideos(videoPaths, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      if (videoPaths.length < 2) {
        reject(new Error('At least 2 video files are required for merging'));
        return;
      }

      logger.info(`Merging ${videoPaths.length} video files`);

      let command = ffmpeg();
      
      // Add all input files
      videoPaths.forEach(videoPath => {
        command = command.input(videoPath);
      });

      // Create concat filter
      const inputs = videoPaths.map((_, index) => `[${index}:v][${index}:a]`).join('');
      const concatFilter = `${inputs}concat=n=${videoPaths.length}:v=1:a=1[outv][outa]`;

      command
        .complexFilter(concatFilter)
        .outputOptions(['-map [outv]', '-map [outa]'])
        .output(outputPath)
        .on('start', (cmdline) => {
          logger.debug('FFmpeg video merge command:', cmdline);
        })
        .on('end', () => {
          logger.info(`Videos merged successfully: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Video merge failed:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Merge multiple audio files
   */
  async mergeAudios(audioPaths, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      if (audioPaths.length < 2) {
        reject(new Error('At least 2 audio files are required for merging'));
        return;
      }

      logger.info(`Merging ${audioPaths.length} audio files`);

      let command = ffmpeg();
      
      // Add all input files
      audioPaths.forEach(audioPath => {
        command = command.input(audioPath);
      });

      // Create concat filter for audio
      const inputs = audioPaths.map((_, index) => `[${index}:a]`).join('');
      const concatFilter = `${inputs}concat=n=${audioPaths.length}:v=0:a=1[outa]`;

      command
        .complexFilter(concatFilter)
        .outputOptions(['-map [outa]'])
        .output(outputPath)
        .on('start', (cmdline) => {
          logger.debug('FFmpeg audio merge command:', cmdline);
        })
        .on('end', () => {
          logger.info(`Audio files merged successfully: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio merge failed:', err);
          reject(err);
        })
        .run();
    });
  }
} 