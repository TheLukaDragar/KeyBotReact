// mockExpoConstants.js
import appConfig from '../app.config';
const expoConfig = appConfig({ config: {} });

export default {
  expoConfig: {
    extra: {
      API_URL: expoConfig.extra.API_URL,
      reputationSCAddress: expoConfig.extra.reputationSCAddress,
      parcelNFTSCAddress: expoConfig.extra.parcelNFTSCAddress,
      RPCUrl: expoConfig.extra.RPCUrl,
      DLMDApp: expoConfig.extra.DLMDApp, 
      use_demo_device: true,
    },
  },
};
