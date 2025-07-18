/**
 * Interface for HTTP client operations
 * Supports Dependency Inversion Principle by abstracting HTTP operations
 */
export class IHttpClient {
  /**
   * Make HTTP POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request payload
   * @param {Object} options - Request options (headers, timeout, etc.)
   * @returns {Promise<Object>} Response object with status, data, etc.
   */
  async post(url, data, options = {}) {
    throw new Error('Method post must be implemented');
  }

  /**
   * Make HTTP GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options (headers, timeout, etc.)
   * @returns {Promise<Object>} Response object with status, data, etc.
   */
  async get(url, options = {}) {
    throw new Error('Method get must be implemented');
  }

  /**
   * Make HTTP PUT request
   * @param {string} url - Request URL
   * @param {Object} data - Request payload
   * @param {Object} options - Request options (headers, timeout, etc.)
   * @returns {Promise<Object>} Response object with status, data, etc.
   */
  async put(url, data, options = {}) {
    throw new Error('Method put must be implemented');
  }

  /**
   * Make HTTP DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Request options (headers, timeout, etc.)
   * @returns {Promise<Object>} Response object with status, data, etc.
   */
  async delete(url, options = {}) {
    throw new Error('Method delete must be implemented');
  }
} 