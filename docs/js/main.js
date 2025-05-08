/**
 * Main Application Entry Point
 * Initializes BLE service and UI controller
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
        showBrowserSupportError();
        return;
    }
    
    // Initialize BLE service
    const bleService = new BLEService();
    
    // Initialize UI controller
    const uiController = new UIController(bleService);
    
    console.log('ESP32 BLE Configuration application initialized');
});

/**
 * Show browser support error for Web Bluetooth
 */
function showBrowserSupportError() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="alert alert-danger mt-4" role="alert">
            <h4 class="alert-heading">Browser Not Supported</h4>
            <p>Your browser does not support Web Bluetooth API. Please use Chrome, Edge, or Opera on desktop, or Chrome for Android.</p>
            <p>Web Bluetooth is <strong>not supported</strong> on iOS devices (iPhone/iPad).</p>
            <hr>
            <p class="mb-0">More information about Web Bluetooth API support can be found 
            <a href="https://caniuse.com/web-bluetooth" target="_blank">here</a>.</p>
        </div>
    `;
}