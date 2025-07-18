# Long Video Render

A high-performance video rendering service that connects to Supabase, processes video jobs, and creates looped video content with merged audio. Optimized for speed and 4K video processing.

## Features

- 🚀 **Ultrafast Processing**: Parallel video/audio processing with FFmpeg
- 🎥 **4K Ready**: Optimized for high-resolution video processing
- 🔄 **Smart Looping**: Efficient video and audio looping algorithms
- 📊 **Queue Management**: Robust job queue with Supabase integration
- 🔧 **Auto-scaling**: Single job processing with race condition prevention
- 📝 **Progress Tracking**: Real-time job progress updates
- 🧹 **Auto Cleanup**: Automatic temporary file management
- 🔧 **Error Recovery**: Comprehensive error handling and logging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │  Video Render   │    │    FFmpeg       │
│   Database      │◄──►│     Worker      │◄──►│   Processing    │
│                 │    │                 │    │                 │
│ - Job Queue     │    │ - Job Manager   │    │ - Video Loop    │
│ - Progress      │    │ - Downloader    │    │ - Audio Loop    │
│ - Metadata      │    │ - Processor     │    │ - Merge A/V     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Required
- **Node.js** v18+ (ESM support required)
- **FFmpeg** installed and available in PATH
- **Supabase** project with database access

### System Requirements
- 4GB+ RAM (8GB+ recommended for 4K)
- Multi-core CPU (for parallel processing)
- Sufficient disk space for temporary files

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install FFmpeg:**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg
   
   # Windows (with Chocolatey)
   choco install ffmpeg
   ```

3. **Set up environment variables:**
   Create a `.env` file with your Supabase credentials:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://htermunpfoqhsbpolnym.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXJtdW5wZm9xaHNicG9sbnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDYyNjgsImV4cCI6MjA2NjUyMjI2OH0.uP3u0uYpDkTzPUIF8k8peeLRL3fl746oCZsMEVbnOK8
   
   # Optional Configuration
   JOB_CHECK_INTERVAL=5000
   TEMP_DIR=./temp
   OUTPUT_DIR=./output
   LOG_LEVEL=info
   ```

4. **Start the worker:**
   ```bash
   npm start
   ```

## Usage

### Quick Start
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add a test job (optional):**
   ```bash
   npm run add-test-job
   ```

3. **Start the worker:**
   ```bash
   npm start
   ```

### Development
```bash
npm run dev
```

### Docker (Optional)
```bash
docker build -t long-video-render .
docker run --env-file .env long-video-render
```

## Database Schema

The system uses your existing `dark_channel_soundtrack_videos` table:

```sql
-- Your existing table structure
CREATE TABLE dark_channel_soundtrack_videos (
  id               BIGSERIAL     PRIMARY KEY,
  channel_id       BIGINT        NOT NULL REFERENCES dark_channel_channels(id),
  input_prompt     TEXT          NOT NULL,
  youtube_title    TEXT          NOT NULL,
  description      TEXT,
  soundtrack_url   TEXT,          -- Audio file URL
  input_image_url  TEXT,
  input_video_url  TEXT,          -- Video file URL
  final_video_url  TEXT,          -- Output will be stored here
  thumbnail_url    TEXT,
  waiting_node_url TEXT,
  length_minutes   INTEGER,       -- Duration for looping
  status           VARCHAR(20)    NOT NULL DEFAULT 'fresh',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);
```

### Field Mapping
- `input_video_url` → Video source file
- `soundtrack_url` → Audio source file  
- `length_minutes` → Target duration for looping
- `status` → Job status (`waiting_render` → `rendering` → `completed`)
- `final_video_url` → Processed output file path

### Sample Job Insert
```sql
INSERT INTO dark_channel_soundtrack_videos (
  channel_id, input_prompt, youtube_title, 
  input_video_url, soundtrack_url, length_minutes, status
)
VALUES (
  1, 'Test video rendering', 'My Rendered Video',
  'https://example.com/video.mp4',
  'https://example.com/audio.wav',
  5, 'waiting_render'
);
```

## Job Processing Flow

1. **Job Discovery**: Worker queries for jobs with status `waiting_render`
2. **Job Claiming**: Updates status to `rendering` with worker ID
3. **Media Download**: Downloads video (MP4) and audio (WAV) files
4. **Processing**: 
   - Loops video to target duration
   - Loops audio to target duration (parallel)
   - Merges video and audio
5. **Completion**: Updates job with output path and metadata
6. **Cleanup**: Removes temporary files

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | Required | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Required | Your Supabase anon key |
| `JOB_CHECK_INTERVAL` | 5000 | Milliseconds between job checks |
| `TEMP_DIR` | ./temp | Temporary file directory |
| `OUTPUT_DIR` | ./output | Output file directory |
| `FFMPEG_PATH` | auto | Custom FFmpeg binary path |
| `FFPROBE_PATH` | auto | Custom FFprobe binary path |
| `LOG_LEVEL` | info | Logging level (error, warn, info, debug) |
| `WORKER_ID` | auto | Unique worker identifier |

### FFmpeg Optimization

The application uses these FFmpeg optimizations:

- **Ultra-fast preset** for speed
- **Hardware acceleration** where available
- **Parallel processing** for video/audio operations
- **Stream copying** to avoid re-encoding when possible
- **Smart looping** using `stream_loop` for efficiency

## Performance Tuning

### For 4K Video
- Ensure 8GB+ RAM
- Use SSD storage for temp files
- Set `TEMP_DIR` to fastest available disk
- Consider hardware acceleration (GPU encoding)

### For High Throughput
- Run multiple workers with different `WORKER_ID`
- Use separate temp directories per worker
- Monitor CPU and memory usage
- Optimize `JOB_CHECK_INTERVAL` based on job frequency

## Monitoring

The application provides structured logging with these levels:
- **ERROR**: Critical failures
- **WARN**: Important issues
- **INFO**: General operation info
- **DEBUG**: Detailed processing info

### Sample Log Output
```
[2024-01-01T12:00:00.000Z] [INFO] Video Render Worker starting...
[2024-01-01T12:00:01.000Z] [INFO] FFmpeg is available: ffmpeg version 6.0
[2024-01-01T12:00:02.000Z] [INFO] Looking for available jobs...
[2024-01-01T12:00:03.000Z] [INFO] Found job abc-123, attempting to claim it...
[2024-01-01T12:00:04.000Z] [INFO] Downloading media files for job abc-123...
[2024-01-01T12:00:05.000Z] [INFO] Processing media for job abc-123...
[2024-01-01T12:00:30.000Z] [INFO] Job abc-123 completed successfully in 26.50s
```

## Troubleshooting

### Common Issues

**FFmpeg not found**
```bash
# Check if FFmpeg is installed
ffmpeg -version

# Install if missing (macOS)
brew install ffmpeg
```

**Memory issues with large files**
- Increase available RAM
- Use smaller video files for testing
- Check disk space in temp directory

**Slow processing**
- Verify CPU utilization
- Check if running multiple workers
- Monitor disk I/O for bottlenecks

**Database connection issues**
- Verify Supabase URL and key
- Check network connectivity
- Review RLS policies



## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue with detailed information 