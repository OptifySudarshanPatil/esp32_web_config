# ESP32 Web Configuration Firmware

A clean, structured firmware for ESP32 that provides BLE connectivity for device configuration and monitoring.

## Features

- BLE connectivity using NimBLE library for better performance
- Persistent configuration storage using ESP32 Preferences
- Web-based configuration interface (via BLE)
- LED control example
- OTA update capability (framework only, implementation to be added)
- Clean architecture that avoids NimBLE macro conflicts

## Project Structure

The project follows a clean architecture with the following key components:

- **ESP32BLEService**: Manages BLE connectivity and services
- **ConfigManager**: Handles persistent configuration storage
- **Main Application**: Ties everything together and provides the device functionality

## Dependencies

- [NimBLE-Arduino](https://github.com/h2zero/NimBLE-Arduino) - Lightweight BLE implementation
- [ArduinoJson](https://arduinojson.org/) - JSON parsing for configuration
- [ArduinoLog](https://github.com/thijse/Arduino-Log) - Logging functionality

## Usage

1. Upload the firmware to your ESP32 device
2. Connect to the device via BLE using a BLE client app
3. Configure your device by writing to the Config characteristic
4. Monitor sensor data by subscribing to the Sensor characteristic

## BLE Services and Characteristics

This firmware exposes the following BLE services and characteristics:

- **Service**: Device Information (0x180A)
  - **Config Characteristic** (0x2A25): Read/Write - JSON configuration
  - **Update Characteristic** (0x2A26): Read/Notify - Firmware version
  - **Sensor Characteristic** (0x2A27): Read/Notify - Sensor data
  - **OTA Characteristic** (0x2A28): Read/Write - OTA update control

## Web Interface

The web interface is included in the `docs` folder and can be hosted on any web server. It provides a user-friendly way to configure the device using Web Bluetooth API.

## License

This project is open-source, feel free to modify and use it in your own projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.