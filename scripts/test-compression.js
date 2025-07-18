#!/usr/bin/env node

import dotenv from 'dotenv';
import { MediaProcessorFactory } from '../src/media/MediaProcessorFactory.js';
import { logger } from '../src/logger.js';
import fs from 'fs-extra';

dotenv.config();

/**
 * Test script to demonstrate compression preset differences
 * Usage: node scripts/test-compression.js [preset] [video-path] [audio-path]
 */

async function testCompression() {
  const preset = process.argv[2] || 'medium';
  const videoPath = process.argv[3] || './temp/test-video.mp4';
  const audioPath = process.argv[4] || './temp/test-audio.wav';

  if (!await fs.pathExists(videoPath) || !await fs.pathExists(audioPath)) {
    console.error('❌ Test files not found. Please provide paths to existing video and audio files.');
    console.log('Usage: node scripts/test-compression.js [preset] [video-path] [audio-path]');
    console.log('Available presets: tiny, small, medium, high, ultra');
    process.exit(1);
  }

  try {
    logger.info(`🧪 Testing compression preset: ${preset}`);
    
    // Create processor with specified preset
    const processor = MediaProcessorFactory.withPreset(preset, './output', './temp');
    
    // Get original file sizes
    const videoStats = await fs.stat(videoPath);
    const audioStats = await fs.stat(audioPath);
    const originalSizeMB = (videoStats.size + audioStats.size) / (1024 * 1024);
    
    logger.info(`📁 Original files: ${originalSizeMB.toFixed(2)}MB`);
    
    // Process with 1 minute duration for testing
    const startTime = Date.now();
    const outputPath = await processor.processMedia(videoPath, audioPath, 1, 
      `./output/test_${preset}_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`);
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    // Get output file size
    const outputStats = await fs.stat(outputPath);
    const outputSizeMB = outputStats.size / (1024 * 1024);
    const compressionRatio = ((originalSizeMB - outputSizeMB) / originalSizeMB) * 100;
    
    // Get video metadata
    const metadata = await processor.getOutputMetadata(outputPath);
    
    console.log('\n🎯 Compression Results:');
    console.log(`├─ Preset: ${preset}`);
    console.log(`├─ Processing time: ${processingTime.toFixed(1)}s`);
    console.log(`├─ Original size: ${originalSizeMB.toFixed(2)}MB`);
    console.log(`├─ Output size: ${outputSizeMB.toFixed(2)}MB`);
    console.log(`├─ Size reduction: ${compressionRatio.toFixed(1)}%`);
    console.log(`├─ Resolution: ${metadata.resolution}`);
    console.log(`├─ Codec: ${metadata.codec}`);
    console.log(`└─ Output: ${outputPath}`);
    
  } catch (error) {
    logger.error('❌ Compression test failed:', error);
    process.exit(1);
  }
}

function showPresetComparison() {
  console.log('\n📊 Compression Presets Comparison:');
  console.log('');
  
  const presets = MediaProcessorFactory.getCompressionPresets();
  
  // Show YouTube presets first
  const youtubePresets = Object.entries(presets).filter(([name]) => name.startsWith('youtube-'));
  const legacyPresets = Object.entries(presets).filter(([name]) => !name.startsWith('youtube-'));
  
  console.log('🎥 YouTube Optimized Presets:');
  youtubePresets.forEach(([name, settings]) => {
    const sizeReduction = name === 'youtube-4k' ? '~30-50%' :
                         name === 'youtube-2k' ? '~60-70%' :
                         name === 'youtube-1080p' ? '~70-80%' : '~80-90%';
    
    console.log(`${name.padEnd(15)} | CRF: ${settings.crf.toString().padEnd(2)} | Max: ${settings.maxHeight.toString().padEnd(4)} | Audio: ${settings.audioBitrate.padEnd(5)} | Size: ${sizeReduction}`);
  });
  
  console.log('\n📁 Legacy Presets:');
  legacyPresets.forEach(([name, settings]) => {
    const sizeReduction = name === 'ultra' ? '~10%' : 
                         name === 'high' ? '~50-70%' :
                         name === 'medium' ? '~70-80%' :
                         name === 'small' ? '~80-90%' : '~90%+';
    
    console.log(`${name.padEnd(8)} | CRF: ${settings.crf.toString().padEnd(2)} | Max: ${(settings.maxHeight || 'orig').toString().padEnd(4)} | Audio: ${settings.audioBitrate.padEnd(5)} | Size: ${sizeReduction}`);
  });
  
  console.log('');
  console.log('🎯 YouTube Recommendations:');
  console.log('├─ For 4K content: "youtube-4k" (2160p, premium quality)');
  console.log('├─ For high quality: "youtube-2k" (1440p, great balance)');  
  console.log('├─ For most content: "youtube-1080p" (1080p, optimal size/quality)');
  console.log('└─ For small files: "youtube-720p" (720p, mobile-friendly)');
  console.log('');
}

// Show preset comparison if no arguments
if (process.argv.length <= 2) {
  showPresetComparison();
  console.log('Usage: node scripts/test-compression.js [preset] [video-path] [audio-path]');
} else {
  testCompression();
} 