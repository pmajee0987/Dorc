import { WebPlugin } from '@capacitor/core';
import type { AccessibilityPlugin, AccessibilityNode } from './definitions';

export class AccessibilityWeb extends WebPlugin implements AccessibilityPlugin {
  async checkPermissions(): Promise<{ granted: boolean }> {
    console.warn('AccessibilityPlugin: checkPermissions is not supported on web.');
    return { granted: false };
  }

  async requestPermissions(): Promise<void> {
    console.warn('AccessibilityPlugin: requestPermissions is not supported on web.');
  }

  async getScreenHierarchy(): Promise<{ root: AccessibilityNode | null }> {
    console.warn('AccessibilityPlugin: getScreenHierarchy is not supported on web.');
    return { root: null };
  }

  async clickNode(_options: { id: string }): Promise<{ success: boolean }> {
    console.warn('AccessibilityPlugin: clickNode is not supported on web.');
    return { success: false };
  }

  async typeText(_options: { id: string; text: string }): Promise<{ success: boolean }> {
    console.warn('AccessibilityPlugin: typeText is not supported on web.');
    return { success: false };
  }

  async scroll(_options: { id?: string; direction: 'forward' | 'backward' }): Promise<{ success: boolean }> {
    console.warn('AccessibilityPlugin: scroll is not supported on web.');
    return { success: false };
  }
}
