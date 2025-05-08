#include "BLEService.h"
#include <ArduinoLog.h>

// Server callback implementation
class BLEService::ServerCallbacks : public NimBLEServerCallbacks {
private:
    BLEService& parent;
    
public:
    ServerCallbacks(BLEService& p) : parent(p) {}
    
    void onConnect(NimBLEServer* pServer) {
        parent.deviceConnected = true;
        Log.notice("BLE client connected" CR);
    }
    
    void onDisconnect(NimBLEServer* pServer) {
        parent.deviceConnected = false;
        Log.notice("BLE client disconnected" CR);
        // Start advertising again
        pServer->startAdvertising();
    }
};

// Config characteristic callback implementation
class BLEService::ConfigCharCallbacks : public NimBLECharacteristicCallbacks {
private:
    BLEService& parent;
    
public:
    ConfigCharCallbacks(BLEService& p) : parent(p) {}
    
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        Log.notice("Received config update from client" CR);
        parent.handleConfigUpdate(value);
    }
};

// OTA characteristic callback implementation
class BLEService::OTACharCallbacks : public NimBLECharacteristicCallbacks {
private:
    BLEService& parent;
    
public:
    OTACharCallbacks(BLEService& p) : parent(p) {}
    
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        Log.notice("Received OTA data from client, length: %d" CR, value.length());
        parent.handleOTAUpdate(value);
    }
};

BLEService::BLEService(ConfigManager& configMgr) : configManager(configMgr) {
    // Initialize pointers to nullptr
    pServer = nullptr;
    pDeviceService = nullptr;
    pConfigCharacteristic = nullptr;
    pUpdateCharacteristic = nullptr;
    pSensorCharacteristic = nullptr;
    pOTACharacteristic = nullptr;
}

bool BLEService::begin() {
    setupBLE();
    return true;
}

void BLEService::setupBLE() {
    // Initialize BLE
    NimBLEDevice::init(configManager.getDeviceName().c_str());
    
    // Create server
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks(*this));
    
    // Create service
    pDeviceService = NimBLEDevice::createService(SERVICE_UUID);
    
    // Create characteristics 
    // Unfortunately, NimBLEService doesn't have createCharacteristic in some versions
    // Let's use the proper API sequence
    NimBLECharacteristic* configChar = pDeviceService->createCharacteristic(
        CONFIG_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    configChar->setCallbacks(new ConfigCharCallbacks(*this));
    pConfigCharacteristic = configChar;
    
    NimBLECharacteristic* updateChar = pDeviceService->createCharacteristic(
        UPDATE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    pUpdateCharacteristic = updateChar;
    
    NimBLECharacteristic* sensorChar = pDeviceService->createCharacteristic(
        SENSOR_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pSensorCharacteristic = sensorChar;
    
    NimBLECharacteristic* otaChar = pDeviceService->createCharacteristic(
        OTA_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE
    );
    otaChar->setCallbacks(new OTACharCallbacks(*this));
    pOTACharacteristic = otaChar;
    
    // Start the service
    pDeviceService->start();
    
    // Start advertising
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
    pAdvertising->setMaxPreferred(0x12);
    NimBLEDevice::startAdvertising();
    
    Log.notice("BLE service started, advertising as: %s" CR, configManager.getDeviceName().c_str());
    
    // Initialize characteristics with current values
    pConfigCharacteristic->setValue(configManager.toJson());
}

void BLEService::update() {
    if (deviceConnected) {
        static unsigned long lastUpdate = 0;
        unsigned long now = millis();
        
        if (now - lastUpdate >= configManager.getRefreshRate()) {
            updateSensorData();
            lastUpdate = now;
        }
        
        if (needsConfigUpdate) {
            pConfigCharacteristic->setValue(configManager.toJson());
            needsConfigUpdate = false;
        }
    }
}

void BLEService::updateSensorData() {
    // In a real application, you would read from sensors here
    // For this example, we'll just create some simulated data
    String jsonStr = "{";
    jsonStr += "\"timestamp\":" + String(millis()) + ",";
    jsonStr += "\"temperature\":" + String(random(20, 30)) + ",";  // Simulated temperature value
    jsonStr += "\"humidity\":" + String(random(40, 80)) + ",";     // Simulated humidity value
    jsonStr += "\"batteryLevel\":" + String(random(50, 100));      // Simulated battery level
    jsonStr += "}";
    
    pSensorCharacteristic->setValue(jsonStr.c_str());
    pSensorCharacteristic->notify();
}

void BLEService::handleConfigUpdate(const std::string& jsonStr) {
    String jsonString(jsonStr.c_str());
    
    Log.notice("Received config update: %s" CR, jsonString.c_str());
    
    if (configManager.fromJson(jsonString)) {
        configManager.save();
        Log.notice("Configuration updated successfully" CR);
        
        // Update the characteristic with the new config
        pConfigCharacteristic->setValue(configManager.toJson());
        
        // Check if device name was changed, update advertising if needed
        if (NimBLEDevice::getInitialized()) {
            NimBLEDevice::deinit(true);
            setupBLE();
        }
    } else {
        Log.error("Failed to parse configuration JSON" CR);
    }
}

void BLEService::handleOTAUpdate(const std::string& data) {
    // In a real application, you would implement OTA update logic here
    // This is a simplified placeholder
    
    Log.notice("OTA update data received: %d bytes" CR, data.length());
    
    // TODO: Implement actual OTA update process
    // For now, we'll just report success
    String jsonResponse = "{\"status\":\"success\",\"message\":\"OTA Update received (implementation pending)\"}";
    pUpdateCharacteristic->setValue(jsonResponse.c_str());
}