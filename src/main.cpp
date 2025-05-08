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
bool wifi_scanning = false;

// Simulated sensor data
float temperature = 25.0;
float humidity = 50.0;
int batteryLevel = 100;

// Device connection state
bool deviceConnected = false;

void updateWiFiStatus();
void saveWiFiCredentials(const char* ssid, const char* password);
void loadWiFiCredentials();
void connectToWiFi();
void connectToWiFiAsync();
void updateSensorData();
void scanWiFiNetworks();
void sendWiFiScanResults();

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) {
    Serial.println("Client connected");
    deviceConnected = true;
    // Send current status when a client connects
    updateSensorData();
  }
  void onDisconnect(NimBLEServer* pServer) {
    Serial.println("Client disconnected");
    deviceConnected = false;
  }
};

class CharacteristicCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) {
    std::string val = pChar->getValue();
    Serial.print("Received data: ");
    Serial.println(val.c_str());
    
    // Debugging - print byte by byte
    Serial.print("Received raw bytes: ");
    for (int i = 0; i < val.length(); i++) {
      Serial.print((uint8_t)val[i], HEX);
      Serial.print(" ");
    }
    Serial.println();
    
    // Parse JSON data
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, val.c_str());
    
    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      
      // Send error feedback to client
      DynamicJsonDocument errorDoc(256);
      errorDoc["status"] = "error";
      errorDoc["message"] = String("JSON parse error: ") + error.c_str();
      
      String jsonString;
      serializeJson(errorDoc, jsonString);
      
      if (deviceConnected) {
        pCharacteristic->setValue(jsonString.c_str());
        pCharacteristic->notify();
      }
      return;
    }
    
    // Check if this is a scan request
    if (doc.containsKey("command") && doc["command"] == "scan_wifi") {
      Serial.println("WiFi scan requested from app");
      scanWiFiNetworks();
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
      
      Serial.print("Received WiFi SSID: '");
      Serial.print(wifi_ssid);
      Serial.println("'");
      
      Serial.print("Received WiFi password: '");
      Serial.print(wifi_password);
      Serial.println("'");
      
      // Send acknowledgment to client
      DynamicJsonDocument ackDoc(256);
      ackDoc["status"] = "credentials_received";
      ackDoc["wifi_ssid"] = wifi_ssid;
      ackDoc["message"] = "WiFi credentials received, attempting to connect";
      
      String jsonString;
      serializeJson(ackDoc, jsonString);
      
      if (deviceConnected) {
        pCharacteristic->setValue(jsonString.c_str());
        pCharacteristic->notify();
      }
      
      // Save the credentials
      saveWiFiCredentials(wifi_ssid.c_str(), wifi_password.c_str());
      
      // Try to connect with new credentials - do this in the background
      // to not block further BLE communication
      connectToWiFiAsync();
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

void connectToWiFiAsync() {
  if (wifi_ssid.length() == 0) {
    Serial.println("No WiFi SSID configured");
    wifi_connected = false;
    return;
  }
  
  Serial.print("Connecting to WiFi asynchronously: ");
  Serial.println(wifi_ssid);
  
  WiFi.disconnect();
  delay(100);
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  
  // Send connection attempt notification
  DynamicJsonDocument doc(256);
  doc["status"] = "wifi_connecting";
  doc["wifi_ssid"] = wifi_ssid;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  if (deviceConnected) {
    pCharacteristic->setValue(jsonString.c_str());
    pCharacteristic->notify();
  }
}

void updateWiFiStatus() {
  static bool lastWiFiConnected = false;
  wifi_connected = (WiFi.status() == WL_CONNECTED);
  
  // Only send updates when the connection state changes
  if (wifi_connected != lastWiFiConnected) {
    lastWiFiConnected = wifi_connected;
    
    if (wifi_connected) {
      Serial.print("WiFi connected. IP: ");
      Serial.println(WiFi.localIP());
      
      // Send connection success notification
      if (deviceConnected) {
        DynamicJsonDocument doc(256);
        doc["status"] = "wifi_connected";
        doc["wifi_ssid"] = wifi_ssid;
        doc["ip_address"] = WiFi.localIP().toString();
        doc["rssi"] = WiFi.RSSI();
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        pCharacteristic->setValue(jsonString.c_str());
        pCharacteristic->notify();
      }
    } else {
      Serial.println("WiFi disconnected");
      
      // Send disconnection notification
      if (deviceConnected) {
        DynamicJsonDocument doc(256);
        doc["status"] = "wifi_disconnected";
        doc["wifi_ssid"] = wifi_ssid;
        doc["message"] = "WiFi connection lost";
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        pCharacteristic->setValue(jsonString.c_str());
        pCharacteristic->notify();
      }
      
      // Try to reconnect if we have credentials
      if (wifi_ssid.length() > 0) {
        connectToWiFi();
      }
    }
  }
}

void scanWiFiNetworks() {
  if (wifi_scanning) {
    Serial.println("WiFi scan already in progress");
    return;
  }
  
  wifi_scanning = true;
  
  // Send scan starting notification
  DynamicJsonDocument doc(256);
  doc["status"] = "scanning";
  doc["message"] = "WiFi scan started";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("DEBUG: Sending scan notification to client");
  if (deviceConnected) {
    pCharacteristic->setValue(jsonString.c_str());
    pCharacteristic->notify();
    Serial.println("DEBUG: Scan notification sent");
  } else {
    Serial.println("DEBUG: Client not connected, can't send notification");
  }
  
  Serial.println("Starting WiFi scan...");
  
  // Perform WiFi scan
  WiFi.disconnect();
  WiFi.scanDelete(); // Clear previous scan results
  Serial.println("DEBUG: Beginning WiFi scan (async)");
  int networksFound = WiFi.scanNetworks(true); // Async scan
  
  // Wait for scan to complete with timeout
  unsigned long scanStartTime = millis();
  while (WiFi.scanComplete() < 0 && millis() - scanStartTime < 10000) {
    delay(100);
    // Print a dot every second to show progress
    if (millis() % 1000 < 100) {
      Serial.print(".");
    }
  }
  Serial.println();
  
  networksFound = WiFi.scanComplete();
  Serial.print("Scan complete. Found ");
  Serial.print(networksFound);
  Serial.println(" networks");
  
  sendWiFiScanResults();
  
  wifi_scanning = false;
  Serial.println("DEBUG: WiFi scanning finished");
}

void sendWiFiScanResults() {
  int networksFound = WiFi.scanComplete();
  
  if (networksFound <= 0) {
    // No networks found or scan not complete
    DynamicJsonDocument doc(256);
    doc["status"] = "scan_complete";
    doc["networks_found"] = 0;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    pCharacteristic->setValue(jsonString.c_str());
    pCharacteristic->notify();
    return;
  }
  
  // We might need to send multiple packets if there are many networks
  // due to BLE MTU size limitations
  const int maxNetworksPerPacket = 5;
  int packets = (networksFound + maxNetworksPerPacket - 1) / maxNetworksPerPacket;
  
  for (int packet = 0; packet < packets; packet++) {
    DynamicJsonDocument doc(1024);
    doc["status"] = "scan_results";
    doc["packet"] = packet + 1;
    doc["total_packets"] = packets;
    doc["networks_found"] = networksFound;
    
    JsonArray networks = doc.createNestedArray("networks");
    
    int startIdx = packet * maxNetworksPerPacket;
    int endIdx = min(startIdx + maxNetworksPerPacket, networksFound);
    
    for (int i = startIdx; i < endIdx; i++) {
      JsonObject network = networks.createNestedObject();
      network["ssid"] = WiFi.SSID(i);
      network["rssi"] = WiFi.RSSI(i);
      network["encryption"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    }
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    pCharacteristic->setValue(jsonString.c_str());
    pCharacteristic->notify();
    
    // Small delay to ensure packets are received properly
    delay(100);
  }
  
  // Clean up scan results to free memory
  WiFi.scanDelete();
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
  
  doc["status"] = "sensor_update";
  
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
