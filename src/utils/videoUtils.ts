
// Helper functions for managing media streams and devices

/**
 * Get user media stream (camera and/or microphone)
 */
export const getUserMedia = async (video = true, audio = true) => {
  try {
    const constraints = {
      video: video ? { width: 1280, height: 720 } : false,
      audio,
    };
    
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error;
  }
};

/**
 * Get display media stream (screen sharing)
 */
export const getDisplayMedia = async () => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
  } catch (error) {
    console.error('Error sharing screen:', error);
    throw error;
  }
};

/**
 * Stop all tracks in a media stream
 */
export const stopMediaStream = (stream: MediaStream | null) => {
  if (!stream) return;
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

/**
 * Add track to an HTML video element
 */
export const attachMediaStream = (videoElement: HTMLVideoElement | null, stream: MediaStream | null) => {
  if (!videoElement || !stream) {
    console.log("Cannot attach stream - video element or stream is null");
    return;
  }
  
  console.log("Attaching media stream to video element");
  videoElement.srcObject = stream;
  
  // Ensure the video plays by handling the loadedmetadata event
  videoElement.onloadedmetadata = () => {
    videoElement.play().catch(e => console.error('Error playing video:', e));
  };
};

/**
 * Replace tracks in a stream with tracks from another stream
 */
export const replaceMediaStreamTracks = (oldStream: MediaStream | null, newStream: MediaStream) => {
  if (!oldStream) return newStream;
  
  oldStream.getTracks().forEach(track => {
    track.stop();
  });
  
  const newStreamTracks = newStream.getTracks();
  
  newStreamTracks.forEach(newTrack => {
    oldStream.addTrack(newTrack);
  });
  
  return oldStream;
};

/**
 * Utility to create a mock remote stream for demo purposes
 * Tries to use a real camera first
 */
export const createMockRemoteStream = async () => {
  try {
    console.log("Getting real camera for mock remote stream");
    // Use the actual camera for the "remote" user to better simulate a real meeting
    const stream = await getUserMedia(true, true);
    
    if (stream) {
      console.log("Successfully created mock remote stream with real camera");
      return stream;
    } else {
      throw new Error("Failed to get camera stream");
    }
  } catch (error) {
    console.error('Error creating real camera mock stream:', error);
    
    // Fall back to canvas-based stream if camera access fails
    return createCanvasStream();
  }
};

/**
 * Creates a canvas-based stream as fallback
 */
const createCanvasStream = async () => {
  console.log("Creating canvas-based fallback stream");
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  
  // Draw something on the canvas
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Create a gradient for the background
    const gradient = ctx.createLinearGradient(0, 0, 640, 480);
    gradient.addColorStop(0, '#4338ca');
    gradient.addColorStop(1, '#3b82f6');
    
    const animate = () => {
      if (!ctx) return;
      
      // Clear the canvas
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw a text
      const time = new Date().toLocaleTimeString();
      ctx.font = '40px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Remote Camera Unavailable', canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = '30px Arial';
      ctx.fillText(time, canvas.width / 2, canvas.height / 2 + 30);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  try {
    // @ts-ignore - Canvas captureStream is not in the TypeScript types
    const stream = canvas.captureStream(30);
    
    // Adding an audio track for completeness
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioTrack = audioStream.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    } catch (e) {
      console.warn('Could not add audio to mock stream:', e);
    }
    
    return stream;
  } catch (error) {
    console.error('Error creating canvas stream:', error);
    throw error;
  }
};

/**
 * Create multiple mock remote streams for simulating multiple students
 * Attempts to use real cameras for all students when possible
 */
export const createMultipleStudentStreams = async (count: number) => {
  console.log(`Creating ${count} student streams, attempting to use real cameras`);
  const streams: { id: string; name: string; stream: MediaStream }[] = [];
  
  // Try to get all available video devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log(`Found ${videoDevices.length} video devices:`, videoDevices);
    
    // For each video device, try to create a stream
    for (let i = 0; i < Math.min(count, videoDevices.length); i++) {
      try {
        const deviceId = videoDevices[i].deviceId;
        console.log(`Attempting to access camera device ${deviceId}`);
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: true
        });
        
        streams.push({
          id: `${i + 1}`,
          name: getStudentName(i),
          stream,
        });
        
        console.log(`Successfully added stream from camera device ${deviceId}`);
      } catch (err) {
        console.error(`Failed to access camera device ${i}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to enumerate devices:', err);
  }
  
  // If we couldn't get enough real cameras, create canvas streams for the rest
  for (let i = streams.length; i < count; i++) {
    try {
      console.log(`Creating canvas stream for student ${i + 1} (not enough cameras)`);
      const stream = await createCanvasStreamWithName(`Student ${i + 1}`);
      streams.push({
        id: `${i + 1}`,
        name: getStudentName(i),
        stream,
      });
    } catch (error) {
      console.error(`Failed to create stream for student ${i + 1}:`, error);
    }
  }
  
  console.log(`Successfully created ${streams.length} student streams`);
  return streams;
};

/**
 * Get a random student name
 */
const getStudentName = (index: number) => {
  const names = [
    'Alice Johnson',
    'Bob Smith',
    'Charlie Brown',
    'Diana Prince',
    'Evan Williams',
    'Fiona Apple',
    'George Miller',
    'Hannah Montana',
  ];
  
  return names[index % names.length];
};

/**
 * Creates a canvas-based stream with a specific student name
 */
const createCanvasStreamWithName = async (name: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Create a random color for this student
    const colors = ['#4338ca', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d'];
    const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
    const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
    
    const gradient = ctx.createLinearGradient(0, 0, 640, 480);
    gradient.addColorStop(0, randomColor1);
    gradient.addColorStop(1, randomColor2);
    
    const animate = () => {
      if (!ctx) return;
      
      // Clear the canvas
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the text
      const time = new Date().toLocaleTimeString();
      ctx.font = '40px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = '30px Arial';
      ctx.fillText(time, canvas.width / 2, canvas.height / 2 + 30);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  try {
    // @ts-ignore - Canvas captureStream is not in the TypeScript types
    const stream = canvas.captureStream(30);
    
    // Add audio to the stream if possible
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioTrack = audioStream.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    } catch (e) {
      console.warn(`Could not add audio to stream for ${name}:`, e);
    }
    
    return stream;
  } catch (error) {
    console.error(`Error creating canvas stream for ${name}:`, error);
    throw error;
  }
};
