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
        
        // WiFi form elements
        this.wifiScanButton = document.getElementById('wifiScanButton');
        this.wifiNetworksList = document.getElementById('wifiNetworksList');
        this.wifiSSIDInput = document.getElementById('wifiSSID');
        this.wifiPasswordInput = document.getElementById('wifiPassword');
        this.wifiConnectionStatus = document.getElementById('wifiConnectionStatus');
        
        // Sensor data elements
        this.temperatureElement = document.getElementById('temperature');
        this.humidityElement = document.getElementById('humidity');
        this.batteryLevelElement = document.getElementById('batteryLevel');
        
        // Modal elements
        this.messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
        this.modalMessage = document.getElementById('modalMessage');
        
        // WiFi scan results storage
        this.wifiNetworks = [];
        
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
        
        // WiFi scan button click
        if (this.wifiScanButton) {
            this.wifiScanButton.addEventListener('click', () => this.scanWiFiNetworks());
        }
    }
    
    /**
     * Register BLE service listeners
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
        
        // WiFi scan results listener
        this.bleService.addWiFiScanListener((data) => {
            this.handleWiFiScanResults(data);
        });
        
        // WiFi status updates listener
        this.bleService.addWiFiStatusListener((data) => {
            this.handleWiFiStatusUpdate(data);
        });
    }
    
    /**
     * Handle WiFi scan results from ESP32
     * @param {Object} data - Scan results data
     */
    handleWiFiScanResults(data) {
        console.log('Received WiFi scan data:', data);
        
        if (data.status === 'scanning') {
            // Show scanning in progress
            this.wifiNetworksList.innerHTML = '<div class="alert alert-info">Scanning for networks...</div>';
            this.wifiNetworks = [];
            return;
        }
        
        if (data.status === 'scan_complete' && data.networks_found === 0) {
            // No networks found
            this.wifiNetworksList.innerHTML = '<div class="alert alert-warning">No networks found</div>';
            return;
        }
        
        if (data.status === 'scan_results') {
            // Store networks from this packet
            if (data.packet === 1) {
                this.wifiNetworks = [];
            }
            
            // Add networks from this packet to our collection
            data.networks.forEach(network => {
                this.wifiNetworks.push(network);
            });
            
            // If this is the last packet, display all networks
            if (data.packet === data.total_packets) {
                this.displayWiFiNetworks();
            }
        }
    }
    
    /**
     * Handle WiFi status updates from ESP32
     * @param {Object} data - WiFi status data
     */
    handleWiFiStatusUpdate(data) {
        console.log('Received WiFi status update:', data);
        
        // Update connection status display
        if (this.wifiConnectionStatus) {
            let statusHtml = '';
            
            switch(data.status) {
                case 'credentials_received':
                    statusHtml = `
                        <div class="alert alert-info">
                            Received credentials for "${data.wifi_ssid}". 
                            Attempting to connect...
                        </div>
                    `;
                    break;
                    
                case 'wifi_connecting':
                    statusHtml = `
                        <div class="alert alert-info">
                            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                                <span class="visually-hidden">Connecting...</span>
                            </div>
                            Connecting to "${data.wifi_ssid}"...
                        </div>
                    `;
                    break;
                    
                case 'wifi_connected':
                    statusHtml = `
                        <div class="alert alert-success">
                            <i class="material-icons">wifi</i>
                            Connected to "${data.wifi_ssid}" 
                            <br>IP: ${data.ip_address || 'Unknown'}
                            <br>Signal strength: ${data.rssi} dBm
                        </div>
                    `;
                    break;
                    
                case 'wifi_disconnected':
                    statusHtml = `
                        <div class="alert alert-warning">
                            <i class="material-icons">wifi_off</i>
                            Disconnected from WiFi
                            ${data.message ? `<br>${data.message}` : ''}
                        </div>
                    `;
                    break;
                    
                case 'error':
                    statusHtml = `
                        <div class="alert alert-danger">
                            <i class="material-icons">error</i>
                            Error: ${data.message || 'Unknown error'}
                        </div>
                    `;
                    break;
            }
            
            if (statusHtml) {
                this.wifiConnectionStatus.innerHTML = statusHtml;
            }
        }
    }
    
    /**
     * Display WiFi networks in the UI
     */
    displayWiFiNetworks() {
        if (this.wifiNetworks.length === 0) {
            this.wifiNetworksList.innerHTML = '<div class="alert alert-warning">No networks found</div>';
            return;
        }
        
        // Sort networks by signal strength (RSSI)
        this.wifiNetworks.sort((a, b) => b.rssi - a.rssi);
        
        this.wifiNetworksList.innerHTML = '';
        
        this.wifiNetworks.forEach(network => {
            const networkItem = document.createElement('div');
            networkItem.className = 'network-item';
            
            // Create signal strength icon class based on RSSI
            let signalClass = 'signal-weak';
            if (network.rssi > -67) {
                signalClass = 'signal-strong';
            } else if (network.rssi > -80) {
                signalClass = 'signal-medium';
            }
            
            // Create lock icon if network is encrypted
            const lockIcon = network.encryption ? 
                '<span class="material-icons">lock</span>' : 
                '<span class="material-icons">lock_open</span>';
            
            networkItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="network-name">${network.ssid}</span>
                    <div>
                        <span class="signal-strength ${signalClass}">
                            <span class="material-icons">wifi</span>
                        </span>
                        ${lockIcon}
                    </div>
                </div>
            `;
            
            // Add click event to select this network
            networkItem.addEventListener('click', () => {
                this.selectWiFiNetwork(network);
            });
            
            this.wifiNetworksList.appendChild(networkItem);
        });
    }
    
    /**
     * Select a WiFi network from the list
     * @param {Object} network - The selected network
     */
    selectWiFiNetwork(network) {
        console.log('Selected network:', network);
        
        // Highlight the selected network
        const networkItems = this.wifiNetworksList.querySelectorAll('.network-item');
        networkItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // Find the element that represents this network and add selected class
        networkItems.forEach(item => {
            const nameElement = item.querySelector('.network-name');
            if (nameElement && nameElement.textContent === network.ssid) {
                item.classList.add('selected');
            }
        });
        
        // Fill in the SSID
        this.wifiSSIDInput.value = network.ssid;
        
        // Focus on password field if encryption is enabled
        if (network.encryption) {
            this.wifiPasswordInput.focus();
        } else {
            // No password needed for open networks
            this.wifiPasswordInput.value = '';
        }
    }
    
    /**
     * Scan for WiFi networks
     */
    async scanWiFiNetworks() {
        try {
            if (!this.bleService.isConnected()) {
                this.showMessage('Error', 'Please connect to the ESP32 device first');
                return;
            }
            
            // Send scan command
            await this.bleService.scanWiFiNetworks();
            
        } catch (error) {
            this.showMessage('Error', `Failed to scan for WiFi networks: ${error.message}`);
        }
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
        
        // Only process data with status field
        if (!data.status) return;
        
        // For sensor updates, we don't want to override user input in the SSID field
        // if they're in the middle of configuring a new network
        if (data.status === 'sensor_update') {
            // Update WiFi connection status if available
            if (data.wifi_connected !== undefined && this.wifiConnectionStatus) {
                if (data.wifi_connected) {
                    this.wifiConnectionStatus.innerHTML = `
                        <div class="alert alert-success">
                            Connected to ${data.wifi_ssid}<br>
                            IP: ${data.ip_address || 'Unknown'}
                        </div>
                    `;
                } else {
                    this.wifiConnectionStatus.innerHTML = `
                        <div class="alert alert-warning">
                            Not connected to WiFi
                        </div>
                    `;
                }
            }
            
            // Only update the SSID input if it's empty and we have a value from the device
            if (data.wifi_ssid && this.wifiSSIDInput && this.wifiSSIDInput.value === '') {
                this.wifiSSIDInput.value = data.wifi_ssid || '';
            }
            
            // Update sensor readings
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
    }
    
    /**
     * Scan for BLE devices
     */
    async scanForDevices() {
        try {
            this.showMessage('Scanning', 'Looking for ESP32 devices...');
            this.clearDeviceList();
            
            const devices = await this.bleService.scan();
            
            // Close the message modal after scanning completes
            this.messageModal.hide();
            
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
            this.messageModal.hide(); // Hide the scanning modal
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
            
            this.showMessage('Success', 'WiFi configuration sent to device. Attempting to connect...');
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