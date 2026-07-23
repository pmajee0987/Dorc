package com.yourdomain.app.plugins

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.graphics.Rect
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject

class CustomAccessibilityService : AccessibilityService() {

    companion object {
        var instance: CustomAccessibilityService? = null
            private set

        fun isServiceEnabled(context: Context): Boolean {
            var accessibilityEnabled = 0
            val service = "${context.packageName}/${CustomAccessibilityService::class.java.canonicalName}"
            try {
                accessibilityEnabled = Settings.Secure.getInt(
                    context.applicationContext.contentResolver,
                    Settings.Secure.ACCESSIBILITY_ENABLED
                )
            } catch (e: Settings.SettingNotFoundException) {
                // Ignore
            }
            val mStringColonSplitter = TextUtils.SimpleStringSplitter(':')
            if (accessibilityEnabled == 1) {
                val settingValue = Settings.Secure.getString(
                    context.applicationContext.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                if (settingValue != null) {
                    mStringColonSplitter.setString(settingValue)
                    while (mStringColonSplitter.hasNext()) {
                        val accessibilityService = mStringColonSplitter.next()
                        if (accessibilityService.equals(service, ignoreCase = true)) {
                            return true
                        }
                    }
                }
            }
            return false
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // We capture node tree actively on demand, so we don't process passive events here
    }

    override fun onInterrupt() {
        // Interrupt
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    fun getScreenHierarchy(): JSObject? {
        val rootNode = rootInActiveWindow ?: return null
        return parseNode(rootNode)
    }

    private fun parseNode(node: AccessibilityNodeInfo?): JSObject? {
        if (node == null) return null
        
        val obj = JSObject()
        // Use hashcode as a unique id for this node snapshot
        val nodeId = node.hashCode().toString()
        obj.put("id", nodeId)
        
        obj.put("className", node.className?.toString() ?: "")
        obj.put("text", node.text?.toString() ?: "")
        obj.put("contentDescription", node.contentDescription?.toString() ?: "")
        obj.put("isClickable", node.isClickable)
        obj.put("isEditable", node.isEditable)
        obj.put("isScrollable", node.isScrollable)
        
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val boundsObj = JSObject()
        boundsObj.put("left", bounds.left)
        boundsObj.put("top", bounds.top)
        boundsObj.put("right", bounds.right)
        boundsObj.put("bottom", bounds.bottom)
        obj.put("boundsInScreen", boundsObj)

        val childrenArray = JSArray()
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val parsedChild = parseNode(child)
                if (parsedChild != null) {
                    childrenArray.put(parsedChild)
                }
            }
        }
        obj.put("children", childrenArray)
        
        return obj
    }

    fun clickNode(nodeId: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val targetNode = findNodeById(rootNode, nodeId) ?: return false
        return targetNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    fun typeText(nodeId: String, text: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val targetNode = findNodeById(rootNode, nodeId) ?: return false
        
        val arguments = Bundle()
        arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        return targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    fun scroll(nodeId: String?, direction: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val targetNode = if (nodeId != null) findNodeById(rootNode, nodeId) else rootNode
        
        if (targetNode == null) return false

        val action = if (direction == "forward") {
            AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        } else {
            AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        }

        return targetNode.performAction(action)
    }

    private fun findNodeById(node: AccessibilityNodeInfo?, id: String): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.hashCode().toString() == id) return node
        
        for (i in 0 until node.childCount) {
            val found = findNodeById(node.getChild(i), id)
            if (found != null) return found
        }
        return null
    }
}
