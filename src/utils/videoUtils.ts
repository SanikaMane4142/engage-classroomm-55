
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
 * Get user media stream with a specific device ID
 */
export const getUserMediaWithDeviceId = async (deviceId: string, audio = true) => {
  try {
    console.log(`Getting user media with device ID: ${deviceId}`);
    const constraints = {
      video: { 
        deviceId: { exact: deviceId },
        width: 1280, 
        height: 720 
      },
      audio,
    };
    
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error(`Error accessing media device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Get available video input devices
 */
export const getVideoInputDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log(`Found ${videoDevices.length} video devices:`, videoDevices);
    return videoDevices;
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return [];
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
 * Create multiple student streams for simulating multiple students
 * Using REAL cameras for ALL students when possible
 */
export const createMultipleStudentStreams = async (count: number) => {
  console.log(`Creating ${count} student streams with real cameras`);
  const streams: { id: string; name: string; stream: MediaStream }[] = [];
  
  try {
    // Get all available video devices
    const videoDevices = await getVideoInputDevices();
    
    // First, determine which device we'll use for the teacher (local) stream
    // We'll skip this device when assigning devices to students
    const teacherStream = await getUserMedia(true, true);
    const teacherTrack = teacherStream.getVideoTracks()[0];
    const teacherDeviceId = teacherTrack ? teacherTrack.getSettings().deviceId : '';
    
    console.log(`Teacher using device ID: ${teacherDeviceId}`);
    
    // Filter out the teacher's device
    const studentVideoDevices = videoDevices.filter(device => 
      device.deviceId !== teacherDeviceId && device.deviceId !== ''
    );
    
    console.log(`Found ${studentVideoDevices.length} available devices for students`);
    
    // Stop the teacher stream we just created for detection
    stopMediaStream(teacherStream);
    
    // For each available device, create a student stream
    for (let i = 0; i < Math.min(count, studentVideoDevices.length); i++) {
      try {
        const deviceId = studentVideoDevices[i].deviceId;
        console.log(`Creating stream for student ${i+1} with device ID: ${deviceId}`);
        
        const stream = await getUserMediaWithDeviceId(deviceId, true);
        
        streams.push({
          id: `${i + 1}`,
          name: getStudentName(i),
          stream,
        });
        
        console.log(`Successfully added real camera stream for student ${i+1}`);
      } catch (err) {
        console.error(`Failed to access real camera for student ${i+1}:`, err);
        // Fall back to canvas stream
        const canvasStream = await createCanvasStreamWithName(`Student ${i+1}`);
        streams.push({
          id: `${i + 1}`,
          name: getStudentName(i),
          stream: canvasStream,
        });
      }
    }
    
    // If we couldn't get enough real cameras, create canvas streams for the rest
    for (let i = streams.length; i < count; i++) {
      try {
        console.log(`Creating canvas stream for student ${i+1} (not enough cameras)`);
        const stream = await createCanvasStreamWithName(`Student ${i+1}`);
        streams.push({
          id: `${i + 1}`,
          name: getStudentName(i),
          stream,
        });
      } catch (error) {
        console.error(`Failed to create stream for student ${i+1}:`, error);
      }
    }
    
    console.log(`Successfully created ${streams.length} student streams`);
    return streams;
  } catch (error) {
    console.error('Error creating student streams:', error);
    
    // Fall back to all canvas streams if something went wrong
    return createAllCanvasStreams(count);
  }
};

/**
 * Create all canvas-based streams as a fallback
 */
const createAllCanvasStreams = async (count: number) => {
  console.log(`Creating ${count} canvas-based student streams as fallback`);
  const streams: { id: string; name: string; stream: MediaStream }[] = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const stream = await createCanvasStreamWithName(`Student ${i+1}`);
      streams.push({
        id: `${i + 1}`,
        name: getStudentName(i),
        stream,
      });
    } catch (error) {
      console.error(`Failed to create canvas stream for student ${i+1}:`, error);
    }
  }
  
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
