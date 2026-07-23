import { Camera } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem } from '@capacitor/filesystem';
import { Dialog } from '@capacitor/dialog';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface AudioPermissionPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
}

const AudioPermissionHelper = registerPlugin<AudioPermissionPlugin>('AudioPermissionHelper');

type PermissionType = 'microphone' | 'camera' | 'notifications' | 'media' | 'storage';

interface PermissionRequest {
  type: PermissionType;
  title: string;
  reason: string;
  resolve: (granted: boolean) => void;
}

class PermissionManager {
  private listener: ((req: PermissionRequest | null) => void) | null = null;
  private currentRequest: PermissionRequest | null = null;

  setListener(listener: (req: PermissionRequest | null) => void) {
    this.listener = listener;
    if (this.currentRequest) {
      this.listener(this.currentRequest);
    }
  }

  async requestPermission(type: PermissionType, title: string, reason: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Web permission check & cache validation
      try {
        if (type === 'notifications' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            localStorage.setItem(`sweety_perm_${type}`, 'granted');
            return true;
          } else if (Notification.permission === 'denied') {
            localStorage.removeItem(`sweety_perm_${type}`);
          }
        }
        if (type === 'microphone' || type === 'camera') {
          const pName = type === 'microphone' ? 'microphone' : 'camera';
          if (navigator.permissions) {
            const res = await navigator.permissions.query({ name: pName as PermissionName });
            if (res.state === 'granted') {
              localStorage.setItem(`sweety_perm_${type}`, 'granted');
              return true;
            } else {
              localStorage.removeItem(`sweety_perm_${type}`);
            }
          }
        }
      } catch (e) {
        console.warn('Web permission check failed', e);
      }
    } else {
      // Native logic check
      try {
        if (type === 'camera') {
          const status = await Camera.checkPermissions();
          if (status.camera === 'granted') {
            localStorage.setItem('sweety_perm_camera', 'granted');
            return true;
          } else {
            localStorage.removeItem('sweety_perm_camera');
          }
        } else if (type === 'notifications') {
          const status = await PushNotifications.checkPermissions();
          if (status.receive === 'granted') {
            localStorage.setItem('sweety_perm_notifications', 'granted');
            return true;
          } else {
            localStorage.removeItem('sweety_perm_notifications');
          }
        } else if (type === 'microphone') {
          const res = await AudioPermissionHelper.checkPermission();
          if (res.granted) {
            localStorage.setItem('sweety_perm_microphone', 'granted');
            return true;
          } else {
            localStorage.removeItem('sweety_perm_microphone');
          }
        }
      } catch (e) {
        console.warn('Native permission check failed', e);
      }
    }

    return new Promise((resolve) => {
      this.currentRequest = {
        type,
        title,
        reason,
        resolve: async (userAgreed: boolean) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);

          if (!userAgreed) {
            localStorage.removeItem(`sweety_perm_${type}`);
            resolve(false);
            return;
          }

          // Trigger actual native or browser prompt after user accepts custom UI explanation
          try {
            if (Capacitor.isNativePlatform()) {
              if (type === 'camera') {
                const res = await Camera.requestPermissions();
                if (res.camera === 'granted') {
                  localStorage.setItem('sweety_perm_camera', 'granted');
                  resolve(true);
                } else {
                  localStorage.removeItem('sweety_perm_camera');
                  resolve(false);
                }
              } else if (type === 'notifications') {
                const res = await PushNotifications.requestPermissions();
                if (res.receive === 'granted') {
                  localStorage.setItem('sweety_perm_notifications', 'granted');
                  resolve(true);
                } else {
                  localStorage.removeItem('sweety_perm_notifications');
                  resolve(false);
                }
              } else if (type === 'microphone') {
                const res = await AudioPermissionHelper.requestPermission();
                if (res.granted) {
                  localStorage.setItem('sweety_perm_microphone', 'granted');
                  resolve(true);
                } else {
                  localStorage.removeItem('sweety_perm_microphone');
                  // Prompt user to open app settings if permanently denied
                  const settingsPrompt = await Dialog.confirm({
                    title: 'Microphone Permission Required',
                    message: 'Microphone permission is permanently denied or blocked. Please open App Settings to allow microphone access.',
                    okButtonTitle: 'Open Settings',
                    cancelButtonTitle: 'Cancel'
                  });
                  if (settingsPrompt.value) {
                    await AudioPermissionHelper.openSettings();
                  }
                  resolve(false);
                }
              } else {
                localStorage.setItem(`sweety_perm_${type}`, 'granted');
                resolve(true);
              }
            } else {
              // Web actual request
              if (type === 'notifications' && 'Notification' in window) {
                const res = await Notification.requestPermission();
                if (res === 'granted') {
                  localStorage.setItem(`sweety_perm_${type}`, 'granted');
                  resolve(true);
                } else {
                  localStorage.removeItem(`sweety_perm_${type}`);
                  resolve(false);
                }
              } else if (type === 'camera' || type === 'microphone') {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: type === 'camera', 
                    audio: type === 'microphone' || type === 'camera' 
                  });
                  stream.getTracks().forEach(t => t.stop());
                  localStorage.setItem(`sweety_perm_${type}`, 'granted');
                  resolve(true);
                } catch (e) {
                  console.warn('getUserMedia prompt failed or denied:', e);
                  localStorage.removeItem(`sweety_perm_${type}`);
                  resolve(false);
                }
              } else {
                localStorage.setItem(`sweety_perm_${type}`, 'granted');
                resolve(true);
              }
            }
          } catch (err) {
            console.error('Final permission request failed:', err);
            localStorage.removeItem(`sweety_perm_${type}`);
            resolve(false);
          }
        }
      };

      if (this.listener) {
        this.listener(this.currentRequest);
      } else {
        // Fallback using Capacitor Dialog if UI listener not ready
        Dialog.confirm({
          title,
          message: reason,
          okButtonTitle: 'Allow',
          cancelButtonTitle: 'Deny'
        }).then(res => {
          this.currentRequest?.resolve(res.value);
        });
      }
    });
  }
}

export const permissionManager = new PermissionManager();

