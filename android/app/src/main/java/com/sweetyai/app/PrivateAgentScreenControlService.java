package com.sweetyai.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;

public class PrivateAgentScreenControlService extends AccessibilityService {
    private static final String TAG = "PrivateAgentScreenControl";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode != null) {
            // Parses the Android UI tree to map clickable, scrollable, and editable elements
            parseNodeTree(rootNode, 0);
            rootNode.recycle();
        }
    }

    private void parseNodeTree(AccessibilityNodeInfo node, int depth) {
        if (node == null) return;

        boolean isClickable = node.isClickable();
        boolean isScrollable = node.isScrollable();
        boolean isEditable = node.isEditable();
        CharSequence text = node.getText();
        CharSequence className = node.getClassName();

        if (isClickable || isScrollable || isEditable || (text != null && text.length() > 0)) {
            Log.d(TAG, "UI Node [Depth " + depth + "]: Class=" + className 
                + ", Text=" + text 
                + ", Clickable=" + isClickable 
                + ", Scrollable=" + isScrollable 
                + ", Editable=" + isEditable);
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                parseNodeTree(child, depth + 1);
                child.recycle();
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "PrivateAgent Screen Control service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS 
                   | AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
        Log.i(TAG, "PrivateAgent Screen Control Accessibility Service Connected Successfully");
    }
}
