import { logger } from '../logger.js';

/**
 * Job validator class - implements Single Responsibility Principle
 * Responsible only for validating job data
 */
export class JobValidator {
  constructor(config) {
    this.config = config;
    this.requiredFields = ['input_video_url', 'soundtrack_url', 'length_minutes', 'channel_id'];
  }

  /**
   * Validate job has all required fields
   * @param {Object} job - Job object to validate
   * @returns {Object} Validation result
   */
  validateJobData(job) {
    const missingFields = [];
    const invalidFields = [];

    // Check required fields
    for (const field of this.requiredFields) {
      if (!job[field]) {
        missingFields.push(field);
      }
    }

    // Validate field types and values
    if (job.length_minutes && (typeof job.length_minutes !== 'number' || job.length_minutes <= 0)) {
      invalidFields.push('length_minutes must be a positive number');
    }

    if (job.channel_id && (typeof job.channel_id !== 'number' || job.channel_id <= 0)) {
      invalidFields.push('channel_id must be a positive number');
    }

    if (job.input_video_url && !this.isValidUrl(job.input_video_url)) {
      invalidFields.push('input_video_url must be a valid URL');
    }

    if (job.soundtrack_url && !this.isValidUrl(job.soundtrack_url)) {
      invalidFields.push('soundtrack_url must be a valid URL');
    }

    const isValid = missingFields.length === 0 && invalidFields.length === 0;

    const result = {
      isValid,
      missingFields,
      invalidFields,
      errors: [...missingFields.map(f => `Missing required field: ${f}`), ...invalidFields]
    };

    if (!isValid) {
      logger.warn(`Job validation failed for job ${job.id}:`, result.errors);
    }

    return result;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get validation error message
   * @param {Object} validationResult - Result from validateJobData
   * @returns {string} Human-readable error message
   */
  getErrorMessage(validationResult) {
    if (validationResult.isValid) {
      return '';
    }

    let message = 'Job validation failed: ';
    
    if (validationResult.missingFields.length > 0) {
      message += `Missing required fields: ${validationResult.missingFields.join(', ')}. `;
    }
    
    if (validationResult.invalidFields.length > 0) {
      message += `Invalid fields: ${validationResult.invalidFields.join(', ')}. `;
    }

    message += 'Complete video rendering requires video, audio, and duration.';
    
    return message;
  }

  /**
   * Validate file URLs are accessible (basic check)
   * @param {Object} job - Job object
   * @returns {Promise<Object>} Validation result
   */
  async validateUrls(job) {
    const results = {
      videoUrlValid: false,
      audioUrlValid: false,
      errors: []
    };

    try {
      // Basic URL validation (could be extended to check accessibility)
      results.videoUrlValid = this.isValidUrl(job.input_video_url);
      results.audioUrlValid = this.isValidUrl(job.soundtrack_url);

      if (!results.videoUrlValid) {
        results.errors.push('Video URL is invalid');
      }

      if (!results.audioUrlValid) {
        results.errors.push('Audio URL is invalid');
      }

    } catch (error) {
      logger.error('Error validating URLs:', error);
      results.errors.push('URL validation failed');
    }

    return results;
  }
} 