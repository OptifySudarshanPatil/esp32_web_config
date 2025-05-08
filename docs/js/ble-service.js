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
        this.characteristic = null;
        
        // UUIDs for our service and characteristic (matching ESP32 NimBLE implementation)
        this.serviceUUID = '12345678-1234-1234-1234-123456789abc'; // ESP32 SERVICE_UUID
        this.characteristicUUID = 'abcd1234-5678-90ab-cdef-1234567890ab'; // ESP32 CHARACTERISTIC_UUID
        
        // Listeners
        this.connectionListeners = [];
        this.disconnectionListeners = [];
        this.dataUpdateListeners = [];
        this.wifiScanListeners = [];
        this.wifiStatusListeners = [];
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
            
            console.log('Getting characteristic...');
            this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
            
            // Set up notifications for data updates
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', 
                this.handleDataChanged.bind(this));
            
            // Set up event listener for disconnection
            this.device.addEventListener('gattserverdisconnected', 
                this.handleDisconnection.bind(this));
            
            // Notify all connection listeners
            this.notifyConnectionListeners();
            
            console.log('Connected to device:', device.name);
            
            // Get initial data
            await this.fetchData();
            
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
        this.characteristic = null;
        
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
     * Fetch the current data from the device
     * @returns {Promise<Object>} Device data
     */
    async fetchData() {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            const value = await this.characteristic.readValue();
            const decoder = new TextDecoder('utf-8');
            const dataJson = decoder.decode(value);
            
            console.log('Received data:', dataJson);
            
            let data;
            try {
                // Try to parse as JSON
                data = JSON.parse(dataJson);
            } catch (e) {
                // If not JSON, return as string value
                data = { value: dataJson };
            }
            
            // Notify all data update listeners
            this.notifyDataUpdateListeners(data);
            
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }
    
    /**
     * Send data to the device
     * @param {Object|string} data - Data to send
     * @returns {Promise<boolean>} Success or failure
     */
    async sendData(data) {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            let dataString;
            if (typeof data === 'string') {
                dataString = data;
            } else {
                dataString = JSON.stringify(data);
            }
            
            console.log('Sending data:', dataString);
            
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(dataString);
            
            await this.characteristic.writeValue(dataBytes);
            
            // Give the device time to process
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            throw error;
        }
    }
    
    /**
     * Handle data changed event
     * @param {Event} event - Characteristic value changed event
     */
    handleDataChanged(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const dataJson = decoder.decode(value);
        
        console.log('Received notification data:', dataJson);
        
        let data;
        try {
            // Try to parse as JSON
            data = JSON.parse(dataJson);
            
            // Check for WiFi scan results
            if (data.status === 'scan_results' || data.status === 'scanning' || data.status === 'scan_complete') {
                this.notifyWiFiScanListeners(data);
                return;
            }
            
            // Check for WiFi connection status updates
            if (data.status === 'credentials_received' || 
                data.status === 'wifi_connecting' || 
                data.status === 'wifi_connected' || 
                data.status === 'wifi_disconnected' ||
                data.status === 'error') {
                
                this.notifyWiFiStatusListeners(data);
                return;
            }
            
        } catch (e) {
            // If not JSON, return as string value
            data = { value: dataJson };
        }
        
        // Notify all data update listeners
        this.notifyDataUpdateListeners(data);
    }
    
    /**
     * Scan for WiFi networks via ESP32
     * @returns {Promise<boolean>} Success status
     */
    async scanWiFiNetworks() {
        try {
            if (!this.isConnected()) {
                throw new Error('Not connected to device');
            }
            
            const command = { command: 'scan_wifi' };
            return this.sendData(command);
            
        } catch (error) {
            console.error('Error scanning WiFi networks:', error);
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
    
    addDataUpdateListener(listener) {
        this.dataUpdateListeners.push(listener);
    }
    
    addWiFiScanListener(listener) {
        if (!this.wifiScanListeners) {
            this.wifiScanListeners = [];
        }
        this.wifiScanListeners.push(listener);
    }
    
    addWiFiStatusListener(listener) {
        if (!this.wifiStatusListeners) {
            this.wifiStatusListeners = [];
        }
        this.wifiStatusListeners.push(listener);
    }
    
    notifyConnectionListeners() {
        this.connectionListeners.forEach(listener => listener(this.device));
    }
    
    notifyDisconnectionListeners() {
        this.disconnectionListeners.forEach(listener => listener());
    }
    
    notifyDataUpdateListeners(data) {
        this.dataUpdateListeners.forEach(listener => listener(data));
    }
    
    notifyWiFiScanListeners(data) {
        if (!this.wifiScanListeners) return;
        
        this.wifiScanListeners.forEach(listener => listener(data));
    }
    
    notifyWiFiStatusListeners(data) {
        if (!this.wifiStatusListeners) return;
        
        this.wifiStatusListeners.forEach(listener => listener(data));
    }
}