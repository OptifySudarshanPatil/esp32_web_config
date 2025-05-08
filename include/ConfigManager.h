#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>

class ConfigManager {
private:
    Preferences preferences;
    
    // Default configuration values
    String deviceName = "ESP32_Device";
    String deviceId = ""; // Will be set based on MAC address
    int refreshRate = 5000; // Default refresh rate in ms
    bool ledEnabled = true;
    int sensorUpdateInterval = 60; // seconds
    float calibrationFactor = 1.0;
    String wifiSSID = "";
    String wifiPassword = "";
    
public:
    ConfigManager();
    
    bool begin();
    void loadDefaults();
    bool save();
    
    // Getters
    String getDeviceName() const { return deviceName; }
    String getDeviceId() const { return deviceId; }
    int getRefreshRate() const { return refreshRate; }
    bool isLedEnabled() const { return ledEnabled; }
    int getSensorUpdateInterval() const { return sensorUpdateInterval; }
    float getCalibrationFactor() const { return calibrationFactor; }
    String getWifiSSID() const { return wifiSSID; }
    String getWifiPassword() const { return wifiPassword; }
    
    // Setters
    void setDeviceName(const String& name);
    void setRefreshRate(int rate);
    void setLedEnabled(bool enabled);
    void setSensorUpdateInterval(int interval);
    void setCalibrationFactor(float factor);
    void setWifiSSID(const String& ssid);
    void setWifiPassword(const String& password);
    
    // JSON conversion
    String toJson();
    bool fromJson(const String& jsonStr);
};

#endif // CONFIG_MANAGER_H