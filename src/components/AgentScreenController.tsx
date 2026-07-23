import React, { useState } from 'react';
import { Accessibility } from '../plugins/AccessibilityPlugin';
import { askAgentToDecide, executeAgentActionWithConfirmation, AgentAction } from '../lib/ScreenAgent';

export function AgentScreenController() {
  const [goal, setGoal] = useState('Purchase the items in the cart');
  const [status, setStatus] = useState('Idle');
  const [lastAction, setLastAction] = useState<AgentAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckPermission = async () => {
    const { granted } = await Accessibility.checkPermissions();
    if (!granted) {
      if (window.confirm('Accessibility Service is not enabled. Open Settings?')) {
        await Accessibility.requestPermissions();
      }
    } else {
      alert('Accessibility Service is enabled!');
    }
  };

  const handleStepAgent = async () => {
    setIsProcessing(true);
    setStatus('Analyzing Screen...');
    try {
      const action = await askAgentToDecide(goal);
      setLastAction(action);
      
      setStatus(`Executing: ${action.type}`);
      const success = await executeAgentActionWithConfirmation(action);
      
      if (success) {
        setStatus(`Action completed. (${action.reason})`);
      } else {
        setStatus('Action failed or cancelled.');
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-4 max-w-md mx-auto my-4 text-white">
      <h2 className="text-xl font-bold">Android AI Auto-Pilot</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">Agent Goal</label>
        <input 
          type="text" 
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded p-2 focus:outline-none focus:border-indigo-500"
          placeholder="e.g., Delete all read emails"
        />
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleCheckPermission}
          className="flex-1 bg-slate-800 hover:bg-slate-700 p-2 rounded text-sm font-semibold transition-colors"
        >
          Check Permissions
        </button>
        <button 
          onClick={handleStepAgent}
          disabled={isProcessing}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 p-2 rounded text-sm font-semibold transition-colors"
        >
          {isProcessing ? 'Thinking...' : 'Next AI Step'}
        </button>
      </div>

      <div className="p-3 bg-slate-950 rounded text-sm">
        <p><strong className="text-indigo-400">Status:</strong> {status}</p>
        {lastAction && (
          <div className="mt-2 font-mono text-xs text-slate-400 whitespace-pre-wrap">
            {JSON.stringify(lastAction, null, 2)}
          </div>
        )}
      </div>
      
      <div className="text-xs text-slate-500 mt-2">
        Note: The plugin only functions natively on Android.
      </div>
    </div>
  );
}
