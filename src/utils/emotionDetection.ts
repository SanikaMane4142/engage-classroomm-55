
import { StudentEmotion } from '../components/EmotionMetrics';

// Emotion types and their detection thresholds
const emotionThresholds = {
  engaged: {
    eyeOpenness: 0.7, // Eyes need to be more open
    faceForward: 0.8, // Face needs to be facing forward
    movement: 0.3,    // Some movement is good (not too still, not too much)
  },
  bored: {
    eyeOpenness: 0.5, // Eyes partially open
    faceForward: 0.5, // Face not fully forward
    movement: 0.1,    // Very little movement
  },
  sleepy: {
    eyeOpenness: 0.3, // Eyes barely open
    faceForward: 0.4, // Face often tilted
    movement: 0.2,    // Some movement (nodding off)
  }
};

// Time periods in milliseconds
const EMOTION_UPDATE_INTERVAL = 5000; // Update every 5 seconds
const FRAME_ANALYSIS_INTERVAL = 1000; // Analyze frames every second

/**
 * Extract a frame from a video element
 */
const extractVideoFrame = (videoElement: HTMLVideoElement): ImageData | null => {
  try {
    if (!videoElement || videoElement.readyState !== 4) {
      console.log('Video not ready for frame extraction');
      return null;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context for canvas');
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Draw the current frame to canvas
    ctx.drawImage(videoElement, 0, 0);

    // Get image data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (error) {
    console.error('Error extracting video frame:', error);
    return null;
  }
};

/**
 * Basic face detection to determine if user is facing camera
 * In a real implementation, this would use a machine learning model
 */
const detectFaceDirection = (imageData: ImageData): number => {
  // This is a very simplified version that looks at pixel distribution
  // Real implementation would use a face detection model
  
  try {
    const { data, width, height } = imageData;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Sample pixels in center versus edges to estimate face position
    // Higher values mean face is likely more centered/forward
    let centerBrightness = 0;
    let edgeBrightness = 0;
    
    // Sample center region
    for (let y = centerY - 20; y < centerY + 20; y++) {
      for (let x = centerX - 20; x < centerX + 20; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          centerBrightness += brightness;
        }
      }
    }
    
    // Sample edge regions
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        if (x < 20 || x > width - 20 || y < 20 || y > height - 20) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          edgeBrightness += brightness;
        }
      }
    }
    
    // Calculate ratio (normalized to 0-1)
    const totalBrightness = centerBrightness + edgeBrightness;
    return totalBrightness > 0 ? Math.min(1, centerBrightness / totalBrightness * 2) : 0.5;
  } catch (error) {
    console.error('Error in face direction detection:', error);
    return 0.5; // Default to middle value on error
  }
};

/**
 * Detect eye openness from video frame
 * In a real implementation, this would use a machine learning model
 */
const detectEyeOpenness = (imageData: ImageData): number => {
  // This is a simplified version
  // Real implementation would use eye landmark detection
  
  try {
    const { data, width, height } = imageData;
    
    // Estimate eye regions (very rough approximation)
    const eyeRegionTop = Math.floor(height * 0.3);
    const eyeRegionBottom = Math.floor(height * 0.45);
    const leftEyeX = Math.floor(width * 0.3);
    const rightEyeX = Math.floor(width * 0.7);
    const eyeWidth = Math.floor(width * 0.15);
    
    let eyeContrastSum = 0;
    let pixelCount = 0;
    
    // Check contrast in eye regions (higher contrast might indicate open eyes)
    for (let y = eyeRegionTop; y < eyeRegionBottom; y++) {
      // Left eye region
      for (let x = leftEyeX - eyeWidth/2; x < leftEyeX + eyeWidth/2; x++) {
        if (x >= 0 && x < width) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          eyeContrastSum += Math.abs(brightness - 128); // Distance from middle gray
          pixelCount++;
        }
      }
      
      // Right eye region
      for (let x = rightEyeX - eyeWidth/2; x < rightEyeX + eyeWidth/2; x++) {
        if (x >= 0 && x < width) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          eyeContrastSum += Math.abs(brightness - 128); // Distance from middle gray
          pixelCount++;
        }
      }
    }
    
    // Normalize to 0-1
    const averageContrast = pixelCount > 0 ? eyeContrastSum / pixelCount / 255 : 0;
    return Math.min(1, averageContrast * 3); // Scale up somewhat for better distribution
  } catch (error) {
    console.error('Error in eye openness detection:', error);
    return 0.5; // Default to middle value on error
  }
};

/**
 * Detect movement between frames
 */
let previousFrameData: Uint8ClampedArray | null = null;
const detectMovement = (imageData: ImageData): number => {
  try {
    const { data, width, height } = imageData;
    
    if (!previousFrameData) {
      previousFrameData = new Uint8ClampedArray(data);
      return 0.5; // Default for first frame
    }
    
    let totalDifference = 0;
    const pixelCount = data.length / 4;
    
    // Compare with previous frame
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
      const diff = Math.abs(data[i] - previousFrameData[i]) + 
                  Math.abs(data[i+1] - previousFrameData[i+1]) + 
                  Math.abs(data[i+2] - previousFrameData[i+2]);
      totalDifference += diff;
    }
    
    // Save current frame for next comparison
    previousFrameData = new Uint8ClampedArray(data);
    
    // Normalize movement score (0-1)
    return Math.min(1, totalDifference / (pixelCount * 3 * 255) * 16); // Scale appropriately
  } catch (error) {
    console.error('Error in movement detection:', error);
    return 0.5; // Default to middle value on error
  }
};

/**
 * Detect emotion from video frame
 */
const detectEmotionFromFrame = (
  imageData: ImageData | null,
  previousMetrics: { eyeOpenness: number, faceForward: number, movement: number } | null = null
): { emotion: 'engaged' | 'bored' | 'sleepy', metrics: { eyeOpenness: number, faceForward: number, movement: number }, confidence: number } => {
  // Default values if we can't process the frame
  let eyeOpenness = previousMetrics?.eyeOpenness ?? 0.5;
  let faceForward = previousMetrics?.faceForward ?? 0.5;
  let movement = previousMetrics?.movement ?? 0.5;
  
  if (imageData) {
    // Analyze the frame if available
    eyeOpenness = detectEyeOpenness(imageData);
    faceForward = detectFaceDirection(imageData);
    movement = detectMovement(imageData);
  }
  
  // Calculate which emotion is closest to current metrics
  const engagedDiff = Math.abs(eyeOpenness - emotionThresholds.engaged.eyeOpenness) +
                     Math.abs(faceForward - emotionThresholds.engaged.faceForward) +
                     Math.abs(movement - emotionThresholds.engaged.movement);
                     
  const boredDiff = Math.abs(eyeOpenness - emotionThresholds.bored.eyeOpenness) +
                   Math.abs(faceForward - emotionThresholds.bored.faceForward) +
                   Math.abs(movement - emotionThresholds.bored.movement);
                   
  const sleepyDiff = Math.abs(eyeOpenness - emotionThresholds.sleepy.eyeOpenness) +
                    Math.abs(faceForward - emotionThresholds.sleepy.faceForward) +
                    Math.abs(movement - emotionThresholds.sleepy.movement);
  
  // Find the lowest difference (closest match)
  const minDiff = Math.min(engagedDiff, boredDiff, sleepyDiff);
  
  // Determine emotion and confidence
  let emotion: 'engaged' | 'bored' | 'sleepy';
  let rawConfidence: number;
  
  if (minDiff === engagedDiff) {
    emotion = 'engaged';
    rawConfidence = 1 - (minDiff / 3); // Normalize to 0-1 range
  } else if (minDiff === boredDiff) {
    emotion = 'bored';
    rawConfidence = 1 - (minDiff / 3);
  } else {
    emotion = 'sleepy';
    rawConfidence = 1 - (minDiff / 3);
  }
  
  // Scale confidence to more realistic range
  const confidence = 0.5 + (rawConfidence * 0.45); // Scale to 0.5-0.95 range
  
  return {
    emotion,
    metrics: { eyeOpenness, faceForward, movement },
    confidence
  };
};

/**
 * Track and analyze student video frames
 */
const studentMetrics: Record<string, { 
  emotion: 'engaged' | 'bored' | 'sleepy',
  metrics: { eyeOpenness: number, faceForward: number, movement: number },
  confidence: number,
  timestamp: string,
  frameCount: number
}> = {};

/**
 * Process a frame from a student's video
 */
const processStudentFrame = (
  studentId: string, 
  studentName: string, 
  videoElement: HTMLVideoElement | null
) => {
  try {
    if (!videoElement) {
      console.log(`No video element for student ${studentId}`);
      return;
    }
    
    const frame = extractVideoFrame(videoElement);
    const previousMetrics = studentMetrics[studentId]?.metrics ?? null;
    
    const { emotion, metrics, confidence } = detectEmotionFromFrame(frame, previousMetrics);
    
    // Update student metrics
    studentMetrics[studentId] = {
      emotion,
      metrics,
      confidence,
      timestamp: new Date().toISOString(),
      frameCount: (studentMetrics[studentId]?.frameCount ?? 0) + 1
    };
    
    console.log(`Student ${studentName} (${studentId}) emotion: ${emotion}, confidence: ${confidence.toFixed(2)}`);
  } catch (error) {
    console.error(`Error processing frame for student ${studentId}:`, error);
  }
};

/**
 * Start emotion detection for student videos
 */
export const startEmotionDetection = (
  callback: (emotionData: StudentEmotion[]) => void,
  getVideoElements: () => { studentId: string, studentName: string, videoElement: HTMLVideoElement | null }[]
): { stop: () => void } => {
  console.log("Starting real-time emotion detection from video feeds");
  
  // Process frames periodically
  const frameIntervalId = setInterval(() => {
    try {
      const studentVideos = getVideoElements();
      
      if (studentVideos.length === 0) {
        console.log("No student videos available yet for emotion detection");
        return;
      }
      
      // Process a frame from each student's video
      studentVideos.forEach(({ studentId, studentName, videoElement }) => {
        processStudentFrame(studentId, studentName, videoElement);
      });
    } catch (error) {
      console.error("Error in emotion detection frame processing:", error);
    }
  }, FRAME_ANALYSIS_INTERVAL);
  
  // Report emotion data periodically
  const reportIntervalId = setInterval(() => {
    try {
      const emotionData: StudentEmotion[] = Object.entries(studentMetrics)
        .map(([studentId, data]) => ({
          studentId,
          studentName: getVideoElements().find(v => v.studentId === studentId)?.studentName || 'Unknown Student',
          emotion: data.emotion,
          confidence: data.confidence,
          timestamp: data.timestamp
        }));
      
      if (emotionData.length > 0) {
        callback(emotionData);
      }
    } catch (error) {
      console.error("Error in emotion detection reporting:", error);
    }
  }, EMOTION_UPDATE_INTERVAL);
  
  return {
    stop: () => {
      clearInterval(frameIntervalId);
      clearInterval(reportIntervalId);
      studentMetrics = {};
      previousFrameData = null;
      console.log("Emotion detection stopped");
    }
  };
};

/**
 * Generate a description of student emotions for AI analysis
 */
export const generateEmotionDescription = (emotions: StudentEmotion[]): string => {
  // Count emotions
  const counts = {
    engaged: 0,
    bored: 0,
    sleepy: 0
  };
  
  emotions.forEach(student => {
    counts[student.emotion]++;
  });
  
  // Generate a natural language description
  const totalStudents = emotions.length;
  return `In a classroom of ${totalStudents} students, ${counts.engaged} appear engaged, ${counts.bored} seem bored, and ${counts.sleepy} look sleepy. ${
    counts.engaged > (totalStudents / 2) 
      ? 'Most students are engaged with the material.' 
      : counts.bored > (totalStudents / 2)
        ? 'Most students seem bored with the current activity.'
        : counts.sleepy > (totalStudents / 2)
          ? 'Many students appear tired or sleepy.'
          : 'Student engagement is mixed.'
  }`;
};
