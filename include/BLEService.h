#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include <Arduino.h>
#include <NimBLEDevice.h>
#include "ConfigManager.h"

// UUIDs for our service and characteristics
#define SERVICE_UUID        "180A" // Device Information
#define CONFIG_CHAR_UUID    "2A25" // Serial Number (for config data)
#define UPDATE_CHAR_UUID    "2A26" // Firmware Revision (for updates)
#define SENSOR_CHAR_UUID    "2A27" // Hardware Revision (for sensor data)
#define OTA_CHAR_UUID       "2A28" // Software Revision (for OTA)

class BLEService {
private:
    ConfigManager& configManager;
    NimBLEServer* pServer;
    NimBLEService* pDeviceService;
    NimBLECharacteristic* pConfigCharacteristic;
    NimBLECharacteristic* pUpdateCharacteristic;
    NimBLECharacteristic* pSensorCharacteristic;
    NimBLECharacteristic* pOTACharacteristic;
    
    bool deviceConnected = false;
    bool needsConfigUpdate = false;
    
    // Callback classes for BLE events
    class ServerCallbacks;
    class ConfigCharCallbacks;
    class OTACharCallbacks;
    
    // Internal methods
    void setupBLE();
    void updateSensorData();
    
public:
    BLEService(ConfigManager& configMgr);
    
    bool begin();
    void update();
    
    // Update config from BLE client
    void handleConfigUpdate(const std::string& jsonStr);
    
    // OTA update handling
    void handleOTAUpdate(const std::string& data);
    
    // Status
    bool isConnected() const { return deviceConnected; }
};

#endif // BLE_SERVICE_H