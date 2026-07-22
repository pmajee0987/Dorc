export interface MappedUIElement {
  id: string;
  tagName: string;
  type: 'clickable' | 'scrollable' | 'editable' | 'text';
  text: string;
  className: string;
  isClickable: boolean;
  isScrollable: boolean;
  isEditable: boolean;
  bounds: { top: number; left: number; width: number; height: number };
}

export interface MappedUITree {
  timestamp: number;
  totalNodes: number;
  clickableCount: number;
  scrollableCount: number;
  editableCount: number;
  elements: MappedUIElement[];
}

export function parseCurrentUITree(): MappedUITree {
  const elements: MappedUIElement[] = [];
  let clickableCount = 0;
  let scrollableCount = 0;
  let editableCount = 0;

  const allNodes = Array.from(document.querySelectorAll('*'));

  allNodes.forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return;

    // Skip hidden elements
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || node.style.display === 'none' || node.style.visibility === 'hidden') {
      return;
    }

    const tagName = node.tagName.toLowerCase();
    const style = window.getComputedStyle(node);
    
    // Detect clickable
    const isClickable = 
      tagName === 'button' || 
      tagName === 'a' || 
      node.getAttribute('role') === 'button' ||
      node.onclick !== null ||
      style.cursor === 'pointer' ||
      node.hasAttribute('data-action');

    // Detect scrollable
    const isScrollable = 
      (style.overflowY === 'scroll' || style.overflowY === 'auto' || style.overflow === 'scroll' || style.overflow === 'auto') && 
      node.scrollHeight > node.clientHeight;

    // Detect editable
    const isEditable = 
      tagName === 'input' || 
      tagName === 'textarea' || 
      node.isContentEditable || 
      node.getAttribute('role') === 'textbox';

    const textContent = (node.innerText || node.getAttribute('aria-label') || node.getAttribute('placeholder') || '').trim();

    if (isClickable || isScrollable || isEditable || (textContent && textContent.length > 0 && textContent.length < 80)) {
      let type: MappedUIElement['type'] = 'text';
      if (isClickable) {
        type = 'clickable';
        clickableCount++;
      } else if (isEditable) {
        type = 'editable';
        editableCount++;
      } else if (isScrollable) {
        type = 'scrollable';
        scrollableCount++;
      }

      elements.push({
        id: node.id || `node_${index}`,
        tagName,
        type,
        text: textContent.slice(0, 60),
        className: node.className ? String(node.className).slice(0, 40) : '',
        isClickable,
        isScrollable,
        isEditable,
        bounds: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      });
    }
  });

  return {
    timestamp: Date.now(),
    totalNodes: elements.length,
    clickableCount,
    scrollableCount,
    editableCount,
    elements: elements.slice(0, 50) // Top 50 key elements
  };
}

export function openAccessibilitySettings() {
  try {
    // Attempt android settings intent
    window.location.href = 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end';
  } catch (e) {
    console.warn('Unable to directly launch Android Accessibility intent', e);
  }
}
