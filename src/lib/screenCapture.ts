
import { Capacitor } from '@capacitor/core';

let activeStream: MediaStream | null = null;
let streamListeners: Array<(active: boolean) => void> = [];

export async function captureScreenSnapshot(stream?: MediaStream): Promise<string | null> {
  try {
    const localStream = stream || activeStream;
    // Only capture if stream is provided or activeStream is currently running
    if (!localStream || !localStream.active) return null;

    const videoTracks = localStream.getVideoTracks();
    if (!videoTracks.length || videoTracks[0].readyState !== 'live') return null;

    const video = document.createElement('video');
    video.srcObject = localStream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(true), 1200);
      video.onloadedmetadata = () => {
        video.play().then(() => {
          clearTimeout(timeout);
          resolve(true);
        }).catch(() => {
          clearTimeout(timeout);
          resolve(true);
        });
      };
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error('Error capturing screen snapshot:', err);
    return null;
  }
}

export async function startScreenStream(): Promise<MediaStream | null> {
  if (activeStream) return activeStream;

  // Try getDisplayMedia first (screen share)
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
    try {
      activeStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      activeStream.getTracks().forEach(track => {
        track.onended = () => {
          activeStream = null;
          notifyListeners(false);
        };
      });
      
      notifyListeners(true);
      return activeStream;
    } catch (err) {
      console.warn('getDisplayMedia failed or cancelled, trying userMedia camera stream as fallback:', err);
    }
  }

  // Fallback to camera stream if getDisplayMedia is not available, restricted, or rejected
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      
      activeStream.getTracks().forEach(track => {
        track.onended = () => {
          activeStream = null;
          notifyListeners(false);
        };
      });
      
      notifyListeners(true);
      return activeStream;
    } catch (err) {
      console.error('Failed to start camera stream fallback:', err);
    }
  }

  return null;
}

export function stopActiveScreenStream() {
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
    notifyListeners(false);
  }
}

export function getActiveScreenStream() {
  return activeStream;
}

export function subscribeToScreenStream(callback: (active: boolean) => void) {
  streamListeners.push(callback);
  return () => {
    streamListeners = streamListeners.filter(l => l !== callback);
  };
}

function notifyListeners(active: boolean) {
  streamListeners.forEach(l => l(active));
}
