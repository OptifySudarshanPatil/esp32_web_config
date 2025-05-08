#include "ConfigManager.h"
#include <WiFi.h>

ConfigManager::ConfigManager() {}

bool ConfigManager::begin() {
    // Open preferences with namespace "config"
    preferences.begin("config", false);
    
    // Get MAC address to use as unique device ID
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char deviceIdBuffer[18];
    snprintf(deviceIdBuffer, sizeof(deviceIdBuffer), "%02X:%02X:%02X:%02X:%02X:%02X", 
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    deviceId = String(deviceIdBuffer);
    
    // Load saved settings if they exist
    deviceName = preferences.getString("deviceName", deviceName);
    refreshRate = preferences.getInt("refreshRate", refreshRate);
    ledEnabled = preferences.getBool("ledEnabled", ledEnabled);
    sensorUpdateInterval = preferences.getInt("sensorUpdate", sensorUpdateInterval);
    calibrationFactor = preferences.getFloat("calFactor", calibrationFactor);
    wifiSSID = preferences.getString("wifiSSID", wifiSSID);
    wifiPassword = preferences.getString("wifiPass", wifiPassword);
    
    return true;
}

void ConfigManager::loadDefaults() {
    deviceName = "ESP32_Device";
    refreshRate = 5000;
    ledEnabled = true;
    sensorUpdateInterval = 60;
    calibrationFactor = 1.0;
    wifiSSID = "";
    wifiPassword = "";
    
    // Don't reset deviceId as it's based on MAC address
}

bool ConfigManager::save() {
    preferences.putString("deviceName", deviceName);
    preferences.putInt("refreshRate", refreshRate);
    preferences.putBool("ledEnabled", ledEnabled);
    preferences.putInt("sensorUpdate", sensorUpdateInterval);
    preferences.putFloat("calFactor", calibrationFactor);
    preferences.putString("wifiSSID", wifiSSID);
    preferences.putString("wifiPass", wifiPassword);
    return true;
}

// Setters with validation
void ConfigManager::setDeviceName(const String& name) {
    if (name.length() > 0) {
        deviceName = name;
    }
}

void ConfigManager::setRefreshRate(int rate) {
    if (rate >= 1000 && rate <= 60000) {
        refreshRate = rate;
    }
}

void ConfigManager::setLedEnabled(bool enabled) {
    ledEnabled = enabled;
}

void ConfigManager::setSensorUpdateInterval(int interval) {
    if (interval >= 5 && interval <= 3600) {
        sensorUpdateInterval = interval;
    }
}

void ConfigManager::setCalibrationFactor(float factor) {
    if (factor > 0.0 && factor <= 10.0) {
        calibrationFactor = factor;
    }
}

void ConfigManager::setWifiSSID(const String& ssid) {
    wifiSSID = ssid;
}

void ConfigManager::setWifiPassword(const String& password) {
    wifiPassword = password;
}

String ConfigManager::toJson() {
    // Create JSON manually to avoid ArduinoJson compatibility issues
    String json = "{";
    json += "\"deviceName\":\"" + deviceName + "\",";
    json += "\"deviceId\":\"" + deviceId + "\",";
    json += "\"refreshRate\":" + String(refreshRate) + ",";
    json += "\"ledEnabled\":" + String(ledEnabled ? "true" : "false") + ",";
    json += "\"sensorUpdateInterval\":" + String(sensorUpdateInterval) + ",";
    json += "\"calibrationFactor\":" + String(calibrationFactor) + ",";
    json += "\"wifiSSID\":\"" + wifiSSID + "\",";
    json += "\"wifiPassword\":\"" + (wifiPassword.length() > 0 ? "****" : "") + "\"";
    json += "}";
    return json;
}

bool ConfigManager::fromJson(const String& jsonStr) {
    // Simple JSON parsing using String methods
    // This is less robust than ArduinoJson but avoids compatibility issues
    
    // Return false if the JSON is malformed
    if (!jsonStr.startsWith("{") || !jsonStr.endsWith("}")) {
        return false;
    }
    
    // Extract device name
    if (jsonStr.indexOf("\"deviceName\":") >= 0) {
        int start = jsonStr.indexOf("\"deviceName\":\"") + 14;
        int end = jsonStr.indexOf("\"", start);
        if (start >= 14 && end > start) {
            setDeviceName(jsonStr.substring(start, end));
        }
    }
    
    // Extract refresh rate
    if (jsonStr.indexOf("\"refreshRate\":") >= 0) {
        int start = jsonStr.indexOf("\"refreshRate\":") + 14;
        int end = jsonStr.indexOf(",", start);
        if (end < 0) end = jsonStr.indexOf("}", start);
        if (start >= 14 && end > start) {
            setRefreshRate(jsonStr.substring(start, end).toInt());
        }
    }
    
    // Extract LED enabled
    if (jsonStr.indexOf("\"ledEnabled\":") >= 0) {
        int start = jsonStr.indexOf("\"ledEnabled\":") + 13;
        int end = jsonStr.indexOf(",", start);
        if (end < 0) end = jsonStr.indexOf("}", start);
        if (start >= 13 && end > start) {
            String value = jsonStr.substring(start, end);
            setLedEnabled(value.indexOf("true") >= 0);
        }
    }
    
    // Extract sensor update interval
    if (jsonStr.indexOf("\"sensorUpdateInterval\":") >= 0) {
        int start = jsonStr.indexOf("\"sensorUpdateInterval\":") + 23;
        int end = jsonStr.indexOf(",", start);
        if (end < 0) end = jsonStr.indexOf("}", start);
        if (start >= 23 && end > start) {
            setSensorUpdateInterval(jsonStr.substring(start, end).toInt());
        }
    }
    
    // Extract calibration factor
    if (jsonStr.indexOf("\"calibrationFactor\":") >= 0) {
        int start = jsonStr.indexOf("\"calibrationFactor\":") + 20;
        int end = jsonStr.indexOf(",", start);
        if (end < 0) end = jsonStr.indexOf("}", start);
        if (start >= 20 && end > start) {
            setCalibrationFactor(jsonStr.substring(start, end).toFloat());
        }
    }
    
    // Extract WiFi SSID
    if (jsonStr.indexOf("\"wifiSSID\":") >= 0) {
        int start = jsonStr.indexOf("\"wifiSSID\":\"") + 12;
        int end = jsonStr.indexOf("\"", start);
        if (start >= 12 && end > start) {
            setWifiSSID(jsonStr.substring(start, end));
        }
    }
    
    // Extract WiFi password
    if (jsonStr.indexOf("\"wifiPassword\":") >= 0) {
        int start = jsonStr.indexOf("\"wifiPassword\":\"") + 16;
        int end = jsonStr.indexOf("\"", start);
        if (start >= 16 && end > start) {
            String value = jsonStr.substring(start, end);
            if (value != "****") {
                setWifiPassword(value);
            }
        }
    }
    
    return true;
}