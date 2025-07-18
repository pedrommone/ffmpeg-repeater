import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { logger } from '../logger.js';
import { IAudioProcessor } from '../interfaces/IAudioProcessor.js';

/**
 * Concrete implementation of audio processing operations
 * Follows Single Responsibility Principle - only handles audio operations
 * Uses dependency injection for file management
 */
export class AudioProcessor extends IAudioProcessor {
  constructor(fileManager, compressionSettings = {}) {
    super();
    this.fileManager = fileManager;
    this.compressionSettings = {
      audioBitrate: '96k',
      sampleRate: 48000,
      channels: 2,
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
   * Get audio information
   */
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        resolve({
          codec: audioStream.codec_name,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          bitRate: audioStream.bit_rate,
          duration: parseFloat(metadata.format.duration)
        });
      });
    });
  }

  /**
   * Loop audio to specified duration
   */
  async loopAudio(inputPath, durationMinutes, outputPath = null) {
    try {
      const targetDuration = durationMinutes * 60;
      const inputDuration = await this.fileManager.getMediaDuration(inputPath);
      
      if (!outputPath) {
        outputPath = this.fileManager.generateUniqueFilePath(
          path.dirname(inputPath), 'looped_audio', 'wav'
        );
      }

      logger.info(`Looping audio from ${inputDuration}s to ${targetDuration}s (${durationMinutes} minutes)`);

      const loops = Math.ceil(targetDuration / inputDuration);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .inputOptions([`-stream_loop ${loops - 1}`])
          .outputOptions([
            '-c:a pcm_s16le',
            '-ar', this.compressionSettings.sampleRate.toString(),
            '-ac', this.compressionSettings.channels.toString(),
            '-t', targetDuration.toString()
          ])
          .output(outputPath)
          .on('start', (cmdline) => {
            logger.debug('FFmpeg audio command:', cmdline);
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
   * Process audio with various options
   */
  async processAudio(inputPath, options, outputPath) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      const outputOptions = [];

      if (options.codec) {
        outputOptions.push('-c:a', options.codec);
      }
      if (options.bitrate) {
        outputOptions.push('-b:a', options.bitrate);
      }
      if (options.sampleRate) {
        outputOptions.push('-ar', options.sampleRate.toString());
      }
      if (options.channels) {
        outputOptions.push('-ac', options.channels.toString());
      }
      if (options.volume) {
        command = command.audioFilters(`volume=${options.volume}`);
      }
      if (options.normalize) {
        command = command.audioFilters('loudnorm');
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('start', (cmdline) => {
          logger.debug('FFmpeg audio processing command:', cmdline);
        })
        .on('end', () => {
          logger.info(`Audio processing completed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio processing failed:', err);
          reject(err);
        })
        .run();
    });
  }
} 