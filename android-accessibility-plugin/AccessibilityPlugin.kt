package com.yourdomain.app.plugins

import android.content.Intent
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AccessibilityPlugin")
class AccessibilityPlugin : Plugin() {

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        val granted = CustomAccessibilityService.isServiceEnabled(context)
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun getScreenHierarchy(call: PluginCall) {
        if (!CustomAccessibilityService.isServiceEnabled(context)) {
            call.reject("Accessibility Service is not enabled")
            return
        }

        val instance = CustomAccessibilityService.instance
        if (instance == null) {
            call.reject("Accessibility Service instance is null")
            return
        }

        val rootNode = instance.getScreenHierarchy()
        val ret = JSObject()
        if (rootNode != null) {
            ret.put("root", rootNode)
        } else {
            ret.put("root", JSObject.NULL)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun clickNode(call: PluginCall) {
        val id = call.getString("id")
        if (id == null) {
            call.reject("Node ID is required")
            return
        }

        val instance = CustomAccessibilityService.instance
        if (instance == null) {
            call.reject("Accessibility Service instance is null")
            return
        }

        val success = instance.clickNode(id)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun typeText(call: PluginCall) {
        val id = call.getString("id")
        val text = call.getString("text")

        if (id == null || text == null) {
            call.reject("Node ID and text are required")
            return
        }

        val instance = CustomAccessibilityService.instance
        if (instance == null) {
            call.reject("Accessibility Service instance is null")
            return
        }

        val success = instance.typeText(id, text)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun scroll(call: PluginCall) {
        val id = call.getString("id")
        val direction = call.getString("direction") ?: "forward"

        val instance = CustomAccessibilityService.instance
        if (instance == null) {
            call.reject("Accessibility Service instance is null")
            return
        }

        val success = instance.scroll(id, direction)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }
}
