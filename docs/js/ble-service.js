/**
 * BLE Service for ESP32 Web Configuration
 * Handles communication with ESP32 device via BLE
 */
class BLEService {
    constructor() {
        // BLE device properties
        this.device = null;
        this.server = null;
        this.service = null;
        this.configCharacteristic = null;
        this.updateCharacteristic = null;
        this.sensorCharacteristic = null;
        this.otaCharacteristic = null;
        
        // UUIDs for our service and characteristics (using full 128-bit format for Web Bluetooth compatibility)
        this.serviceUUID = '0000180a-0000-1000-8000-00805f9b34fb'; // Device Information
        this.configCharUUID = '00002a25-0000-1000-8000-00805f9b34fb'; // Serial Number (for config data)
        this.updateCharUUID = '00002a26-0000-1000-8000-00805f9b34fb'; // Firmware Revision (for updates)
        this.sensorCharUUID = '00002a27-0000-1000-8000-00805f9b34fb'; // Hardware Revision (for sensor data)
        this.otaCharUUID = '00002a28-0000-1000-8000-00805f9b34fb'; // Software Revision (for OTA)
        
        // Listeners
        this.connectionListeners = [];
        this.disconnectionListeners = [];
        this.configUpdateListeners = [];
        this.sensorUpdateListeners = [];
        this.otaUpdateListeners = [];
    }
    
    /**
     * Scan for BLE devices
     * @returns {Promise<BluetoothDevice[]>} Array of devices found
     */
    async scan() {
        try {
            console.log('Scanning for BLE devices...');
            const options = {
                filters: [
                    { services: [this.serviceUUID] }
                ],
                optionalServices: [this.serviceUUID]
            };
            
            // Request device returns a single device selected by the user
            const device = await navigator.bluetooth.requestDevice(options);
            
            return [device]; // Return as array for consistency
        } catch (error) {
            console.error('Error scanning for devices:', error);
            throw error;
        }
    }
    
    /**
     * Connect to a BLE device
     * @param {BluetoothDevice} device - The device to connect to
     * @returns {Promise<void>}
     */
    async connect(device) {
        try {
            this.device = device;
            
            console.log('Connecting to GATT server...');
            this.server = await device.gatt.connect();
            
            console.log('Getting service...');
            this.service = await this.server.getPrimaryService(this.serviceUUID);
            
            console.log('Getting characteristics...');
            this.configCharacteristic = await this.service.getCharacteristic(this.configCharUUID);
            this.updateCharacteristic = await this.service.getCharacteristic(this.updateCharUUID);
            this.sensorCharacteristic = await this.service.getCharacteristic(this.sensorCharUUID);
            this.otaCharacteristic = await this.service.getCharacteristic(this.otaCharUUID);
            
            // Set up notifications for sensor data
            await this.sensorCharacteristic.startNotifications();
            this.sensorCharacteristic.addEventListener('characteristicvaluechanged', 
                this.handleSensorDataChanged.bind(this));
            
            // Set up event listener for disconnection
            this.device.addEventListener('gattserverdisconnected', 
                this.handleDisconnection.bind(this));
            
            // Notify all connection listeners
            this.notifyConnectionListeners();
            
            console.log('Connected to device:', device.name);
            
            // Get initial config
            await this.fetchConfig();
            
            return true;
        } catch (error) {
            console.error('Error connecting to device:', error);
            this.disconnect();
            throw error;
        }
    }
    
    /**
     * Handle disconnection event
     */
    handleDisconnection() {
        console.log('Device disconnected');
        this.device = null;
        this.server = null;
        this.service = null;
        this.configCharacteristic = null;
        this.updateCharacteristic = null;
        this.sensorCharacteristic = null;
        this.otaCharacteristic = null;
        
        // Notify all disconnection listeners
        this.notifyDisconnectionListeners();
    }
    
    /**
     * Disconnect from the device
     */
    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        } else {
            this.handleDisconnection();
        }
    }
    
    /**
     * Fetch the current configuration from the device
     * @returns {Promise<Object>} Configuration data
     */
    async fetchConfig() {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            const value = await this.configCharacteristic.readValue();
            const decoder = new TextDecoder('utf-8');
            const configJson = decoder.decode(value);
            
            console.log('Received config:', configJson);
            
            const config = JSON.parse(configJson);
            
            // Notify all config update listeners
            this.notifyConfigUpdateListeners(config);
            
            return config;
        } catch (error) {
            console.error('Error fetching config:', error);
            throw error;
        }
    }
    
    /**
     * Update device configuration
     * @param {Object} config - Configuration data to send
     * @returns {Promise<boolean>} Success or failure
     */
    async updateConfig(config) {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            const configJson = JSON.stringify(config);
            console.log('Sending config update:', configJson);
            
            const encoder = new TextEncoder();
            const configData = encoder.encode(configJson);
            
            await this.configCharacteristic.writeValue(configData);
            
            // Give the device time to process and update its configuration
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch the updated configuration
            await this.fetchConfig();
            
            return true;
        } catch (error) {
            console.error('Error updating config:', error);
            throw error;
        }
    }
    
    /**
     * Handle sensor data updates
     * @param {Event} event - Characteristic value changed event
     */
    handleSensorDataChanged(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const dataJson = decoder.decode(value);
        
        try {
            const sensorData = JSON.parse(dataJson);
            console.log('Received sensor data:', sensorData);
            
            // Notify all sensor update listeners
            this.notifySensorUpdateListeners(sensorData);
        } catch (error) {
            console.error('Error parsing sensor data:', error);
        }
    }
    
    /**
     * Upload firmware file for OTA update
     * @param {File} file - Firmware file
     * @param {Function} progressCallback - Callback for update progress
     * @returns {Promise<boolean>} Success or failure
     */
    async uploadFirmware(file, progressCallback) {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            const fileBuffer = await file.arrayBuffer();
            const fileSize = fileBuffer.byteLength;
            
            // Check if file is too large
            if (fileSize > 1000000) {
                throw new Error('Firmware file is too large. Maximum size is 1MB.');
            }
            
            // Simple implementation for small files - for larger files you'd need to chunk the data
            const firmware = new Uint8Array(fileBuffer);
            const chunkSize = 512; // Maximum BLE packet size
            
            console.log(`Starting OTA update with ${fileSize} bytes`);
            
            // Send OTA data in chunks
            for (let i = 0; i < fileSize; i += chunkSize) {
                const chunk = firmware.slice(i, i + chunkSize);
                await this.otaCharacteristic.writeValue(chunk);
                
                // Update progress
                const progress = Math.min(100, Math.round((i + chunkSize) / fileSize * 100));
                if (progressCallback) {
                    progressCallback(progress);
                }
                
                // Small delay to prevent overwhelming the device
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            console.log('OTA update completed');
            
            // Check update status
            const value = await this.updateCharacteristic.readValue();
            const decoder = new TextDecoder('utf-8');
            const resultJson = decoder.decode(value);
            const result = JSON.parse(resultJson);
            
            console.log('OTA update result:', result);
            
            // Notify all OTA update listeners
            this.notifyOTAUpdateListeners(result);
            
            return result.status === 'success';
        } catch (error) {
            console.error('Error during OTA update:', error);
            if (progressCallback) {
                progressCallback(0);
            }
            throw error;
        }
    }
    
    /**
     * Check if connected to a device
     * @returns {boolean} Connected status
     */
    isConnected() {
        return this.device !== null && this.device.gatt.connected;
    }
    
    /**
     * Get the name of the connected device
     * @returns {string|null} Device name or null if not connected
     */
    getDeviceName() {
        return this.device ? this.device.name : null;
    }
    
    // Event listener management
    addConnectionListener(listener) {
        this.connectionListeners.push(listener);
    }
    
    addDisconnectionListener(listener) {
        this.disconnectionListeners.push(listener);
    }
    
    addConfigUpdateListener(listener) {
        this.configUpdateListeners.push(listener);
    }
    
    addSensorUpdateListener(listener) {
        this.sensorUpdateListeners.push(listener);
    }
    
    addOTAUpdateListener(listener) {
        this.otaUpdateListeners.push(listener);
    }
    
    notifyConnectionListeners() {
        this.connectionListeners.forEach(listener => listener(this.device));
    }
    
    notifyDisconnectionListeners() {
        this.disconnectionListeners.forEach(listener => listener());
    }
    
    notifyConfigUpdateListeners(config) {
        this.configUpdateListeners.forEach(listener => listener(config));
    }
    
    notifySensorUpdateListeners(data) {
        this.sensorUpdateListeners.forEach(listener => listener(data));
    }
    
    notifyOTAUpdateListeners(result) {
        this.otaUpdateListeners.forEach(listener => listener(result));
    }
}