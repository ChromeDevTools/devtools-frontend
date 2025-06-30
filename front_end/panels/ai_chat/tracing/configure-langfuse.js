// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Configuration script for Langfuse tracing
 * Run this in the browser console where DevTools is running to configure tracing
 * 
 * NOTE: This script now uses the persistent tracing configuration that survives
 * navigation changes. You can also configure tracing via the AI Chat Settings UI.
 */

(function configureLangfuseTracing() {
  console.log('🔧 Configuring Langfuse Tracing for DevTools AI Chat');
  
  // Default configuration - modify these values as needed
  const config = {
    // Langfuse server endpoint
    endpoint: 'http://localhost:3000',
    
    // Langfuse public key (get from your Langfuse project settings)
    publicKey: 'pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    
    // Langfuse secret key (get from your Langfuse project settings)
    secretKey: 'sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  };

  // Check if keys need to be replaced
  if (config.publicKey.includes('xxxxxxxx') || config.secretKey.includes('xxxxxxxx')) {
    console.warn('⚠️  Please replace the placeholder keys with your actual Langfuse credentials');
    console.log('📝 Get your credentials from: https://your-langfuse-instance.com/project/settings');
    console.log('💡 Alternatively, use the AI Chat Settings dialog to configure tracing with a UI');
    return;
  }

  // Use the new configureLangfuseTracing function from TracingConfig
  // This will be available once AI Chat loads
  if (typeof window.configureLangfuseTracing === 'function') {
    window.configureLangfuseTracing(config.endpoint, config.publicKey, config.secretKey);
  } else {
    // Fallback to localStorage for immediate configuration
    localStorage.setItem('ai_chat_langfuse_endpoint', config.endpoint);
    localStorage.setItem('ai_chat_langfuse_public_key', config.publicKey);
    localStorage.setItem('ai_chat_langfuse_secret_key', config.secretKey);
    localStorage.setItem('ai_chat_langfuse_enabled', 'true');
    
    console.log('✅ Langfuse tracing configuration saved to localStorage:');
    console.log('   Endpoint:', config.endpoint);
    console.log('   Public Key:', config.publicKey.substring(0, 15) + '...');
    console.log('   Secret Key:', config.secretKey.substring(0, 15) + '...');
    console.log('   Enabled: true');
    console.log('');
    console.log('📊 Tracing will start with the next AI Chat interaction');
    console.log('🔍 View traces at:', config.endpoint);
    console.log('⚠️  Note: Configuration will persist across page navigations');
  }
})();

// Helper functions (available in global scope)

/**
 * Get current Langfuse configuration
 */
function getLangfuseConfig() {
  return {
    endpoint: localStorage.getItem('ai_chat_langfuse_endpoint') || 'http://localhost:3000',
    publicKey: localStorage.getItem('ai_chat_langfuse_public_key') || '',
    secretKey: localStorage.getItem('ai_chat_langfuse_secret_key') || '',
    enabled: localStorage.getItem('ai_chat_langfuse_enabled') === 'true'
  };
}

/**
 * Clear Langfuse configuration
 */
function clearLangfuseConfig() {
  localStorage.removeItem('ai_chat_langfuse_endpoint');
  localStorage.removeItem('ai_chat_langfuse_public_key');
  localStorage.removeItem('ai_chat_langfuse_secret_key');
  localStorage.removeItem('ai_chat_langfuse_enabled');
  console.log('🧹 Langfuse configuration cleared');
}

/**
 * Enable tracing
 */
function enableLangfuseTracing() {
  localStorage.setItem('ai_chat_langfuse_enabled', 'true');
  console.log('✅ Langfuse tracing enabled');
}

/**
 * Disable tracing
 */
function disableLangfuseTracing() {
  localStorage.setItem('ai_chat_langfuse_enabled', 'false');
  console.log('❌ Langfuse tracing disabled');
}

console.log('');
console.log('🛠️  Available helper functions:');
console.log('   getLangfuseConfig() - View current configuration');
console.log('   clearLangfuseConfig() - Clear all configuration');
console.log('   enableLangfuseTracing() - Enable tracing');
console.log('   disableLangfuseTracing() - Disable tracing');