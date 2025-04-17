import * as tf from '@tensorflow/tfjs';
import { StudentEmotion } from '../components/EmotionMetrics';

// Flag to track model loading status
let modelsLoaded = false;
let faceModel: tf.GraphModel | null = null;
let expressionModel: tf.LayersModel | null = null;

// We'll keep this simple for the initial implementation
const FACE_DETECTION_MODEL_URL = 'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1';
const EXPRESSION_MODEL_URL = 'https://tensorflowjsrealtimemodel.s3.amazonaws.com/emotion_model.json';

/**
 * Initialize and load ML models
 */
export const initializeModels = async (): Promise<boolean> => {
  try {
    console.log("Loading ML models for emotion detection...");
    
    // Load face detection model (BlazeFace)
    faceModel = await tf.loadGraphModel(FACE_DETECTION_MODEL_URL);
    console.log("Face detection model loaded successfully");
    
    // Load expression recognition model
    expressionModel = await tf.loadLayersModel(EXPRESSION_MODEL_URL);
    console.log("Expression model loaded successfully");
    
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading ML models:", error);
    return false;
  }
};

/**
 * Process a video frame using ML models
 */
export const analyzeEmotionWithML = async (
  videoElement: HTMLVideoElement | null
): Promise<{
  emotion: 'engaged' | 'bored' | 'sleepy',
  metrics: { eyeOpenness: number, faceForward: number, movement: number },
  confidence: number
} | null> => {
  // If video element is not available or models aren't loaded, return null
  if (!videoElement || !modelsLoaded || !faceModel || !expressionModel) {
    return null;
  }
  
  try {
    // Convert video frame to tensor
    const videoTensor = tf.browser.fromPixels(videoElement);
    
    // Process with face detection model - using tf.expandDims to create a batch dimension
    const resizedTensor = tf.image.resizeBilinear(videoTensor, [128, 128]);
    const batchedTensor = tf.expandDims(resizedTensor, 0);
    const faceDetections = await faceModel.predict(batchedTensor) as tf.Tensor;
    
    // If no face detected, return fallback
    if (!faceDetections) {
      videoTensor.dispose();
      resizedTensor.dispose();
      batchedTensor.dispose();
      return {
        emotion: 'bored',
        metrics: { eyeOpenness: 0.5, faceForward: 0.5, movement: 0.2 },
        confidence: 0.3
      };
    }
    
    // Process face for expression recognition
    const face = tf.image.cropAndResize(
      videoTensor.expandDims(0), 
      [[0, 0, 1, 1]], // Use whole frame for now, in a real app we'd use face coords
      [0], 
      [48, 48]
    );
    
    // Convert to grayscale and normalize
    const grayscale = tf.mean(face, 3).expandDims(-1);
    const normalized = grayscale.div(255.0);
    
    // Get expression prediction
    const prediction = expressionModel.predict(normalized) as tf.Tensor;
    
    // Get values from tensors - now using .arraySync() which returns values directly
    const emotionValues = Array.from(prediction.arraySync() as number[][])[0];
    
    // Map expression values to our emotion categories
    // In a real model, you would have specific classes for engagement
    // Here we map standard emotion model outputs to our categories
    const eyeOpenness = emotionValues[0]; // First value as proxy for eye openness
    const faceForward = emotionValues[1]; // Second value as proxy for face direction
    const movement = emotionValues[2]; // Third value as proxy for movement
    
    // Determine emotion based on our metrics
    let emotion: 'engaged' | 'bored' | 'sleepy';
    let confidence: number;
    
    // Simple thresholding logic
    if (eyeOpenness > 0.7 && faceForward > 0.7) {
      emotion = 'engaged';
      confidence = 0.7 + (eyeOpenness * 0.2);
    } else if (eyeOpenness < 0.3) {
      emotion = 'sleepy';
      confidence = 0.5 + ((1 - eyeOpenness) * 0.3);
    } else {
      emotion = 'bored';
      confidence = 0.6;
    }
    
    // Clean up tensors
    videoTensor.dispose();
    resizedTensor.dispose();
    batchedTensor.dispose();
    face.dispose();
    grayscale.dispose();
    normalized.dispose();
    prediction.dispose();
    
    // Return detection result
    return {
      emotion,
      metrics: { eyeOpenness, faceForward, movement },
      confidence: Math.min(confidence, 0.95)
    };
  } catch (error) {
    console.error("Error analyzing frame with ML models:", error);
    return {
      emotion: 'bored',
      metrics: { eyeOpenness: 0.5, faceForward: 0.5, movement: 0.2 },
      confidence: 0.4
    };
  }
};
