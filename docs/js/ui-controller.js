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
        this.deviceNameInput = document.getElementById('deviceName');
        this.refreshRateInput = document.getElementById('refreshRate');
        this.ledEnabledInput = document.getElementById('ledEnabled');
        this.sensorUpdateIntervalInput = document.getElementById('sensorUpdateInterval');
        this.calibrationFactorInput = document.getElementById('calibrationFactor');
        this.wifiSSIDInput = document.getElementById('wifiSSID');
        this.wifiPasswordInput = document.getElementById('wifiPassword');
        
        // Sensor data elements
        this.temperatureElement = document.getElementById('temperature');
        this.humidityElement = document.getElementById('humidity');
        this.batteryLevelElement = document.getElementById('batteryLevel');
        this.uptimeElement = document.getElementById('uptime');
        
        // OTA update elements
        this.firmwareFileInput = document.getElementById('firmwareFile');
        this.otaProgressContainer = document.getElementById('otaProgress');
        this.otaProgressBar = this.otaProgressContainer.querySelector('.progress-bar');
        
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
        
        // OTA form submit
        this.otaForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.performOTAUpdate();
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
        
        // Config update listener
        this.bleService.addConfigUpdateListener((config) => {
            this.updateConfigForm(config);
        });
        
        // Sensor update listener
        this.bleService.addSensorUpdateListener((data) => {
            this.updateSensorDisplay(data);
        });
        
        // OTA update listener
        this.bleService.addOTAUpdateListener((result) => {
            this.showMessage('OTA Update', `Status: ${result.status}<br>Message: ${result.message}`);
            this.otaProgressContainer.style.display = 'none';
        });
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
     * Update the config form with values from the device
     * @param {Object} config - Configuration data
     */
    updateConfigForm(config) {
        this.deviceNameInput.value = config.deviceName || '';
        this.refreshRateInput.value = config.refreshRate || 5000;
        this.ledEnabledInput.checked = config.ledEnabled || false;
        this.sensorUpdateIntervalInput.value = config.sensorUpdateInterval || 60;
        this.calibrationFactorInput.value = config.calibrationFactor || 1.0;
        this.wifiSSIDInput.value = config.wifiSSID || '';
        this.wifiPasswordInput.value = config.wifiPassword === '****' ? '' : (config.wifiPassword || '');
    }
    
    /**
     * Save configuration to the device
     */
    async saveConfiguration() {
        try {
            const config = {
                deviceName: this.deviceNameInput.value,
                refreshRate: parseInt(this.refreshRateInput.value),
                ledEnabled: this.ledEnabledInput.checked,
                sensorUpdateInterval: parseInt(this.sensorUpdateIntervalInput.value),
                calibrationFactor: parseFloat(this.calibrationFactorInput.value),
                wifiSSID: this.wifiSSIDInput.value,
                wifiPassword: this.wifiPasswordInput.value
            };
            
            await this.bleService.updateConfig(config);
            
            this.showMessage('Success', 'Configuration updated successfully');
        } catch (error) {
            this.showMessage('Error', `Failed to update configuration: ${error.message}`);
        }
    }
    
    /**
     * Update the sensor display with new data
     * @param {Object} data - Sensor data
     */
    updateSensorDisplay(data) {
        if (data.temperature !== undefined) {
            this.temperatureElement.textContent = data.temperature.toFixed(1);
        }
        
        if (data.humidity !== undefined) {
            this.humidityElement.textContent = data.humidity.toFixed(1);
        }
        
        if (data.batteryLevel !== undefined) {
            this.batteryLevelElement.textContent = data.batteryLevel.toFixed(0);
        }
        
        if (data.timestamp !== undefined) {
            this.uptimeElement.textContent = this.formatTime(data.timestamp);
        }
    }
    
    /**
     * Format time in milliseconds to a human-readable string
     * @param {number} milliseconds - Time in milliseconds
     * @returns {string} Formatted time string
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Perform OTA update with firmware file
     */
    async performOTAUpdate() {
        const fileInput = this.firmwareFileInput;
        
        if (fileInput.files.length === 0) {
            this.showMessage('Error', 'Please select a firmware file to upload');
            return;
        }
        
        const file = fileInput.files[0];
        
        try {
            // Show progress bar
            this.otaProgressContainer.style.display = 'block';
            this.otaProgressBar.style.width = '0%';
            this.otaProgressBar.textContent = '0%';
            
            // Define progress callback function
            const updateProgress = (progress) => {
                this.otaProgressBar.style.width = `${progress}%`;
                this.otaProgressBar.textContent = `${progress}%`;
            };
            
            // Start OTA update
            const result = await this.bleService.uploadFirmware(file, updateProgress);
            
            if (result) {
                this.showMessage('Success', 'Firmware update completed successfully');
            } else {
                this.showMessage('Error', 'Firmware update failed');
            }
        } catch (error) {
            this.showMessage('Error', `Failed to update firmware: ${error.message}`);
            this.otaProgressContainer.style.display = 'none';
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