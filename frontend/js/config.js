/**
 * SkillBridge Platform - Centralized Production/Development API Configuration
 * Automatically detects hosting environment and supplies the correct REST API endpoint
 */
(function (global) {
  'use strict';

  // Configured Production & Local backend endpoints
  const PRODUCTION_BACKEND_ORIGIN = 'https://skillbridge-api.onrender.com';
  const PRODUCTION_API_URL = `${PRODUCTION_BACKEND_ORIGIN}/api`;
  const LOCAL_API_URL = 'http://localhost:5000/api';

  const isLocalhost = Boolean(
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '[::1]' ||
     window.location.protocol === 'file:')
  );

  // Allow runtime override via localStorage for staging or testing
  const storedOverride = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('SKILLBRIDGE_API_URL')) || null;
  const activeApiUrl = storedOverride || (isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL);

  const SkillBridgeConfig = {
    isProduction: !isLocalhost,
    apiBaseUrl: activeApiUrl,
    productionApiUrl: PRODUCTION_API_URL,
    localApiUrl: LOCAL_API_URL,
    getApiUrl: function (endpoint) {
      const cleanEndpoint = endpoint ? (endpoint.startsWith('/') ? endpoint : `/${endpoint}`) : '';
      return `${this.apiBaseUrl}${cleanEndpoint}`;
    },
    setApiUrl: function (newUrl) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('SKILLBRIDGE_API_URL', newUrl);
        this.apiBaseUrl = newUrl;
      }
    }
  };

  global.SkillBridgeConfig = SkillBridgeConfig;
  global.SKILLBRIDGE_CONFIG = SkillBridgeConfig;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillBridgeConfig;
  }
})(typeof window !== 'undefined' ? window : this);
