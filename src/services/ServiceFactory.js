import { HttpClient } from '../http/HttpClient.js';
import { WorkflowNotifier } from '../notifications/WorkflowNotifier.js';
import SupabaseJobManager from '../supabase.js';
import { logger } from '../logger.js';

/**
 * Service factory for creating properly configured service instances
 * Demonstrates Dependency Inversion Principle by managing dependency injection
 * Follows Single Responsibility Principle by only handling service creation and wiring
 */
export class ServiceFactory {
  constructor() {
    this.httpClient = null;
    this.workflowNotifier = null;
    this.jobManager = null;
  }

  /**
   * Create HTTP client with optional configuration
   * @param {Object} options - HTTP client configuration options
   * @returns {HttpClient} Configured HTTP client instance
   */
  createHttpClient(options = {}) {
    if (!this.httpClient) {
      this.httpClient = new HttpClient(options);
      logger.debug('HTTP client created');
    }
    return this.httpClient;
  }

  /**
   * Create workflow notifier with HTTP client dependency
   * @param {HttpClient} httpClient - Optional HTTP client instance
   * @returns {WorkflowNotifier} Configured workflow notifier instance
   */
  createWorkflowNotifier(httpClient = null) {
    if (!this.workflowNotifier) {
      const client = httpClient || this.createHttpClient();
      this.workflowNotifier = new WorkflowNotifier(client);
      logger.debug('Workflow notifier created with HTTP client dependency');
    }
    return this.workflowNotifier;
  }

  /**
   * Create job manager with optional workflow notifier dependency
   * @param {Object} configOverride - Optional configuration override
   * @param {WorkflowNotifier} workflowNotifier - Optional workflow notifier instance
   * @returns {SupabaseJobManager} Configured job manager instance
   */
  createJobManager(configOverride = null, workflowNotifier = null) {
    if (!this.jobManager) {
      const notifier = workflowNotifier || this.createWorkflowNotifier();
      this.jobManager = new SupabaseJobManager(configOverride, notifier);
      logger.debug('Job manager created with workflow notifier dependency');
    }
    return this.jobManager;
  }

  /**
   * Create job manager without workflow notifications
   * Useful for scenarios where external notifications are not needed
   * @param {Object} configOverride - Optional configuration override
   * @returns {SupabaseJobManager} Job manager without workflow notifier
   */
  createSimpleJobManager(configOverride = null) {
    return new SupabaseJobManager(configOverride, null);
  }

  /**
   * Reset all singleton instances
   * Useful for testing or reconfiguration
   */
  reset() {
    this.httpClient = null;
    this.workflowNotifier = null;
    this.jobManager = null;
    logger.debug('Service factory reset');
  }

  /**
   * Create all services with default configuration
   * Convenience method for simple setups
   * @returns {Object} Object containing all configured services
   */
  createAllServices() {
    const httpClient = this.createHttpClient();
    const workflowNotifier = this.createWorkflowNotifier(httpClient);
    const jobManager = this.createJobManager(null, workflowNotifier);

    return {
      httpClient,
      workflowNotifier,
      jobManager
    };
  }
}

// Export a default instance for convenience
export const serviceFactory = new ServiceFactory(); 