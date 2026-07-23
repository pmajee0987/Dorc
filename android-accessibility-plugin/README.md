# Capacitor Accessibility Plugin - Android Setup

This folder contains the native Android code for the AccessibilityService plugin. To integrate this into your existing Capacitor Android project, follow these instructions.

## 1. Copy Files
Copy the generated Kotlin files into your `android/app/src/main/java/[your/package/name]/plugins/` directory:
- `AccessibilityPlugin.kt`
- `CustomAccessibilityService.kt`

Make sure the `package` name at the top of these Kotlin files matches your actual package name.

## 2. Copy XML Config
Copy the `accessibility_service_config.xml` file into your Android resources folder:
`android/app/src/main/res/xml/accessibility_service_config.xml`
(Create the `xml` folder if it doesn't exist).

## 3. Add String Resource
Add a description for the service in your `android/app/src/main/res/values/strings.xml`:
```xml
<string name="accessibility_service_description">AI Screen Agent requires accessibility access to analyze the screen and automate tasks.</string>
```

## 4. Register the Service and Plugin in AndroidManifest.xml
Open your `android/app/src/main/AndroidManifest.xml` and add the following inside the `<application>` tag:

```xml
<service
    android:name=".plugins.CustomAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/accessibility_service_config" />
</service>
```

## 5. Register the Plugin with Capacitor
In your `MainActivity.java` or `MainActivity.kt`, register the plugin:

**MainActivity.java:**
```java
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.yourdomain.app.plugins.AccessibilityPlugin; // Replace with your package name

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AccessibilityPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

**MainActivity.kt:**
```kotlin
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.yourdomain.app.plugins.AccessibilityPlugin // Replace with your package name

class MainActivity : BridgeActivity() {
    public override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AccessibilityPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

## 6. Build and Test
Run `npx cap sync android` and build your project in Android Studio. 
You can now use the plugin in React via `import { Accessibility } from '../plugins/AccessibilityPlugin'`.
