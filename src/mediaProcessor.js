import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

class MediaProcessor {
  constructor(outputDir = './output', tempDir = './temp', compressionSettings = {}) {
    this.outputDir = outputDir;
    this.tempDir = tempDir;
    
    // Compression settings with optimized defaults for smaller file sizes
    this.compressionSettings = {
      // Video quality: 23 = good quality, much smaller files than 18
      crf: compressionSettings.crf || 23,
      
      // Preset: balance between speed and compression
      preset: compressionSettings.preset || 'medium',
      
      // Maximum resolution (set to null to keep original)
      maxHeight: compressionSettings.maxHeight || 1080,
      
      // Audio bitrate for final output
      audioBitrate: compressionSettings.audioBitrate || '96k',
      
      // Enable two-pass encoding for even better compression
      twoPass: compressionSettings.twoPass || false,
      
      // Profile and level for better compatibility
      profile: compressionSettings.profile || 'high',
      level: compressionSettings.level || '4.0',
      
      ...compressionSettings
    };
    
    this.setupFFmpeg();
    this.ensureDirectories();
  }

  setupFFmpeg() {
    // Set FFmpeg paths if provided in environment
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  async ensureDirectories() {
    try {
      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);
      logger.debug(`Directories ensured: ${this.outputDir}, ${this.tempDir}`);
    } catch (error) {
      logger.error('Error creating directories:', error);
      throw error;
    }
  }

  /**
   * Get media duration in seconds
   */
  async getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration;
        resolve(parseFloat(duration));
      });
    });
  }

  /**
   * Get video information (resolution, codec, etc.)
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

    // Only scale down if video is larger than max height
    if (videoInfo.height > this.compressionSettings.maxHeight) {
      // Calculate width to maintain aspect ratio
      const aspectRatio = videoInfo.width / videoInfo.height;
      const newWidth = Math.round(this.compressionSettings.maxHeight * aspectRatio);
      
      // Ensure even dimensions for h.264 compatibility
      const evenWidth = newWidth % 2 === 0 ? newWidth : newWidth - 1;
      const evenHeight = this.compressionSettings.maxHeight % 2 === 0 ? 
        this.compressionSettings.maxHeight : this.compressionSettings.maxHeight - 1;
      
      logger.info(`Scaling video from ${videoInfo.width}x${videoInfo.height} to ${evenWidth}x${evenHeight}`);
      return `scale=${evenWidth}:${evenHeight}`;
    }

    return null;
  }

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
   * Create MediaProcessor with preset compression settings
   */
  static withPreset(presetName, outputDir = './output', tempDir = './temp') {
    const presets = MediaProcessor.getCompressionPresets();
    const settings = presets[presetName];
    
    if (!settings) {
      throw new Error(`Unknown compression preset: ${presetName}. Available: ${Object.keys(presets).join(', ')}`);
    }
    
    logger.info(`Using compression preset: ${presetName} (CRF: ${settings.crf}, Max height: ${settings.maxHeight || 'original'})`);
    return new MediaProcessor(outputDir, tempDir, settings);
  }

  /**
   * Loop video to specified duration (in minutes)
   */
  async loopVideo(inputPath, durationMinutes, outputPath = null) {
    try {
      const targetDuration = durationMinutes * 60; // Convert to seconds
      const inputDuration = await this.getMediaDuration(inputPath);
      const videoInfo = await this.getVideoInfo(inputPath);
      
      if (!outputPath) {
        outputPath = path.join(this.tempDir, `looped_video_${uuidv4()}.mp4`);
      }

      logger.info(`Looping video from ${inputDuration}s to ${targetDuration}s (${durationMinutes} minutes)`);

      const loops = Math.ceil(targetDuration / inputDuration);
      
      return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        // For short videos that need many loops, use stream_loop for efficiency
        if (loops > 10) {
          command = command.inputOptions([`-stream_loop ${loops - 1}`]);
        } else {
          // For fewer loops, concatenate the input
          const inputs = Array(loops).fill(inputPath);
          command = ffmpeg();
          inputs.forEach(input => command.input(input));
          command = command.complexFilter([
            `concat=n=${loops}:v=1:a=0[outv]`
          ]).outputOptions(['-map [outv]']);
        }

        const outputOptions = [
          '-c:v libx264',                    // H.264 codec for compatibility
          '-preset', this.compressionSettings.preset,    // Compression vs speed balance
          '-crf', this.compressionSettings.crf.toString(), // Quality setting
          '-profile:v', this.compressionSettings.profile,  // H.264 profile
          '-level', this.compressionSettings.level,        // H.264 level
          '-pix_fmt yuv420p',                // Ensure compatibility
          '-movflags +faststart',            // Optimize for streaming
          '-threads 0',                      // Use all available CPU threads
          '-t', targetDuration.toString()    // Trim to exact duration
        ];

        // Add YouTube-specific optimizations if available
        if (this.compressionSettings.bframes) {
          outputOptions.push('-bf', this.compressionSettings.bframes.toString());
        }
        if (this.compressionSettings.gopSize) {
          outputOptions.push('-g', this.compressionSettings.gopSize.toString());
        }

        // Apply resolution scaling if needed
        const scaleFilter = this.getVideoScaleFilter(videoInfo);
        if (scaleFilter) {
          outputOptions.push('-vf', scaleFilter);
        }

        command.outputOptions(outputOptions)
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg command:', cmdline);
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
   * Loop audio to specified duration (in minutes)
   */
  async loopAudio(inputPath, durationMinutes, outputPath = null) {
    try {
      const targetDuration = durationMinutes * 60; // Convert to seconds
      const inputDuration = await this.getMediaDuration(inputPath);
      
      if (!outputPath) {
        outputPath = path.join(this.tempDir, `looped_audio_${uuidv4()}.wav`);
      }

      logger.info(`Looping audio from ${inputDuration}s to ${targetDuration}s (${durationMinutes} minutes)`);

      const loops = Math.ceil(targetDuration / inputDuration);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .inputOptions([`-stream_loop ${loops - 1}`])
          .outputOptions([
            '-c:a pcm_s16le',        // High quality PCM audio
            '-ar 48000',             // 48kHz sample rate
            '-ac 2',                 // Stereo
            '-t', targetDuration.toString() // Trim to exact duration
          ])
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg command:', cmdline);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.debug(`Audio loop progress: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', () => {
            logger.info(`Audio looping completed: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Audio looping failed:', err);
            reject(err);
          })
          .run();
      });

    } catch (error) {
      logger.error('Error in loopAudio:', error);
      throw error;
    }
  }

  /**
   * Merge video and audio files
   */
  async mergeVideoAudio(videoPath, audioPath, outputPath = null) {
    try {
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = path.join(this.outputDir, `merged_${timestamp}.mp4`);
      }

      logger.info(`Merging video and audio: ${path.basename(videoPath)} + ${path.basename(audioPath)}`);

      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions([
            '-c:v copy',             // Copy video without re-encoding (fastest)
            '-c:a aac',              // AAC audio codec
            '-b:a', this.compressionSettings.audioBitrate, // Optimized audio bitrate
            '-movflags +faststart',  // Optimize for streaming
            '-shortest'              // Stop when shortest input ends
          ])
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg command:', cmdline);
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
   * Complete processing pipeline: loop both video and audio, then merge
   */
  async processMedia(videoPath, audioPath, durationMinutes, outputPath = null) {
    let loopedVideoPath = null;
    let loopedAudioPath = null;

    try {
      logger.info(`Starting media processing pipeline for ${durationMinutes} minutes`);

      // Loop video and audio in parallel for maximum speed
      logger.info('Starting parallel video and audio looping...');
      [loopedVideoPath, loopedAudioPath] = await Promise.all([
        this.loopVideo(videoPath, durationMinutes),
        this.loopAudio(audioPath, durationMinutes)
      ]);

      // Merge the looped video and audio
      logger.info('Merging looped video and audio...');
      const finalOutputPath = await this.mergeVideoAudio(loopedVideoPath, loopedAudioPath, outputPath);

      // Cleanup temporary files
      await this.cleanup([loopedVideoPath, loopedAudioPath]);

      logger.info(`Media processing completed: ${finalOutputPath}`);
      return finalOutputPath;

    } catch (error) {
      logger.error('Error in media processing pipeline:', error);
      
      // Cleanup on error
      if (loopedVideoPath || loopedAudioPath) {
        await this.cleanup([loopedVideoPath, loopedAudioPath].filter(Boolean));
      }
      
      throw error;
    }
  }



  /**
   * Clean up temporary files
   */
  async cleanup(filePaths) {
    try {
      for (const filePath of filePaths) {
        if (filePath && await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          logger.debug(`Cleaned up: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Get output file size and metadata
   */
  async getOutputMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const videoInfo = await this.getVideoInfo(filePath);
      
      return {
        filePath,
        fileSize: stats.size,
        fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
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
}

export default MediaProcessor; 