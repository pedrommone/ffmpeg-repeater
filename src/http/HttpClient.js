import axios from 'axios';
import { logger } from '../logger.js';
import { IHttpClient } from '../interfaces/IHttpClient.js';

/**
 * Concrete implementation of HTTP client using axios
 * Implements IHttpClient interface following Dependency Inversion Principle
 */
export class HttpClient extends IHttpClient {
  constructor(defaultOptions = {}) {
    super();
    this.defaultOptions = {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VideoRenderer/1.0'
      },
      ...defaultOptions
    };
  }

  /**
   * Make HTTP POST request
   */
  async post(url, data, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      logger.debug(`Making POST request to ${url}`);
      
      const response = await axios.post(url, data, mergedOptions);
      
      logger.debug(`POST request to ${url} successful, status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: true
      };
    } catch (error) {
      logger.error(`POST request to ${url} failed:`, error.message);
      return {
        status: error.response?.status || 0,
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP GET request
   */
  async get(url, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      logger.debug(`Making GET request to ${url}`);
      
      const response = await axios.get(url, mergedOptions);
      
      logger.debug(`GET request to ${url} successful, status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: true
      };
    } catch (error) {
      logger.error(`GET request to ${url} failed:`, error.message);
      return {
        status: error.response?.status || 0,
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP PUT request
   */
  async put(url, data, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      logger.debug(`Making PUT request to ${url}`);
      
      const response = await axios.put(url, data, mergedOptions);
      
      logger.debug(`PUT request to ${url} successful, status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: true
      };
    } catch (error) {
      logger.error(`PUT request to ${url} failed:`, error.message);
      return {
        status: error.response?.status || 0,
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP DELETE request
   */
  async delete(url, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      logger.debug(`Making DELETE request to ${url}`);
      
      const response = await axios.delete(url, mergedOptions);
      
      logger.debug(`DELETE request to ${url} successful, status: ${response.status}`);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: true
      };
    } catch (error) {
      logger.error(`DELETE request to ${url} failed:`, error.message);
      return {
        status: error.response?.status || 0,
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        success: false,
        error: error.message
      };
    }
  }
} 