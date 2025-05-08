# ESP32 BLE Configuration Firmware

This project implements a configurable ESP32 firmware with BLE communication capabilities, allowing configuration via a web browser that supports Web Bluetooth API.

## Features

- BLE (Bluetooth Low Energy) communication
- Persistent configuration storage
- Web-based configuration dashboard
- Sensor data monitoring
- OTA (Over-The-Air) firmware update capability
- GitHub Pages compatible web app

## Hardware Requirements

- ESP32 development board
- USB cable for initial programming
- Power supply (USB or external)

## Software Requirements

- PlatformIO
- Arduino framework for ESP32
- Web browser with Web Bluetooth support (Chrome, Edge, Opera)

## Libraries Used

- NimBLE-Arduino - For BLE functionality
- ArduinoJson - For JSON parsing and generation
- ArduinoLog - For logging

## Installation

1. Clone this repository
2. Open the project in PlatformIO
3. Build and upload to your ESP32 device
4. Access the web configuration interface at `app/index.html`

## Usage

1. Power on your ESP32 device
2. Open the web app in a browser that supports Web Bluetooth
3. Click "Scan for BLE Devices" to find your ESP32
4. Connect to the device
5. Configure your device settings
6. Monitor sensor data in real-time

## Configuration Options

- Device Name - Customize the name of your device
- Refresh Rate - How often sensor data is updated (ms)
- LED Enabled - Toggle on-board LED
- Sensor Update Interval - How often sensors are read (seconds)
- Calibration Factor - For sensor calibration
- WiFi SSID & Password - For WiFi connectivity (if needed)

## Web App

The web app is located in the `app` folder and can be hosted on GitHub Pages or any static web server. It uses Web Bluetooth API to communicate directly with the ESP32 device.

## License

MIT License