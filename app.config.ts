import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'CareMind AI',
  slug: 'caremind-ai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'caremind',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#6366F1',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.caremind.ai',
    infoPlist: {
      NSCameraUsageDescription: 'CareMind needs camera access for video consultations',
      NSMicrophoneUsageDescription: 'CareMind needs microphone access for consultations and recording',
      NSPhotoLibraryUsageDescription: 'CareMind needs photo library access to upload documents',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0EA5E9',
    },
    package: 'com.caremind.ai',
    softwareKeyboardLayoutMode: 'resize',
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.BLUETOOTH',
      'android.permission.WAKE_LOCK',
    ],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL,
    eas: {
      projectId: 'caremind-ai-mobile',
    },
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-dev-client',
    'expo-router',
    'expo-font',
    'expo-secure-store',
    '@livekit/react-native-expo-plugin',
    '@config-plugins/react-native-webrtc',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
        ios: {
          deploymentTarget: '15.1',
        },
      },
    ],
  ],
};

export default config;
