import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';
import { config } from './config/Config.js';

class BackblazeUploader {
  constructor(configOverride = null) {
    this.config = configOverride || config.getComponentConfig('backblaze');
    
    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: true, // Required for Backblaze B2
    });
    
    this.bucket = this.config.bucket;
    this.publicBaseUrl = this.config.publicBaseUrl;
    
    if (!this.bucket) {
      throw new Error('B2_BUCKET configuration is required');
    }
    
    logger.info('Backblaze B2 uploader initialized');
  }

  /**
   * Generate S3 key path based on channel ID and video ID
   * Pattern: dark_channel_sounds/channel_{channel_id}/finals/rendered_version_{id}.mp4
   */
  generateKey(channelId, videoId) {
    return this.config.keyPattern
      .replace('{channelId}', channelId)
      .replace('{videoId}', videoId);
  }

  /**
   * Upload file to Backblaze B2
   */
  async uploadFile(filePath, channelId, videoId) {
    try {
      const key = this.generateKey(channelId, videoId);
      const fileSize = await this.getFileSize(filePath);
      
      logger.info(`Starting upload: ${path.basename(filePath)} → ${key} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

      // Create read stream
      const fileStream = fs.createReadStream(filePath);
      
      // Use multipart upload for better reliability and progress tracking
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: fileStream,
          ContentType: 'video/mp4',
          Metadata: {
            'channel-id': channelId.toString(),
            'video-id': videoId.toString(),
            'uploaded-at': new Date().toISOString(),
          }
        },
        queueSize: 4, // Number of parts to upload concurrently
        partSize: 1024 * 1024 * 10, // 10MB parts
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
          logger.debug(`Upload progress: ${percent}%`);
        }
      });

      const result = await upload.done();
      
      // Generate Backblaze public URL: https://f004.backblazeb2.com/file/gpm-n8n-storage/{key}
      const publicUrl = `${this.publicBaseUrl}/${key}`;
      
      logger.info(`Upload completed successfully: ${publicUrl}`);
      
      return {
        success: true,
        url: publicUrl,
        key: key,
        bucket: this.bucket,
        size: fileSize,
        etag: result.ETag,
      };

    } catch (error) {
      logger.error(`Upload failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Error getting file size for ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Validate upload result
   */
  validateUpload(uploadResult) {
    return uploadResult && 
           uploadResult.success && 
           uploadResult.url && 
           uploadResult.key;
  }

  /**
   * Clean up local file after successful upload
   */
  async cleanupLocalFile(filePath) {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        logger.debug(`Cleaned up local file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up local file ${filePath}:`, error);
    }
  }

  /**
   * Upload and cleanup in one operation
   */
  async uploadAndCleanup(filePath, channelId, videoId, keepLocal = false) {
    try {
      const uploadResult = await this.uploadFile(filePath, channelId, videoId);
      
      if (this.validateUpload(uploadResult)) {
        if (!keepLocal) {
          await this.cleanupLocalFile(filePath);
        }
        return uploadResult;
      } else {
        throw new Error('Upload validation failed');
      }
      
    } catch (error) {
      logger.error(`Upload and cleanup failed for ${filePath}:`, error);
      throw error;
    }
  }
}

export default BackblazeUploader; 