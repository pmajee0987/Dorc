import { registerPlugin } from '@capacitor/core';
import type { AccessibilityPlugin } from './definitions';

const Accessibility = registerPlugin<AccessibilityPlugin>('AccessibilityPlugin', {
  web: () => import('./web').then(m => new m.AccessibilityWeb()),
});

export * from './definitions';
export { Accessibility };
