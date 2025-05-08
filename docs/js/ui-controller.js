/**
 * UI Controller for ESP32 Web Configuration
 * Handles the user interface interactions
 */
class UIController {
    constructor(bleService) {
        this.bleService = bleService;
        this.configForm = document.getElementById('configForm');
        this.otaForm = document.getElementById('otaForm');
        
        // Device selection and connection elements
        this.scanButton = document.getElementById('scanButton');
        this.deviceList = document.getElementById('deviceList');
        this.statusElement = document.getElementById('status');
        this.configSection = document.getElementById('configSection');
        
        // Form elements
        this.wifiSSIDInput = document.getElementById('wifiSSID');
        this.wifiPasswordInput = document.getElementById('wifiPassword');
        
        // Sensor data elements
        this.temperatureElement = document.getElementById('temperature');
        this.humidityElement = document.getElementById('humidity');
        this.batteryLevelElement = document.getElementById('batteryLevel');
        
        // Modal elements
        this.messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
        this.modalMessage = document.getElementById('modalMessage');
        
        // Register event listeners
        this.registerEventListeners();
        
        // Register BLE service listeners
        this.registerBLEListeners();
    }
    
    /**
     * Register UI event listeners
     */
    registerEventListeners() {
        // Scan button click
        this.scanButton.addEventListener('click', () => this.scanForDevices());
        
        // Config form submit
        this.configForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveConfiguration();
        });
    }
    
    /**
     * Register BLE service event listeners
     */
    registerBLEListeners() {
        // Connection listener
        this.bleService.addConnectionListener(() => {
            this.statusElement.textContent = 'Connected to ' + this.bleService.getDeviceName();
            this.statusElement.classList.add('text-success');
            this.statusElement.classList.remove('text-danger');
            this.configSection.style.display = 'flex';
        });
        
        // Disconnection listener
        this.bleService.addDisconnectionListener(() => {
            this.statusElement.textContent = 'Disconnected';
            this.statusElement.classList.add('text-danger');
            this.statusElement.classList.remove('text-success');
            this.configSection.style.display = 'none';
            this.clearDeviceList();
        });
        
        // Data update listener
        this.bleService.addDataUpdateListener((data) => {
            this.updateUI(data);
        });
    }
    
    /**
     * Update UI with data from device
     * @param {Object} data - Data from device
     */
    updateUI(data) {
        // Handle different data formats
        if (typeof data === 'string') {
            // Simple string display
            this.showMessage('Device Data', data);
            return;
        }
        
        // If it's a config object with WiFi settings
        if (data.wifi_ssid !== undefined) {
            this.wifiSSIDInput.value = data.wifi_ssid || '';
            if (data.wifi_password) {
                this.wifiPasswordInput.value = data.wifi_password === '*****' ? '' : data.wifi_password;
            }
        }
        
        // If it has sensor readings
        if (data.temperature !== undefined && this.temperatureElement) {
            this.temperatureElement.textContent = data.temperature.toFixed(1) + '°C';
        }
        
        if (data.humidity !== undefined && this.humidityElement) {
            this.humidityElement.textContent = data.humidity.toFixed(1) + '%';
        }
        
        if (data.batteryLevel !== undefined && this.batteryLevelElement) {
            this.batteryLevelElement.textContent = data.batteryLevel + '%';
        }
    }
    
    /**
     * Scan for BLE devices
     */
    async scanForDevices() {
        try {
            this.showMessage('Scanning', 'Looking for ESP32 devices...');
            this.clearDeviceList();
            
            const devices = await this.bleService.scan();
            
            if (devices.length === 0) {
                this.showMessage('No Devices Found', 'No ESP32 devices were found. Make sure your device is powered on and in range.');
                return;
            }
            
            // Add devices to the list
            devices.forEach(device => {
                this.addDeviceToList(device);
            });
            
            // If only one device found, connect to it automatically
            if (devices.length === 1) {
                this.connectToDevice(devices[0]);
            }
        } catch (error) {
            this.showMessage('Error', `Failed to scan for devices: ${error.message}`);
        }
    }
    
    /**
     * Clear the device list
     */
    clearDeviceList() {
        this.deviceList.innerHTML = '';
    }
    
    /**
     * Add a device to the device list
     * @param {BluetoothDevice} device - The device to add
     */
    addDeviceToList(device) {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device-item';
        deviceElement.textContent = device.name || 'Unknown Device';
        deviceElement.addEventListener('click', () => {
            this.connectToDevice(device);
        });
        
        this.deviceList.appendChild(deviceElement);
    }
    
    /**
     * Connect to a BLE device
     * @param {BluetoothDevice} device - The device to connect to
     */
    async connectToDevice(device) {
        try {
            this.statusElement.textContent = 'Connecting...';
            
            await this.bleService.connect(device);
            
            // Connection successful - UI will be updated by connection listener
        } catch (error) {
            this.showMessage('Connection Error', `Failed to connect to device: ${error.message}`);
            this.statusElement.textContent = 'Connection failed';
            this.statusElement.classList.add('text-danger');
            this.statusElement.classList.remove('text-success');
        }
    }
    
    /**
     * Save configuration to the device
     */
    async saveConfiguration() {
        try {
            const config = {
                wifi_ssid: this.wifiSSIDInput.value,
                wifi_password: this.wifiPasswordInput.value
            };
            
            await this.bleService.sendData(config);
            
            this.showMessage('Success', 'Configuration sent to device');
        } catch (error) {
            this.showMessage('Error', `Failed to send configuration: ${error.message}`);
        }
    }
    
    /**
     * Show a message in the modal dialog
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     */
    showMessage(title, message) {
        document.getElementById('messageModalLabel').textContent = title;
        this.modalMessage.innerHTML = message;
        this.messageModal.show();
    }
}