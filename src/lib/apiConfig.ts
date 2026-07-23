import { Capacitor } from '@capacitor/core';

const PRODUCTION_BACKEND_URL = 'https://ais-pre-nqpfp4kzeoja4y2uojfdb3-223558786873.asia-east1.run.app';

export const getApiUrl = (path: string) => {
  if (Capacitor.isNativePlatform()) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // If running inside Capacitor webview on native device, origin is http://localhost or https://localhost
    if (origin && origin.includes('run.app')) {
      return `${origin}${path}`;
    }
    // On native Android device, route requests to Cloud Run backend
    return `${PRODUCTION_BACKEND_URL}${path}`;
  }
  return path;
};


