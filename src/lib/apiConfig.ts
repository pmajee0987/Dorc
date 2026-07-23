import { Capacitor } from '@capacitor/core';

export const getApiUrl = (path: string) => {
  if (Capacitor.isNativePlatform()) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin && (origin.includes('run.app') || origin.includes('localhost') || origin.includes('10.0.2.2'))) {
      return `${origin}${path}`;
    }
    return path;
  }
  return path;
};

