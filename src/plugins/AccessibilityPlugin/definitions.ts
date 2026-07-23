export interface AccessibilityNode {
  id: string;
  className: string;
  text: string;
  contentDescription: string;
  isClickable: boolean;
  isEditable: boolean;
  isScrollable: boolean;
  boundsInScreen: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  children: AccessibilityNode[];
}

export interface AccessibilityPlugin {
  /**
   * Check if the accessibility service permission is granted.
   */
  checkPermissions(): Promise<{ granted: boolean }>;

  /**
   * Open the Android accessibility settings to allow the user to enable the service.
   */
  requestPermissions(): Promise<void>;

  /**
   * Get the current screen hierarchy as a tree of AccessibilityNode objects.
   */
  getScreenHierarchy(): Promise<{ root: AccessibilityNode | null }>;

  /**
   * Click a specific node on the screen by its ID.
   */
  clickNode(options: { id: string }): Promise<{ success: boolean }>;

  /**
   * Type text into a specific editable node on the screen by its ID.
   */
  typeText(options: { id: string; text: string }): Promise<{ success: boolean }>;

  /**
   * Scroll a scrollable node or the main screen.
   */
  scroll(options: { id?: string; direction: 'forward' | 'backward' }): Promise<{ success: boolean }>;
}
