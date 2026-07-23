import { GoogleGenAI } from '@google/genai';
import { Accessibility } from '../plugins/AccessibilityPlugin';
import type { AccessibilityNode } from '../plugins/AccessibilityPlugin';

// Note: Replace with your actual Gemini API Key handling (e.g. from environment or state)
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export type AgentAction = 
  | { type: 'click'; id: string; reason: string }
  | { type: 'type'; id: string; text: string; reason: string }
  | { type: 'scroll'; direction: 'forward' | 'backward'; reason: string }
  | { type: 'done'; reason: string }
  | { type: 'error'; reason: string };

function formatHierarchy(node: AccessibilityNode, depth = 0): string {
  if (!node) return '';
  
  const indent = '  '.repeat(depth);
  let str = `${indent}[Node: ${node.id}] ${node.className}`;
  if (node.text) str += ` | Text: "${node.text}"`;
  if (node.contentDescription) str += ` | Desc: "${node.contentDescription}"`;
  
  let flags = [];
  if (node.isClickable) flags.push('Clickable');
  if (node.isEditable) flags.push('Editable');
  if (node.isScrollable) flags.push('Scrollable');
  
  if (flags.length > 0) {
    str += ` | Flags: [${flags.join(', ')}]`;
  }
  
  str += '\n';
  
  if (node.children) {
    for (const child of node.children) {
      str += formatHierarchy(child, depth + 1);
    }
  }
  return str;
}

const SENSITIVE_TERMS = ['submit', 'delete', 'purchase', 'buy', 'send', 'pay', 'checkout', 'confirm'];

function isSensitiveAction(action: AgentAction, node?: AccessibilityNode | null): boolean {
  if (action.type === 'click' || action.type === 'type') {
    const textToCheck = (node?.text || node?.contentDescription || '').toLowerCase();
    
    // Check if any sensitive term is present in the target node's text
    const isSensitiveText = SENSITIVE_TERMS.some(term => textToCheck.includes(term));
    if (isSensitiveText) return true;
  }
  return false;
}

function findNodeInHierarchy(root: AccessibilityNode, id: string): AccessibilityNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInHierarchy(child, id);
      if (found) return found;
    }
  }
  return null;
}

export async function askAgentToDecide(goal: string): Promise<AgentAction> {
  const perm = await Accessibility.checkPermissions();
  if (!perm.granted) {
    throw new Error('Accessibility permissions not granted. Please enable the service.');
  }

  const { root } = await Accessibility.getScreenHierarchy();
  if (!root) {
    throw new Error('Could not retrieve screen hierarchy.');
  }

  const hierarchyStr = formatHierarchy(root);

  const prompt = `
You are an AI Agent operating an Android device via Accessibility Services.
Goal: ${goal}

Current Screen Hierarchy:
${hierarchyStr}

Decide the next action to take to progress towards the goal.
Respond ONLY with a valid JSON object matching this schema:
{
  "type": "click" | "type" | "scroll" | "done" | "error",
  "id": "node_id_to_interact_with_if_applicable",
  "text": "text_to_type_if_applicable",
  "direction": "forward_or_backward_if_scroll",
  "reason": "short explanation of why you chose this action"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) throw new Error('AI returned empty response.');
    
    const action = JSON.parse(response.text) as AgentAction;
    return action;

  } catch (err: any) {
    return { type: 'error', reason: err.message };
  }
}

export async function executeAgentActionWithConfirmation(action: AgentAction): Promise<boolean> {
  if (action.type === 'done') {
    console.log('Agent finished:', action.reason);
    return true;
  }
  
  if (action.type === 'error') {
    console.error('Agent error:', action.reason);
    return false;
  }

  const { root } = await Accessibility.getScreenHierarchy();
  let targetNode: AccessibilityNode | null = null;
  if ('id' in action && action.id) {
    targetNode = root ? findNodeInHierarchy(root, action.id) : null;
  }

  // Sensitive Confirmation Check
  if (isSensitiveAction(action, targetNode)) {
    const confirmed = window.confirm(`AI wants to perform a sensitive action: \nAction: ${action.type.toUpperCase()} \nTarget: "${targetNode?.text || targetNode?.contentDescription || 'Unknown'}" \nReason: ${action.reason}\n\nDo you want to proceed?`);
    if (!confirmed) {
      console.log('Action cancelled by user.');
      return false;
    }
  }

  // Execute Action
  switch (action.type) {
    case 'click':
      console.log(`Executing Click on ${action.id}`);
      return (await Accessibility.clickNode({ id: action.id })).success;
    
    case 'type':
      console.log(`Executing Type "${action.text}" on ${action.id}`);
      return (await Accessibility.typeText({ id: action.id, text: action.text })).success;
    
    case 'scroll':
      console.log(`Executing Scroll ${action.direction}`);
      return (await Accessibility.scroll({ direction: action.direction })).success;
      
    default:
      return false;
  }
}
