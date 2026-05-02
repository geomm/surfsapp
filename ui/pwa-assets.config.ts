import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

const basePreset = {
  ...minimal2023Preset,
  maskable: {
    sizes: [192, 512],
  },
  assetName: (type, size) => {
    switch (type) {
      case 'transparent':
        return `pwa-${size.width}x${size.height}.png`;
      case 'maskable':
        return `pwa-maskable-${size.width}x${size.height}.png`;
      case 'apple':
        return `apple-touch-icon-${size.width}x${size.height}.png`;
    }
  },
};

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    basePreset,
    {
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#1a73e8' },
      linkMediaOptions: { log: true, addMediaScreen: true, basePath: '/', xhtml: false },
    },
    ['iPhone 14', 'iPhone 14 Pro Max', 'iPad Air 10.9"', 'iPad Pro 12.9"'],
  ),
  images: ['public/logo.svg'],
});
