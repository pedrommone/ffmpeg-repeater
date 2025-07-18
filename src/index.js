import dotenv from 'dotenv';
import { logger } from './logger.js';
import { serviceFactory } from './services/ServiceFactory.js';
import MediaDownloader from './downloader.js';
import { MediaProcessorFactory } from './media/MediaProcessorFactory.js';
import BackblazeUploader from './uploader.js';
import { VideoRenderWorker } from './VideoRenderWorker.js';
import { config } from './config/Config.js';

// Load environment variables
dotenv.config();

/**
 * Dependency Injection Container
 * Implements Dependency Inversion Principle
 */
class DIContainer {
  constructor() {
    this.dependencies = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a dependency
   */
  register(name, factory, isSingleton = true) {
    this.dependencies.set(name, { factory, isSingleton });
    return this;
  }

  /**
   * Resolve a dependency
   */
  resolve(name) {
    const dependency = this.dependencies.get(name);
    if (!dependency) {
      throw new Error(`Dependency ${name} not found`);
    }

    if (dependency.isSingleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, dependency.factory());
      }
      return this.singletons.get(name);
    }

    return dependency.factory();
  }

  /**
   * Create worker with all dependencies
   */
  createWorker() {
    return new VideoRenderWorker({
      jobManager: this.resolve('jobManager'),
      downloader: this.resolve('downloader'),
      processor: this.resolve('processor'),
      uploader: this.resolve('uploader')
    });
  }
}

/**
 * Configure dependency injection container
 * Updated to use ServiceFactory for SOLID compliance
 */
function configureDI() {
  const container = new DIContainer();

  // Register all dependencies using ServiceFactory for proper dependency injection
  const compressionPreset = process.env.COMPRESSION_PRESET || 'youtube-1080p';
  container
    .register('jobManager', () => serviceFactory.createJobManager())
    .register('downloader', () => new MediaDownloader())
    .register('processor', () => MediaProcessorFactory.withPreset(compressionPreset)) // SOLID-compliant media processing
    .register('uploader', () => new BackblazeUploader());

  return container;
}

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('Initializing Video Render Worker application...');

    // Configure dependency injection
    const container = configureDI();
    
    // Create worker with injected dependencies
    const worker = container.createWorker();

    // Set up graceful shutdown handlers
    setupGracefulShutdown(worker);

    // Start processing
    const stats = await worker.start();
    
    logger.info('Application completed successfully:', stats);
    process.exit(0);

  } catch (error) {
    logger.error('Application failed:', error);
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(worker) {
  const signals = ['SIGINT', 'SIGTERM'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      
      try {
        await worker.shutdown();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

/**
 * Development mode - export for testing
 */
export { DIContainer, configureDI, VideoRenderWorker };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 