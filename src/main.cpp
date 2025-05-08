#include <Arduino.h>
#include <NimBLEDevice.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <ArduinoJson.h>
#include <WiFi.h>
#include <Preferences.h>

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "abcd1234-5678-90ab-cdef-1234567890ab"

NimBLECharacteristic *pCharacteristic;
Preferences preferences;

// WiFi configuration
String wifi_ssid = "";
String wifi_password = "";
bool wifi_connected = false;

// Simulated sensor data
float temperature = 25.0;
float humidity = 50.0;
int batteryLevel = 100;

void updateWiFiStatus();
void saveWiFiCredentials(const char* ssid, const char* password);
void loadWiFiCredentials();
void connectToWiFi();
void updateSensorData();

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) {
    Serial.println("Client connected");
    // Send current status when a client connects
    updateSensorData();
  }
  void onDisconnect(NimBLEServer* pServer) {
    Serial.println("Client disconnected");
  }
};

class CharacteristicCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) {
    std::string val = pChar->getValue();
    Serial.print("Received: ");
    Serial.println(val.c_str());
    
    // Parse JSON data
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, val.c_str());
    
    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }
    
    // Process WiFi credentials if received
    if (doc.containsKey("wifi_ssid")) {
      wifi_ssid = doc["wifi_ssid"].as<String>();
      
      if (doc.containsKey("wifi_password")) {
        wifi_password = doc["wifi_password"].as<String>();
      } else {
        wifi_password = "";
      }
      
      Serial.print("Received WiFi SSID: ");
      Serial.println(wifi_ssid);
      
      // Save the credentials
      saveWiFiCredentials(wifi_ssid.c_str(), wifi_password.c_str());
      
      // Try to connect with new credentials
      connectToWiFi();
      
      // Update the sensor data with new WiFi status
      updateSensorData();
    }
  }
};

void saveWiFiCredentials(const char* ssid, const char* password) {
  preferences.begin("wifi-config", false);
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.end();
  Serial.println("WiFi credentials saved");
}

void loadWiFiCredentials() {
  preferences.begin("wifi-config", false);
  wifi_ssid = preferences.getString("ssid", "");
  wifi_password = preferences.getString("password", "");
  preferences.end();
  
  Serial.print("Loaded WiFi SSID: ");
  Serial.println(wifi_ssid);
}

void connectToWiFi() {
  if (wifi_ssid.length() == 0) {
    Serial.println("No WiFi SSID configured");
    wifi_connected = false;
    return;
  }
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(wifi_ssid);
  
  WiFi.disconnect();
  delay(100);
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  
  // Wait for connection for max 10 seconds
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("Connected to WiFi. IP address: ");
    Serial.println(WiFi.localIP());
    wifi_connected = true;
  } else {
    Serial.println("");
    Serial.println("Failed to connect to WiFi");
    wifi_connected = false;
  }
}

void updateWiFiStatus() {
  wifi_connected = (WiFi.status() == WL_CONNECTED);
  
  if (wifi_connected) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi disconnected");
    // Try to reconnect if we have credentials
    if (wifi_ssid.length() > 0) {
      connectToWiFi();
    }
  }
}

void updateSensorData() {
  if (pCharacteristic == nullptr) {
    return;
  }
  
  // Create JSON with sensor data and WiFi status
  DynamicJsonDocument doc(1024);
  
  // Add sensor readings
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["batteryLevel"] = batteryLevel;
  
  // Add WiFi status
  doc["wifi_connected"] = wifi_connected;
  doc["wifi_ssid"] = wifi_ssid;
  if (wifi_connected) {
    doc["ip_address"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
  }
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Update characteristic value
  pCharacteristic->setValue(jsonString.c_str());
  
  // Notify connected clients
  pCharacteristic->notify();
  
  Serial.print("Updated sensor data: ");
  Serial.println(jsonString);
}

void setup() {
  Serial.begin(115200);
  
  // Disable Brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.println("Brownout detector disabled");
  
  // Load saved WiFi credentials
  loadWiFiCredentials();
  
  // Initialize WiFi
  WiFi.mode(WIFI_STA);
  connectToWiFi();

  // Initialize NimBLE
  NimBLEDevice::init("ESP32_BLE_Config");
  NimBLEServer *pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      NIMBLE_PROPERTY::READ |
                      NIMBLE_PROPERTY::WRITE |
                      NIMBLE_PROPERTY::NOTIFY
                    );

  // Set initial value
  updateSensorData();
  
  pCharacteristic->setCallbacks(new CharacteristicCallbacks());

  pService->start();
  NimBLEAdvertising *pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  NimBLEAdvertisementData scanResponse;
  scanResponse.setName("ESP32_BLE_Config");
  pAdvertising->setScanResponseData(scanResponse);
  pAdvertising->start();

  Serial.println("NimBLE server is running...");
}

void loop() {
  // Update simulated sensor data every 5 seconds
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) {
    // Simulate changing sensor data
    temperature = 20.0 + (float)random(0, 100) / 10.0;  // 20.0 to 30.0
    humidity = 40.0 + (float)random(0, 200) / 10.0;     // 40.0 to 60.0
    batteryLevel = (batteryLevel > 0) ? batteryLevel - random(0, 2) : 0;  // Slowly decrease
    
    // Check WiFi status
    updateWiFiStatus();
    
    // Update BLE characteristic
    updateSensorData();
    
    lastUpdate = millis();
  }
  
  // Add a small delay to prevent watchdog issues
  delay(10);
}
