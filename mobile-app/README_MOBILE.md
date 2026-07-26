# EventConnect Mobile App

## Setup Instructions

### 1. Prerequisites
- Node.js (Installed)
- Expo CLI (Installed via dependencies)
- Expo Go App on your physical device (Android/iOS) OR Android Studio Emulator / Xcode Simulator.

### 2. Configuration
The environment has been pre-configured for **local development**.
- Check `.env` file.
- `EXPO_PUBLIC_API_URL` is set to your LAN IP (`http://192.168.100.96:5000`) so you can test on physical devices connected to the same Wi-Fi.

### 3. Installation
Dependencies have already been installed. If you need to reinstall:
```bash
npm install
```

### 4. Running the App
Start the Expo development server:

```bash
npx expo start
```

- **Scan QR Code**: Use the Expo Go app on your phone to scan the QR code displayed in the terminal.
- **Press 'a'**: To run on Android Emulator.
- **Press 'i'**: To run on iOS Simulator (macOS only).
- **Press 'w'**: To run in Web Browser.

## Troubleshooting

### Network Error / Backend Connection Check
If the app fails to connect to the backend:
1. Ensure your backend is running:
   ```bash
   cd backend-api
   npm start
   ```
2. Verify that your phone/emulator is on the same network as your PC.
3. Check if the IP in `.env` matches your current IP (run `ipconfig` if unsure).

### Clear Cache
If you encounter strange bundler issues:
```bash
npx expo start -c
```
