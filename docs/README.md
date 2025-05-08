# ESP32 BLE Configuration Web App

This web application provides a user interface for configuring and monitoring ESP32 devices via BLE (Bluetooth Low Energy). It's designed to be compatible with GitHub Pages for easy hosting.

## Features

- Connect to ESP32 devices via Web Bluetooth API
- Configure device settings
- Monitor sensor data in real-time
- Perform OTA (Over-The-Air) firmware updates
- Responsive design for desktop and mobile devices

## Browser Compatibility

This application uses the Web Bluetooth API, which is currently supported by:
- Chrome (desktop and Android)
- Edge (desktop)
- Opera (desktop)

⚠️ **Note**: Web Bluetooth is NOT supported on iOS (Safari on iPhone/iPad) or Firefox.

## Deployment to GitHub Pages

To deploy this web app to GitHub Pages:

1. Create a GitHub repository for your project
2. Push the entire ESP32 project (including the `app` folder) to your repository
3. Go to your repository settings on GitHub
4. Scroll down to the "GitHub Pages" section
5. Select the branch you want to publish from (usually `main` or `master`)
6. Select the `/app` folder as the publishing source
7. Click "Save"

GitHub will provide you with a URL where your application is hosted.

## Local Development

You can also run this application locally:

1. Clone the repository
2. Navigate to the `app` folder
3. Open `index.html` in a compatible browser
4. Enable developer mode if requested

## Usage

1. Power on your ESP32 device with the compatible firmware
2. Open the web app in a compatible browser
3. Click "Scan for BLE Devices" to find your ESP32
4. Select your device from the list
5. Use the dashboard to configure your device and monitor sensor data

## Security Considerations

The Web Bluetooth API requires HTTPS to work, except on localhost. GitHub Pages provides HTTPS automatically, making it an ideal hosting solution.

## Customization

- Edit `style.css` to change the appearance
- Modify `index.html` to add or remove dashboard widgets
- Update JavaScript files to change functionality

## License

MIT License