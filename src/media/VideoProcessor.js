import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { logger } from '../logger.js';
import { IVideoProcessor } from '../interfaces/IVideoProcessor.js';

/**
 * Concrete implementation of video processing operations
 * Follows Single Responsibility Principle - only handles video operations
 * Uses dependency injection for file management
 */
export class VideoProcessor extends IVideoProcessor {
  constructor(fileManager, compressionSettings = {}) {
    super();
    this.fileManager = fileManager;
    this.compressionSettings = {
      crf: 23,
      preset: 'medium',
      profile: 'high',
      level: '4.0',
      maxHeight: 1080,
      bframes: 2,
      gopSize: 12,
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
   * Get video information
   */
  async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          width: videoStream.width,
          height: videoStream.height,
          codec: videoStream.codec_name,
          duration: parseFloat(metadata.format.duration),
          fps: eval(videoStream.r_frame_rate) // Convert fraction to decimal
        });
      });
    });
  }

  /**
   * Get video scale filter for resolution optimization
   */
  getVideoScaleFilter(videoInfo) {
    if (!this.compressionSettings.maxHeight || !videoInfo.height) {
      return null;
    }

    if (videoInfo.height > this.compressionSettings.maxHeight) {
      const aspectRatio = videoInfo.width / videoInfo.height;
      const newWidth = Math.round(this.compressionSettings.maxHeight * aspectRatio);
      
      const evenWidth = newWidth % 2 === 0 ? newWidth : newWidth - 1;
      const evenHeight = this.compressionSettings.maxHeight % 2 === 0 ? 
        this.compressionSettings.maxHeight : this.compressionSettings.maxHeight - 1;
      
      logger.info(`Scaling video from ${videoInfo.width}x${videoInfo.height} to ${evenWidth}x${evenHeight}`);
      return `scale=${evenWidth}:${evenHeight}`;
    }

    return null;
  }

  /**
   * Loop video to specified duration
   */
  async loopVideo(inputPath, durationMinutes, outputPath = null) {
    try {
      const targetDuration = durationMinutes * 60;
      const inputDuration = await this.fileManager.getMediaDuration(inputPath);
      const videoInfo = await this.getVideoInfo(inputPath);
      
      if (!outputPath) {
        outputPath = this.fileManager.generateUniqueFilePath(
          path.dirname(inputPath), 'looped_video', 'mp4'
        );
      }

      logger.info(`Looping video from ${inputDuration}s to ${targetDuration}s (${durationMinutes} minutes)`);

      const loops = Math.ceil(targetDuration / inputDuration);
      
      return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        if (loops > 10) {
          command = command.inputOptions([`-stream_loop ${loops - 1}`]);
        } else {
          const inputs = Array(loops).fill(inputPath);
          command = ffmpeg();
          inputs.forEach(input => command.input(input));
          command = command.complexFilter([
            `concat=n=${loops}:v=1:a=0[outv]`
          ]).outputOptions(['-map [outv]']);
        }

        const outputOptions = [
          '-c:v libx264',
          '-preset', this.compressionSettings.preset,
          '-crf', this.compressionSettings.crf.toString(),
          '-profile:v', this.compressionSettings.profile,
          '-level', this.compressionSettings.level,
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-threads 0',
          '-t', targetDuration.toString()
        ];

        if (this.compressionSettings.bframes) {
          outputOptions.push('-bf', this.compressionSettings.bframes.toString());
        }
        if (this.compressionSettings.gopSize) {
          outputOptions.push('-g', this.compressionSettings.gopSize.toString());
        }

        const scaleFilter = this.getVideoScaleFilter(videoInfo);
        if (scaleFilter) {
          outputOptions.push('-vf', scaleFilter);
        }

        command.outputOptions(outputOptions)
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg video command:', cmdline);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.debug(`Video loop progress: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', () => {
            logger.info(`Video looping completed: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Video looping failed:', err);
            reject(err);
          })
          .run();
      });

    } catch (error) {
      logger.error('Error in loopVideo:', error);
      throw error;
    }
  }

  /**
   * Apply video filters/transformations
   */
  async applyFilters(inputPath, filters, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (filters.scale) {
        command = command.videoFilters(`scale=${filters.scale}`);
      }
      if (filters.fps) {
        command = command.fps(filters.fps);
      }
      if (filters.custom) {
        command = command.videoFilters(filters.custom);
      }

      command
        .output(outputPath)
        .on('start', (cmdline) => {
          logger.debug('FFmpeg filter command:', cmdline);
        })
        .on('end', () => {
          logger.info(`Video filters applied: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Video filter application failed:', err);
          reject(err);
        })
        .run();
    });
  }
} 