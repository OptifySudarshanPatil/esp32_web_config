#include <Arduino.h>
#include <ArduinoLog.h>
#include "ConfigManager.h"
#include "BLEService.h"

// Define LED pin for ESP32 DevKit
#define LED_PIN 2 // Built-in LED on most ESP32 development boards

// Create instances of our classes
ConfigManager configManager;
BLEService* bleService;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Log.begin(LOG_LEVEL_NOTICE, &Serial);
  
  Log.notice("ESP32 Web Config Firmware starting..." CR);
  
  // Set up LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED off
  
  // Initialize config manager
  if (!configManager.begin()) {
    Log.error("Failed to initialize ConfigManager" CR);
  }
  
  // Initialize BLE service
  bleService = new BLEService(configManager);
  if (!bleService->begin()) {
    Log.error("Failed to initialize BLEService" CR);
  }
  
  Log.notice("Device initialized with name: %s" CR, configManager.getDeviceName().c_str());
  
  // Turn on LED if enabled in config
  if (configManager.isLedEnabled()) {
    digitalWrite(LED_PIN, HIGH);
  }
}

void loop() {
  // Update BLE service to handle periodic tasks
  if (bleService) {
    bleService->update();
  }
  
  // Check if LED state needs to be updated based on configuration
  static bool previousLedState = configManager.isLedEnabled();
  if (previousLedState != configManager.isLedEnabled()) {
    digitalWrite(LED_PIN, configManager.isLedEnabled() ? HIGH : LOW);
    previousLedState = configManager.isLedEnabled();
  }
  
  // Add any other application logic here
  delay(10); // Small delay to prevent watchdog resets
}
