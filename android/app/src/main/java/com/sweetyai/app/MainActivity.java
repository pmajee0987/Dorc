package com.sweetyai.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioPermissionHelperPlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure Android WebView grants permissions for WebRTC/getUserMedia (Microphone & Camera)
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        for (String resource : request.getResources()) {
                            if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE) ||
                                resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                                request.grant(new String[]{resource});
                                break;
                            }
                        }
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            System.err.println("Permission request grant error: " + e.getMessage());
                        }
                    });
                }
            });
        }
    }
}

