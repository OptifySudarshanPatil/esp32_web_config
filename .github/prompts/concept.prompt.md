# concept

## For esp32 project
- setup ble protocol to connect with ble web client
- web clitent query multiple table
    - configuration table: this table contains the configuration of the esp32 device, such as device name, device id, and other settings.
- perodically update read only value from esp32 device to web client
- receive modificaiotn from web client and update esp32 configuration table
- OTA from web client using ble


## web app with github page compatible in folder "app" with following feature
- scan ble for available esp32 devices
- display list of esp32 devices with their status and configuration
- make ble conneciton with esp32 and query configuration table
- from configuration table display dashboard with read only and editable widgets
- OTA update for esp32 device from web client using ble