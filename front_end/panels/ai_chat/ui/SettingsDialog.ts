// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { createLogger } from '../core/Logger.js';
import { getTracingConfig, setTracingConfig, isTracingEnabled } from '../tracing/TracingConfig.js';
import { getEvaluationConfig, setEvaluationConfig, isEvaluationEnabled, testEvaluationConnection, connectToEvaluationService, getEvaluationClientId, isEvaluationConnected } from '../common/EvaluationConfig.js';
import { DEFAULT_PROVIDER_MODELS } from './AIChatPanel.js';

const logger = createLogger('SettingsDialog');

// Model type definition
interface ModelOption {
  value: string;
  label: string;
  type: 'openai' | 'litellm' | 'groq' | 'openrouter';
}

// Local storage keys
const MODEL_SELECTION_KEY = 'ai_chat_model_selection';
const MINI_MODEL_STORAGE_KEY = 'ai_chat_mini_model';
const NANO_MODEL_STORAGE_KEY = 'ai_chat_nano_model';
const LITELLM_ENDPOINT_KEY = 'ai_chat_litellm_endpoint';
const LITELLM_API_KEY_STORAGE_KEY = 'ai_chat_litellm_api_key';
const GROQ_API_KEY_STORAGE_KEY = 'ai_chat_groq_api_key';
const OPENROUTER_API_KEY_STORAGE_KEY = 'ai_chat_openrouter_api_key';
const PROVIDER_SELECTION_KEY = 'ai_chat_provider';
// Vector DB configuration keys - Milvus format
const VECTOR_DB_ENABLED_KEY = 'ai_chat_vector_db_enabled';
const MILVUS_ENDPOINT_KEY = 'ai_chat_milvus_endpoint';
const MILVUS_USERNAME_KEY = 'ai_chat_milvus_username';
const MILVUS_PASSWORD_KEY = 'ai_chat_milvus_password';
const MILVUS_COLLECTION_KEY = 'ai_chat_milvus_collection';
const MILVUS_OPENAI_KEY = 'ai_chat_milvus_openai_key';

// UI Strings
const UIStrings = {
  /**
   *@description Settings dialog title
   */
  settings: 'Settings',
  /**
   *@description Provider selection label
   */
  providerLabel: 'Provider',
  /**
   *@description Provider selection hint
   */
  providerHint: 'Select which AI provider to use',
  /**
   *@description OpenAI provider option
   */
  openaiProvider: 'OpenAI',
  /**
   *@description LiteLLM provider option
   */
  litellmProvider: 'LiteLLM',
  /**
   *@description Groq provider option
   */
  groqProvider: 'Groq',
  /**
   *@description OpenRouter provider option
   */
  openrouterProvider: 'OpenRouter',
  /**
   *@description LiteLLM API Key label
   */
  liteLLMApiKey: 'LiteLLM API Key',
  /**
   *@description LiteLLM API Key hint
   */
  liteLLMApiKeyHint: 'Your LiteLLM API key for authentication (optional)',
  /**
   *@description LiteLLM endpoint label
   */
  litellmEndpointLabel: 'LiteLLM Endpoint',
  /**
   *@description LiteLLM endpoint hint
   */
  litellmEndpointHint: 'Enter the URL for your LiteLLM server (e.g., http://localhost:4000 or https://your-litellm-server.com)',
  /**
   *@description Groq API Key label
   */
  groqApiKeyLabel: 'Groq API Key',
  /**
   *@description Groq API Key hint
   */
  groqApiKeyHint: 'Your Groq API key for authentication',
  /**
   *@description Fetch Groq models button text
   */
  fetchGroqModelsButton: 'Fetch Groq Models',
  /**
   *@description OpenRouter API Key label
   */
  openrouterApiKeyLabel: 'OpenRouter API Key',
  /**
   *@description OpenRouter API Key hint
   */
  openrouterApiKeyHint: 'Your OpenRouter API key for authentication',
  /**
   *@description Fetch OpenRouter models button text
   */
  fetchOpenRouterModelsButton: 'Fetch OpenRouter Models',
  /**
   *@description OpenAI API Key label
   */
  apiKeyLabel: 'OpenAI API Key',
  /**
   *@description OpenAI API Key hint
   */
  apiKeyHint: 'An OpenAI API key is required for OpenAI models (GPT-4.1, O4 Mini, etc.)',
  /**
   *@description Test button text
   */
  testButton: 'Test',
  /**
   *@description Add button text
   */
  addButton: 'Add',
  /**
   *@description Remove button text
   */
  removeButton: 'Remove',
  /**
   *@description Fetch models button text
   */
  fetchModelsButton: 'Fetch LiteLLM Models',
  /**
   *@description Fetching models status
   */
  fetchingModels: 'Fetching models...',
  /**
   *@description Wildcard models only message
   */
  wildcardModelsOnly: 'LiteLLM proxy returned wildcard model only. Please add custom models below.',
  /**
   *@description Wildcard and custom models message
   */
  wildcardAndCustomModels: 'Fetched wildcard model (custom models available)',
  /**
   *@description Wildcard and other models message with count
   */
  wildcardAndOtherModels: 'Fetched {PH1} models plus wildcard',
  /**
   *@description Fetched models message with count
   */
  fetchedModels: 'Fetched {PH1} models',
  /**
   *@description LiteLLM endpoint required error
   */
  endpointRequired: 'LiteLLM endpoint is required to test model',
  /**
   *@description Custom models label
   */
  customModelsLabel: 'Custom Models',
  /**
   *@description Custom models hint
   */
  customModelsHint: 'Add custom models one at a time.',
  /**
   *@description Mini model label
   */
  miniModelLabel: 'Mini Model',
  /**
   *@description Mini model description
   */
  miniModelDescription: 'Used for fast operations, tools, and sub-tasks',
  /**
   *@description Nano model label
   */
  nanoModelLabel: 'Nano Model',
  /**
   *@description Nano model description
   */
  nanoModelDescription: 'Used for very fast operations and simple tasks',
  /**
   *@description Default mini model option
   */
  defaultMiniOption: 'Use default (main model)',
  /**
   *@description Default nano model option
   */
  defaultNanoOption: 'Use default (mini model or main model)',
  /**
   *@description Browsing history section title
   */
  browsingHistoryTitle: 'Browsing History',
  /**
   *@description Browsing history description
   */
  browsingHistoryDescription: 'Your browsing history is stored locally to enable search by domains and keywords.',
  /**
   *@description Clear browsing history button
   */
  clearHistoryButton: 'Clear Browsing History',
  /**
   *@description History cleared message
   */
  historyCleared: 'Browsing history cleared successfully',
  /**
   *@description Important notice title
   */
  importantNotice: 'Important Notice',
  /**
   *@description Vector DB section label
   */
  vectorDBLabel: 'Vector Database Configuration',
  /**
   *@description Vector DB enabled label
   */
  vectorDBEnabled: 'Enable Vector Database',
  /**
   *@description Vector DB enabled hint
   */
  vectorDBEnabledHint: 'Enable Vector Database for semantic search of websites',
  /**
   *@description Milvus endpoint label
   */
  vectorDBEndpoint: 'Milvus Endpoint',
  /**
   *@description Milvus endpoint hint
   */
  vectorDBEndpointHint: 'Enter the URL for your Milvus server (e.g., http://localhost:19530 or https://your-milvus.com)',
  /**
   *@description Milvus username label
   */
  vectorDBApiKey: 'Milvus Username',
  /**
   *@description Milvus username hint
   */
  vectorDBApiKeyHint: 'For self-hosted: username (default: root). For Milvus Cloud: leave as root',
  /**
   *@description Vector DB collection label
   */
  vectorDBCollection: 'Collection Name',
  /**
   *@description Vector DB collection hint
   */
  vectorDBCollectionHint: 'Name of the collection to store websites (default: bookmarks)',
  /**
   *@description Milvus password/token label
   */
  milvusPassword: 'Password/API Token',
  /**
   *@description Milvus password/token hint
   */
  milvusPasswordHint: 'For self-hosted: password (default: Milvus). For Milvus Cloud: API token directly',
  /**
   *@description OpenAI API key for embeddings label
   */
  milvusOpenAIKey: 'OpenAI API Key (for embeddings)',
  /**
   *@description OpenAI API key for embeddings hint
   */
  milvusOpenAIKeyHint: 'Required for generating embeddings using OpenAI text-embedding-3-small model',
  /**
   *@description Test vector DB connection button
   */
  testVectorDBConnection: 'Test Connection',
  /**
   *@description Vector DB connection testing status
   */
  testingVectorDBConnection: 'Testing connection...',
  /**
   *@description Vector DB connection success message
   */
  vectorDBConnectionSuccess: 'Vector DB connection successful!',
  /**
   *@description Vector DB connection failed message
   */
  vectorDBConnectionFailed: 'Vector DB connection failed',
  /**
   *@description Tracing section title
   */
  tracingSection: 'Tracing Configuration',
  /**
   *@description Tracing enabled label
   */
  tracingEnabled: 'Enable Tracing',
  /**
   *@description Tracing enabled hint
   */
  tracingEnabledHint: 'Enable observability tracing for AI Chat interactions',
  /**
   *@description Langfuse endpoint label
   */
  langfuseEndpoint: 'Langfuse Endpoint',
  /**
   *@description Langfuse endpoint hint
   */
  langfuseEndpointHint: 'URL of your Langfuse server (e.g., http://localhost:3000)',
  /**
   *@description Langfuse public key label
   */
  langfusePublicKey: 'Langfuse Public Key',
  /**
   *@description Langfuse public key hint
   */
  langfusePublicKeyHint: 'Your Langfuse project public key (starts with pk-lf-)',
  /**
   *@description Langfuse secret key label
   */
  langfuseSecretKey: 'Langfuse Secret Key',
  /**
   *@description Langfuse secret key hint
   */
  langfuseSecretKeyHint: 'Your Langfuse project secret key (starts with sk-lf-)',
  /**
   *@description Test tracing button
   */
  testTracing: 'Test Connection',
  /**
   *@description Evaluation section title
   */
  evaluationSection: 'Evaluation Configuration',
  /**
   *@description Evaluation enabled label
   */
  evaluationEnabled: 'Enable Evaluation',
  /**
   *@description Evaluation enabled hint
   */
  evaluationEnabledHint: 'Enable evaluation service connection for AI Chat interactions',
  /**
   *@description Evaluation endpoint label
   */
  evaluationEndpoint: 'Evaluation Endpoint',
  /**
   *@description Evaluation endpoint hint
   */
  evaluationEndpointHint: 'WebSocket endpoint for the evaluation service (e.g., ws://localhost:8080)',
  /**
   *@description Evaluation secret key label
   */
  evaluationSecretKey: 'Evaluation Secret Key',
  /**
   *@description Evaluation secret key hint
   */
  evaluationSecretKeyHint: 'Secret key for authentication with the evaluation service (optional)',
  /**
   *@description Connect to evaluation button
   */
  connectEvaluation: 'Connect',
  /**
   *@description Test evaluation button
   */
  testEvaluation: 'Test Connection',
};

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ui/SettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Helper function to check if Vector DB is enabled
export function isVectorDBEnabled(): boolean {
  return localStorage.getItem(VECTOR_DB_ENABLED_KEY) === 'true';
}

export class SettingsDialog {
  // Variables to store direct references to model selectors
  static #openaiMiniModelSelect: HTMLSelectElement | null = null;
  static #openaiNanoModelSelect: HTMLSelectElement | null = null;
  static #litellmMiniModelSelect: HTMLSelectElement | null = null;
  static #litellmNanoModelSelect: HTMLSelectElement | null = null;
  static #groqMiniModelSelect: HTMLSelectElement | null = null;
  static #groqNanoModelSelect: HTMLSelectElement | null = null;
  static #openrouterMiniModelSelect: HTMLSelectElement | null = null;
  static #openrouterNanoModelSelect: HTMLSelectElement | null = null;
  
  static async show(
    selectedModel: string,
    miniModel: string,
    nanoModel: string,
    onSettingsSaved: () => void,
    fetchLiteLLMModels: (apiKey: string|null, endpoint?: string) => Promise<{models: ModelOption[], hadWildcard: boolean}>,
    updateModelOptions: (litellmModels: ModelOption[], hadWildcard?: boolean) => void,
    getModelOptions: (provider?: 'openai' | 'litellm' | 'groq' | 'openrouter') => ModelOption[],
    addCustomModelOption: (modelName: string, modelType?: 'openai' | 'litellm' | 'groq' | 'openrouter') => ModelOption[],
    removeCustomModelOption: (modelName: string) => ModelOption[],
  ): Promise<void> {
    logger.debug('SettingsDialog.show - Initial parameters:');
    logger.debug('selectedModel:', selectedModel);
    logger.debug('miniModel:', miniModel);
    logger.debug('nanoModel:', nanoModel);
    logger.debug('Current provider:', localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai');
    
    // Get all model options using the provided getModelOptions function
    const modelOptions = getModelOptions();
    logger.debug('Model options from getModelOptions:', modelOptions);
    
    // Count models by provider
    const openaiModels = modelOptions.filter(m => m.type === 'openai');
    const litellmModels = modelOptions.filter(m => m.type === 'litellm');
    logger.debug(`Model counts - OpenAI: ${openaiModels.length}, LiteLLM: ${litellmModels.length}`);
    
    // Reset selector references
    SettingsDialog.#openaiMiniModelSelect = null;
    SettingsDialog.#openaiNanoModelSelect = null;
    SettingsDialog.#litellmMiniModelSelect = null;
    SettingsDialog.#litellmNanoModelSelect = null;
    // Create a settings dialog
    const dialog = new UI.Dialog.Dialog();
    dialog.setDimmed(true);
    dialog.setOutsideClickCallback(() => dialog.hide());
    dialog.contentElement.classList.add('settings-dialog');

    // Create settings content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'settings-content';
    contentDiv.style.overflowY = 'auto';
    dialog.contentElement.appendChild(contentDiv);
    
    // Create header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'settings-header';
    contentDiv.appendChild(headerDiv);
    
    const title = document.createElement('h2');
    title.className = 'settings-title';
    title.textContent = i18nString(UIStrings.settings);
    headerDiv.appendChild(title);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'settings-close-button';
    closeButton.setAttribute('aria-label', 'Close settings');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => dialog.hide());
    headerDiv.appendChild(closeButton);
    
    // Add provider selection dropdown
    const providerSection = document.createElement('div');
    providerSection.className = 'provider-selection-section';
    contentDiv.appendChild(providerSection);
    
    const providerLabel = document.createElement('div');
    providerLabel.className = 'settings-label';
    providerLabel.textContent = i18nString(UIStrings.providerLabel);
    providerSection.appendChild(providerLabel);
    
    const providerHint = document.createElement('div');
    providerHint.className = 'settings-hint';
    providerHint.textContent = i18nString(UIStrings.providerHint);
    providerSection.appendChild(providerHint);
    
    // Get the current provider from localStorage
    const currentProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    // Create provider selection dropdown
    const providerSelect = document.createElement('select');
    providerSelect.className = 'settings-select provider-select';
    providerSection.appendChild(providerSelect);
    
    // Add options to the dropdown
    const openaiOption = document.createElement('option');
    openaiOption.value = 'openai';
    openaiOption.textContent = i18nString(UIStrings.openaiProvider);
    openaiOption.selected = currentProvider === 'openai';
    providerSelect.appendChild(openaiOption);
    
    const litellmOption = document.createElement('option');
    litellmOption.value = 'litellm';
    litellmOption.textContent = i18nString(UIStrings.litellmProvider);
    litellmOption.selected = currentProvider === 'litellm';
    providerSelect.appendChild(litellmOption);
    
    const groqOption = document.createElement('option');
    groqOption.value = 'groq';
    groqOption.textContent = i18nString(UIStrings.groqProvider);
    groqOption.selected = currentProvider === 'groq';
    providerSelect.appendChild(groqOption);
    
    const openrouterOption = document.createElement('option');
    openrouterOption.value = 'openrouter';
    openrouterOption.textContent = i18nString(UIStrings.openrouterProvider);
    openrouterOption.selected = currentProvider === 'openrouter';
    providerSelect.appendChild(openrouterOption);
    
    // Create provider-specific content containers
    const openaiContent = document.createElement('div');
    openaiContent.className = 'provider-content openai-content';
    openaiContent.style.display = currentProvider === 'openai' ? 'block' : 'none';
    contentDiv.appendChild(openaiContent);
    
    const litellmContent = document.createElement('div');
    litellmContent.className = 'provider-content litellm-content';
    litellmContent.style.display = currentProvider === 'litellm' ? 'block' : 'none';
    contentDiv.appendChild(litellmContent);
    
    const groqContent = document.createElement('div');
    groqContent.className = 'provider-content groq-content';
    groqContent.style.display = currentProvider === 'groq' ? 'block' : 'none';
    contentDiv.appendChild(groqContent);
    
    const openrouterContent = document.createElement('div');
    openrouterContent.className = 'provider-content openrouter-content';
    openrouterContent.style.display = currentProvider === 'openrouter' ? 'block' : 'none';
    contentDiv.appendChild(openrouterContent);
    
    // Event listener for provider change
    providerSelect.addEventListener('change', async () => {
      const selectedProvider = providerSelect.value;
      
      // Toggle visibility of provider content
      openaiContent.style.display = selectedProvider === 'openai' ? 'block' : 'none';
      litellmContent.style.display = selectedProvider === 'litellm' ? 'block' : 'none';
      groqContent.style.display = selectedProvider === 'groq' ? 'block' : 'none';
      openrouterContent.style.display = selectedProvider === 'openrouter' ? 'block' : 'none';
      
      logger.debug(`Provider changed to: ${selectedProvider}`);

      // If switching to LiteLLM, fetch the latest models if endpoint is configured
      if (selectedProvider === 'litellm') {
        const endpoint = litellmEndpointInput.value.trim();
        const liteLLMApiKey = litellmApiKeyInput.value.trim() || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
        
        if (endpoint) {
          try {
            logger.debug('Fetching LiteLLM models after provider change...');
            const { models: litellmModels, hadWildcard } = await fetchLiteLLMModels(liteLLMApiKey, endpoint);
            updateModelOptions(litellmModels, hadWildcard);
            logger.debug('Successfully refreshed LiteLLM models after provider change');
          } catch (error) {
            logger.error('Failed to fetch LiteLLM models after provider change:', error);
          }
        }
      } else if (selectedProvider === 'groq') {
        // If switching to Groq, fetch models if API key is configured
        const groqApiKey = groqApiKeyInput.value.trim() || localStorage.getItem('ai_chat_groq_api_key') || '';
        
        if (groqApiKey) {
          try {
            logger.debug('Fetching Groq models after provider change...');
            const groqModels = await LLMClient.fetchGroqModels(groqApiKey);
            const modelOptions: ModelOption[] = groqModels.map(model => ({
              value: model.id,
              label: model.id,
              type: 'groq' as const
            }));
            updateModelOptions(modelOptions, false);
            logger.debug('Successfully refreshed Groq models after provider change');
          } catch (error) {
            logger.error('Failed to fetch Groq models after provider change:', error);
          }
        }
      } else if (selectedProvider === 'openrouter') {
        // If switching to OpenRouter, fetch models if API key is configured
        const openrouterApiKey = openrouterApiKeyInput.value.trim() || localStorage.getItem('ai_chat_openrouter_api_key') || '';
        
        if (openrouterApiKey) {
          try {
            logger.debug('Fetching OpenRouter models after provider change...');
            const openrouterModels = await LLMClient.fetchOpenRouterModels(openrouterApiKey);
            const modelOptions: ModelOption[] = openrouterModels.map(model => ({
              value: model.id,
              label: model.name || model.id,
              type: 'openrouter' as const
            }));
            updateModelOptions(modelOptions, false);
            logger.debug('Successfully refreshed OpenRouter models after provider change');
          } catch (error) {
            logger.error('Failed to fetch OpenRouter models after provider change:', error);
          }
        }
      }

      // Get model options filtered by the selected provider
      const availableModels = getModelOptions(selectedProvider as 'openai' | 'litellm' | 'groq' | 'openrouter');
      logger.debug(`Available models for ${selectedProvider}:`, availableModels);
      logger.debug(`Current miniModel: ${miniModel}, nanoModel: ${nanoModel}`);


      // Refresh model selectors based on new provider
      if (selectedProvider === 'openai') {
        // Use our reusable function to update OpenAI model selectors
        updateOpenAIModelSelectors();
      } else if (selectedProvider === 'litellm') {
        // Make sure LiteLLM selectors are updated
        updateLiteLLMModelSelectors();
      } else if (selectedProvider === 'groq') {
        // Update Groq selectors
        updateGroqModelSelectors();
      } else if (selectedProvider === 'openrouter') {
        // Update OpenRouter selectors
        updateOpenRouterModelSelectors();
      }
    });
    
    // Setup OpenAI content
    const openaiSettingsSection = document.createElement('div');
    openaiSettingsSection.className = 'settings-section';
    openaiContent.appendChild(openaiSettingsSection);
    
    const apiKeyLabel = document.createElement('div');
    apiKeyLabel.className = 'settings-label';
    apiKeyLabel.textContent = i18nString(UIStrings.apiKeyLabel);
    openaiSettingsSection.appendChild(apiKeyLabel);
    
    const apiKeyHint = document.createElement('div');
    apiKeyHint.className = 'settings-hint';
    apiKeyHint.textContent = i18nString(UIStrings.apiKeyHint);
    openaiSettingsSection.appendChild(apiKeyHint);
    
    const settingsSavedApiKey = localStorage.getItem('ai_chat_api_key') || '';
    const settingsApiKeyInput = document.createElement('input');
    settingsApiKeyInput.className = 'settings-input';
    settingsApiKeyInput.type = 'password';
    settingsApiKeyInput.placeholder = 'Enter your OpenAI API key';
    settingsApiKeyInput.value = settingsSavedApiKey;
    openaiSettingsSection.appendChild(settingsApiKeyInput);
    
    const settingsApiKeyStatus = document.createElement('div');
    settingsApiKeyStatus.className = 'settings-status';
    settingsApiKeyStatus.style.display = 'none';
    openaiSettingsSection.appendChild(settingsApiKeyStatus);
    
    // Function to update OpenAI model selectors
    function updateOpenAIModelSelectors() {
      logger.debug('Updating OpenAI model selectors');
      
      // Get the latest model options filtered for OpenAI provider
      const openaiModels = getModelOptions('openai');
      logger.debug('OpenAI models from getModelOptions:', openaiModels);

      // Get valid models using generic helper
      const validMiniModel = getValidModelForProvider(miniModel, openaiModels, 'openai', 'mini');
      const validNanoModel = getValidModelForProvider(nanoModel, openaiModels, 'openai', 'nano');

      // Clear any existing model selectors
      const existingSelectors = openaiContent.querySelectorAll('.model-selection-section');
      existingSelectors.forEach(selector => selector.remove());
      
      // Create a new model selection section
      const openaiModelSection = document.createElement('div');
      openaiModelSection.className = 'settings-section model-selection-section';
      openaiContent.appendChild(openaiModelSection);
      
      const openaiModelSectionTitle = document.createElement('h3');
      openaiModelSectionTitle.className = 'settings-subtitle';
      openaiModelSectionTitle.textContent = 'Model Size Selection';
      openaiModelSection.appendChild(openaiModelSectionTitle);
      
      logger.debug(`Current miniModel: ${miniModel}, nanoModel: ${nanoModel}`);
      
      // No focus handler needed for OpenAI selectors as we don't need to fetch models on focus
      
      // Create OpenAI Mini Model selection and store reference
      SettingsDialog.#openaiMiniModelSelect = createModelSelector(
        openaiModelSection,
        i18nString(UIStrings.miniModelLabel),
        i18nString(UIStrings.miniModelDescription),
        'mini-model-select',
        openaiModels,
        validMiniModel,
        i18nString(UIStrings.defaultMiniOption),
        undefined // No focus handler for OpenAI
      );
      
      logger.debug('Created OpenAI Mini Model Select:', SettingsDialog.#openaiMiniModelSelect);
      
      // Create OpenAI Nano Model selection and store reference
      SettingsDialog.#openaiNanoModelSelect = createModelSelector(
        openaiModelSection,
        i18nString(UIStrings.nanoModelLabel),
        i18nString(UIStrings.nanoModelDescription),
        'nano-model-select',
        openaiModels,
        validNanoModel,
        i18nString(UIStrings.defaultNanoOption),
        undefined // No focus handler for OpenAI
      );
      
      logger.debug('Created OpenAI Nano Model Select:', SettingsDialog.#openaiNanoModelSelect);
    }
    
    // Initialize OpenAI model selectors
    updateOpenAIModelSelectors();
    
    // Setup LiteLLM content
    const litellmSettingsSection = document.createElement('div');
    litellmSettingsSection.className = 'settings-section';
    litellmContent.appendChild(litellmSettingsSection);
    
    // LiteLLM endpoint
    const litellmEndpointLabel = document.createElement('div');
    litellmEndpointLabel.className = 'settings-label';
    litellmEndpointLabel.textContent = i18nString(UIStrings.litellmEndpointLabel);
    litellmSettingsSection.appendChild(litellmEndpointLabel);
    
    const litellmEndpointHint = document.createElement('div');
    litellmEndpointHint.className = 'settings-hint';
    litellmEndpointHint.textContent = i18nString(UIStrings.litellmEndpointHint);
    litellmSettingsSection.appendChild(litellmEndpointHint);
    
    const settingsSavedLiteLLMEndpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY) || '';
    const litellmEndpointInput = document.createElement('input');
    litellmEndpointInput.className = 'settings-input litellm-endpoint-input';
    litellmEndpointInput.type = 'text';
    litellmEndpointInput.placeholder = 'http://localhost:4000';
    litellmEndpointInput.value = settingsSavedLiteLLMEndpoint;
    litellmSettingsSection.appendChild(litellmEndpointInput);
    
    // LiteLLM API Key
    const litellmAPIKeyLabel = document.createElement('div');
    litellmAPIKeyLabel.className = 'settings-label';
    litellmAPIKeyLabel.textContent = i18nString(UIStrings.liteLLMApiKey);
    litellmSettingsSection.appendChild(litellmAPIKeyLabel);
    
    const litellmAPIKeyHint = document.createElement('div');
    litellmAPIKeyHint.className = 'settings-hint';
    litellmAPIKeyHint.textContent = i18nString(UIStrings.liteLLMApiKeyHint);
    litellmSettingsSection.appendChild(litellmAPIKeyHint);
    
    const settingsSavedLiteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
    const litellmApiKeyInput = document.createElement('input');
    litellmApiKeyInput.className = 'settings-input litellm-api-key-input';
    litellmApiKeyInput.type = 'password';
    litellmApiKeyInput.placeholder = 'Enter your LiteLLM API key';
    litellmApiKeyInput.value = settingsSavedLiteLLMApiKey;
    litellmSettingsSection.appendChild(litellmApiKeyInput);
    
    // Create event handler function
    const updateFetchButtonState = () => {
      fetchModelsButton.disabled = !litellmEndpointInput.value.trim();
    };
    
    litellmEndpointInput.addEventListener('input', updateFetchButtonState);
    
    const fetchButtonContainer = document.createElement('div');
    fetchButtonContainer.className = 'fetch-button-container';
    litellmSettingsSection.appendChild(fetchButtonContainer);
    
    const fetchModelsButton = document.createElement('button');
    fetchModelsButton.className = 'settings-button';
    fetchModelsButton.setAttribute('type', 'button'); // Set explicit button type
    fetchModelsButton.textContent = i18nString(UIStrings.fetchModelsButton);
    fetchModelsButton.disabled = !litellmEndpointInput.value.trim();
    fetchButtonContainer.appendChild(fetchModelsButton);
    
    const fetchModelsStatus = document.createElement('div');
    fetchModelsStatus.className = 'settings-status';
    fetchModelsStatus.style.display = 'none';
    fetchButtonContainer.appendChild(fetchModelsStatus);
    
    // Add click handler for fetch models button
    fetchModelsButton.addEventListener('click', async () => {
      fetchModelsButton.disabled = true;
      fetchModelsStatus.textContent = i18nString(UIStrings.fetchingModels);
      fetchModelsStatus.style.display = 'block';
      fetchModelsStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      fetchModelsStatus.style.color = 'var(--color-accent-blue)';

      try {
        const endpoint = litellmEndpointInput.value;
        const liteLLMApiKey = litellmApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';

        const { models: litellmModels, hadWildcard } = await fetchLiteLLMModels(liteLLMApiKey, endpoint || undefined);
        updateModelOptions(litellmModels, hadWildcard);

        // Get counts from centralized getModelOptions
        const allLiteLLMModels = getModelOptions('litellm');
        const actualModelCount = litellmModels.length;
        const hasCustomModels = allLiteLLMModels.length > actualModelCount;
        
        // Refresh existing model selectors with new options if they exist
        if (SettingsDialog.#litellmMiniModelSelect) {
          refreshModelSelectOptions(SettingsDialog.#litellmMiniModelSelect, allLiteLLMModels, miniModel);
        }
        if (SettingsDialog.#litellmNanoModelSelect) {
          refreshModelSelectOptions(SettingsDialog.#litellmNanoModelSelect, allLiteLLMModels, nanoModel);
        }

        if (hadWildcard && actualModelCount === 0 && !hasCustomModels) {
          fetchModelsStatus.textContent = i18nString(UIStrings.wildcardModelsOnly);
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-orange)';
        } else if (hadWildcard && actualModelCount === 0) {
          // Only wildcard was returned but we have custom models
          fetchModelsStatus.textContent = i18nString(UIStrings.wildcardAndCustomModels);
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        } else if (hadWildcard) {
          // Wildcard plus other models
          fetchModelsStatus.textContent = i18nString(UIStrings.wildcardAndOtherModels, {PH1: actualModelCount});
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        } else {
          // No wildcard, just regular models
          fetchModelsStatus.textContent = i18nString(UIStrings.fetchedModels, {PH1: actualModelCount});
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        }
        
        // Update LiteLLM model selections
        updateLiteLLMModelSelectors();
        
      } catch (error) {
        logger.error('Failed to fetch models:', error);
        fetchModelsStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fetchModelsStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        fetchModelsStatus.style.color = 'var(--color-accent-red)';
      } finally {
        updateFetchButtonState();
        setTimeout(() => {
          fetchModelsStatus.style.display = 'none';
        }, 3000);
      }
    });
    
    // Custom model section with array support
    const customModelsSection = document.createElement('div');
    customModelsSection.className = 'custom-models-section';
    litellmContent.appendChild(customModelsSection);
    
    const customModelsLabel = document.createElement('div');
    customModelsLabel.className = 'settings-label';
    customModelsLabel.textContent = i18nString(UIStrings.customModelsLabel);
    customModelsSection.appendChild(customModelsLabel);
    
    const customModelsHint = document.createElement('div');
    customModelsHint.className = 'settings-hint';
    customModelsHint.textContent = i18nString(UIStrings.customModelsHint);
    customModelsSection.appendChild(customModelsHint);
    
    // Current custom models list
    const customModelsList = document.createElement('div');
    customModelsList.className = 'custom-models-list';
    customModelsSection.appendChild(customModelsList);

    // Helper function to refresh the model list in a select element
    function refreshModelSelectOptions(select: HTMLSelectElement, models: ModelOption[], currentValue: string) {
      // Remember the current value
      const previousValue = select.value;
      
      // Remove all options except the default (first) option
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add new options
      models.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
      });
      
      // Try to restore previous selection, or use the provided value if it exists in the new options
      if (previousValue && Array.from(select.options).some(opt => opt.value === previousValue)) {
        select.value = previousValue;
      } else if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
      }
    }
    
    // Function to update custom model selectors in LiteLLM section
    function updateLiteLLMModelSelectors() {
      logger.debug('Updating LiteLLM model selectors');
      
      // Get the latest model options filtered for LiteLLM provider
      const litellmModels = getModelOptions('litellm');
      logger.debug('LiteLLM models from getModelOptions:', litellmModels);

      // Get valid models using generic helper
      const validMiniModel = getValidModelForProvider(miniModel, litellmModels, 'litellm', 'mini');
      const validNanoModel = getValidModelForProvider(nanoModel, litellmModels, 'litellm', 'nano');

      // Clear any existing model selectors
      const existingSelectors = litellmContent.querySelectorAll('.model-selection-section');
      existingSelectors.forEach(selector => selector.remove());
      
      // Create a new model selection section
      const litellmModelSection = document.createElement('div');
      litellmModelSection.className = 'settings-section model-selection-section';
      litellmContent.appendChild(litellmModelSection);
      
      const litellmModelSectionTitle = document.createElement('h3');
      litellmModelSectionTitle.className = 'settings-subtitle';
      litellmModelSectionTitle.textContent = 'Model Size Selection';
      litellmModelSection.appendChild(litellmModelSectionTitle);
      
      logger.debug(`Current miniModel: ${miniModel}, nanoModel: ${nanoModel}`);
      
      // Create a focus handler for LiteLLM selectors
      const onLiteLLMSelectorFocus = async () => {
        // Only refresh if the provider is still litellm
        if (providerSelect.value === 'litellm') {
          const endpoint = litellmEndpointInput.value.trim();
          const liteLLMApiKey = litellmApiKeyInput.value.trim() || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
          
          if (endpoint) {
            try {
              logger.debug('Refreshing LiteLLM models on selector focus...');
              const { models: litellmModels, hadWildcard } = await fetchLiteLLMModels(liteLLMApiKey, endpoint);
              updateModelOptions(litellmModels, hadWildcard);
              // No need to update UI since refreshing would lose focus
              logger.debug('Successfully refreshed LiteLLM models on selector focus');
            } catch (error) {
              logger.error('Failed to refresh LiteLLM models on selector focus:', error);
            }
          }
        }
      };
      
      // Create LiteLLM Mini Model selection and store reference
      SettingsDialog.#litellmMiniModelSelect = createModelSelector(
        litellmModelSection,
        i18nString(UIStrings.miniModelLabel),
        i18nString(UIStrings.miniModelDescription),
        'litellm-mini-model-select',
        litellmModels,
        validMiniModel,
        i18nString(UIStrings.defaultMiniOption),
        onLiteLLMSelectorFocus
      );
      
      logger.debug('Created LiteLLM Mini Model Select:', SettingsDialog.#litellmMiniModelSelect);
      
      // Create LiteLLM Nano Model selection and store reference
      SettingsDialog.#litellmNanoModelSelect = createModelSelector(
        litellmModelSection,
        i18nString(UIStrings.nanoModelLabel),
        i18nString(UIStrings.nanoModelDescription),
        'litellm-nano-model-select',
        litellmModels,
        validNanoModel,
        i18nString(UIStrings.defaultNanoOption),
        onLiteLLMSelectorFocus
      );
      
      logger.debug('Created LiteLLM Nano Model Select:', SettingsDialog.#litellmNanoModelSelect);
    }

    const updateCustomModelsList = () => {
      // Clear existing list
      customModelsList.innerHTML = '';
      
      // Get custom models directly from local storage instead of using a heuristic filter
      const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
      const customModels = savedCustomModels;
      
      customModels.forEach((model: string) => {
        // Create model row
        const modelRow = document.createElement('div');
        modelRow.className = 'custom-model-row';
        customModelsList.appendChild(modelRow);
        
        // Model name
        const modelName = document.createElement('span');
        modelName.className = 'custom-model-name';
        modelName.textContent = model;
        modelRow.appendChild(modelName);
        // Status element for test results
        const testStatus = document.createElement('span');
        testStatus.className = 'test-status';
        testStatus.style.display = 'none';
        modelRow.appendChild(testStatus);
        
        // Test button as icon
        const testButton = document.createElement('button');
        testButton.className = 'icon-button test-button';
        testButton.setAttribute('type', 'button');
        testButton.setAttribute('aria-label', i18nString(UIStrings.testButton));
        testButton.setAttribute('title', 'Test connection to this model');
        
        // Create SVG check icon
        const checkIcon = document.createElement('span');
        checkIcon.className = 'check-icon';
        checkIcon.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L6.5 10.5L4 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        `;
        testButton.appendChild(checkIcon);
        modelRow.appendChild(testButton);
        

        
        // Remove button as a trash icon
        const removeButton = document.createElement('button');
        removeButton.className = 'icon-button remove-button';
        removeButton.setAttribute('type', 'button');
        removeButton.setAttribute('aria-label', i18nString(UIStrings.removeButton));
        removeButton.setAttribute('title', 'Remove this model');
        
        // Create SVG trash icon
        const trashIcon = document.createElement('span');
        trashIcon.className = 'trash-icon';
        trashIcon.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2.5V2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2V2.5M2 2.5H14M12.5 2.5V13C12.5 13.5523 12.0523 14 11.5 14H4.5C3.94772 14 3.5 13.5523 3.5 13V2.5M5.5 5.5V11M8 5.5V11M10.5 5.5V11" 
                  stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        removeButton.appendChild(trashIcon);
        modelRow.appendChild(removeButton);
        
        // Add click handlers
        testButton.addEventListener('click', async () => {
          testButton.disabled = true;
          testStatus.textContent = '...';
          testStatus.style.color = 'var(--color-accent-blue)';
          testStatus.style.display = 'inline';

          try {
            const endpoint = litellmEndpointInput.value;
            const liteLLMApiKey = litellmApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';

            if (!endpoint) {
              throw new Error(i18nString(UIStrings.endpointRequired));
            }

            const result = await LLMClient.testLiteLLMConnection(liteLLMApiKey, model, endpoint);

            if (result.success) {
              testStatus.textContent = '✓';
              testStatus.style.color = 'var(--color-accent-green)';
            } else {
              testStatus.textContent = '✗';
              testStatus.style.color = 'var(--color-accent-red)';
              testStatus.title = result.message; // Show error on hover
            }
          } catch (error) {
            testStatus.textContent = '✗';
            testStatus.style.color = 'var(--color-accent-red)';
            testStatus.title = error instanceof Error ? error.message : 'Unknown error';
          } finally {
            testButton.disabled = false;
            setTimeout(() => {
              testStatus.style.display = 'none';
            }, 5000);
          }
        });
        
        removeButton.addEventListener('click', () => {
          // Use the provided removeCustomModelOption function to remove the model
          removeCustomModelOption(model);
          
          // Update the UI list
          updateCustomModelsList();
          
          // Update model selectors
          updateLiteLLMModelSelectors();
        });
      });
    };

    updateCustomModelsList();

    // New model input with test and add
    const newModelRow = document.createElement('div');
    newModelRow.className = 'new-model-row';
    customModelsSection.appendChild(newModelRow);
    
    const customModelInput = document.createElement('input');
    customModelInput.className = 'settings-input custom-model-input';
    customModelInput.type = 'text';
    customModelInput.placeholder = 'Enter model name (e.g., gpt-4)';
    newModelRow.appendChild(customModelInput);
    
    const addModelButton = document.createElement('button');
    addModelButton.className = 'settings-button add-button';
    addModelButton.setAttribute('type', 'button');
    addModelButton.textContent = i18nString(UIStrings.addButton);
    newModelRow.appendChild(addModelButton);
    
    const modelTestStatus = document.createElement('div');
    modelTestStatus.className = 'settings-status model-test-status';
    modelTestStatus.style.display = 'none';
    customModelsSection.appendChild(modelTestStatus);

    // Track test passed state
    let testPassed = false;
    
    // Reset test passed state when input changes
    customModelInput.addEventListener('input', () => {
      testPassed = false;
      modelTestStatus.style.display = 'none';
    });
    
    // Shared test function
    async function testModelConnection(modelName: string): Promise<boolean> {
      if (!modelName) {
        modelTestStatus.textContent = 'Please enter a model name';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        modelTestStatus.style.color = 'var(--color-accent-red)';
        modelTestStatus.style.display = 'block';
        return false;
      }
      
      modelTestStatus.textContent = 'Testing model...';
      modelTestStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      modelTestStatus.style.color = 'var(--color-accent-blue)';
      modelTestStatus.style.display = 'block';
      
      try {
        const endpoint = litellmEndpointInput.value;
        const liteLLMApiKey = litellmApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
        
        if (!endpoint) {
          throw new Error(i18nString(UIStrings.endpointRequired));
        }
        
        const result = await LLMClient.testLiteLLMConnection(liteLLMApiKey, modelName, endpoint);
        
        if (result.success) {
          modelTestStatus.textContent = `Test passed: ${result.message}`;
          modelTestStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          modelTestStatus.style.color = 'var(--color-accent-green)';
          testPassed = true;
          return true;
        } else {
          modelTestStatus.textContent = `Test failed: ${result.message}`;
          modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
          modelTestStatus.style.color = 'var(--color-accent-red)';
          testPassed = false;
          return false;
        }
      } catch (error) {
        modelTestStatus.textContent = `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        modelTestStatus.style.color = 'var(--color-accent-red)';
        testPassed = false;
        return false;
      }
    }
    
    // Add button click handler
    addModelButton.addEventListener('click', async () => {
      const modelName = customModelInput.value.trim();
      
      // Check if model already exists by querying all litellm models
      const litellmModels = getModelOptions('litellm');
      const modelExists = litellmModels.some(m => m.value === modelName);
      
      if (modelExists) {
        modelTestStatus.textContent = 'Model already exists';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
        modelTestStatus.style.color = 'var(--color-accent-orange)';
        modelTestStatus.style.display = 'block';
        return;
      }
      
      // Always test the model before adding, regardless of previous test state
      addModelButton.disabled = true;
      const testSucceeded = await testModelConnection(modelName);
      
      if (testSucceeded) {
        // Use the provided addCustomModelOption function to add the model
        addCustomModelOption(modelName, 'litellm');
        
        // Update success message
        modelTestStatus.textContent = `Model "${modelName}" added successfully`;
        modelTestStatus.style.backgroundColor = 'var(--color-accent-green-background)';
        modelTestStatus.style.color = 'var(--color-accent-green)';
        
        // Reset UI
        updateCustomModelsList();
        customModelInput.value = '';
        testPassed = false;
        
        // Update model selectors
        updateLiteLLMModelSelectors();
        
        // Hide status after a delay
        setTimeout(() => {
          modelTestStatus.style.display = 'none';
        }, 3000);
      }
      
      addModelButton.disabled = false;
    });
    
    // Add Advanced Settings Toggle
    const ADVANCED_SETTINGS_ENABLED_KEY = 'ai_chat_advanced_settings_enabled';
    
    const advancedToggleSection = document.createElement('div');
    advancedToggleSection.className = 'advanced-settings-toggle-section';
    contentDiv.appendChild(advancedToggleSection);
    
    const advancedToggleContainer = document.createElement('div');
    advancedToggleContainer.className = 'advanced-settings-toggle-container';
    advancedToggleSection.appendChild(advancedToggleContainer);
    
    const advancedToggleCheckbox = document.createElement('input');
    advancedToggleCheckbox.type = 'checkbox';
    advancedToggleCheckbox.id = 'advanced-settings-toggle';
    advancedToggleCheckbox.className = 'advanced-settings-checkbox';
    advancedToggleCheckbox.checked = localStorage.getItem(ADVANCED_SETTINGS_ENABLED_KEY) === 'true';
    advancedToggleContainer.appendChild(advancedToggleCheckbox);
    
    const advancedToggleLabel = document.createElement('label');
    advancedToggleLabel.htmlFor = 'advanced-settings-toggle';
    advancedToggleLabel.className = 'advanced-settings-label';
    advancedToggleLabel.textContent = '⚙️ Advanced Settings';
    advancedToggleContainer.appendChild(advancedToggleLabel);
    
    const advancedToggleHint = document.createElement('div');
    advancedToggleHint.className = 'settings-hint';
    advancedToggleHint.textContent = 'Show advanced configuration options (Browsing History, Vector DB, Tracing, Evaluation)';
    advancedToggleSection.appendChild(advancedToggleHint);
    
    // Add browsing history section
    const historySection = document.createElement('div');
    historySection.className = 'settings-section history-section';
    contentDiv.appendChild(historySection);
    
    const historyTitle = document.createElement('h3');
    historyTitle.className = 'settings-subtitle';
    historyTitle.textContent = i18nString(UIStrings.browsingHistoryTitle);
    historySection.appendChild(historyTitle);
    
    const historyDescription = document.createElement('p');
    historyDescription.className = 'settings-description';
    historyDescription.textContent = i18nString(UIStrings.browsingHistoryDescription);
    historySection.appendChild(historyDescription);
    
    // Status message element (initially hidden)
    const statusMessage = document.createElement('div');
    statusMessage.className = 'settings-status history-status';
    statusMessage.style.display = 'none';
    statusMessage.textContent = i18nString(UIStrings.historyCleared);
    historySection.appendChild(statusMessage);
    
    // Clear history button
    const clearHistoryButton = document.createElement('button');
    clearHistoryButton.textContent = i18nString(UIStrings.clearHistoryButton);
    clearHistoryButton.className = 'settings-button clear-button';
    clearHistoryButton.setAttribute('type', 'button');
    historySection.appendChild(clearHistoryButton);
    
    clearHistoryButton.addEventListener('click', async () => {
      try {
        // Import the VisitHistoryManager from its dedicated file
        const { VisitHistoryManager } = await import('../tools/VisitHistoryManager.js');
        await VisitHistoryManager.getInstance().clearHistory();
        
        // Show success message
        statusMessage.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
          statusMessage.style.display = 'none';
        }, 3000);
      } catch (error) {
        logger.error('Error clearing browsing history:', error);
      }
    });
    
    // Initialize LiteLLM model selectors
    updateLiteLLMModelSelectors();
    
    // Setup Groq content
    const groqSettingsSection = document.createElement('div');
    groqSettingsSection.className = 'settings-section';
    groqContent.appendChild(groqSettingsSection);
    
    // Groq API Key
    const groqApiKeyLabel = document.createElement('div');
    groqApiKeyLabel.className = 'settings-label';
    groqApiKeyLabel.textContent = i18nString(UIStrings.groqApiKeyLabel);
    groqSettingsSection.appendChild(groqApiKeyLabel);
    
    const groqApiKeyHint = document.createElement('div');
    groqApiKeyHint.className = 'settings-hint';
    groqApiKeyHint.textContent = i18nString(UIStrings.groqApiKeyHint);
    groqSettingsSection.appendChild(groqApiKeyHint);
    
    const settingsSavedGroqApiKey = localStorage.getItem(GROQ_API_KEY_STORAGE_KEY) || '';
    const groqApiKeyInput = document.createElement('input');
    groqApiKeyInput.className = 'settings-input groq-api-key-input';
    groqApiKeyInput.type = 'password';
    groqApiKeyInput.placeholder = 'Enter your Groq API key';
    groqApiKeyInput.value = settingsSavedGroqApiKey;
    groqSettingsSection.appendChild(groqApiKeyInput);
    
    // Fetch Groq models button
    const groqFetchButtonContainer = document.createElement('div');
    groqFetchButtonContainer.className = 'fetch-button-container';
    groqSettingsSection.appendChild(groqFetchButtonContainer);
    
    const fetchGroqModelsButton = document.createElement('button');
    fetchGroqModelsButton.className = 'settings-button';
    fetchGroqModelsButton.setAttribute('type', 'button');
    fetchGroqModelsButton.textContent = i18nString(UIStrings.fetchGroqModelsButton);
    fetchGroqModelsButton.disabled = !groqApiKeyInput.value.trim();
    groqFetchButtonContainer.appendChild(fetchGroqModelsButton);
    
    const fetchGroqModelsStatus = document.createElement('div');
    fetchGroqModelsStatus.className = 'settings-status';
    fetchGroqModelsStatus.style.display = 'none';
    groqFetchButtonContainer.appendChild(fetchGroqModelsStatus);
    
    // Update button state when API key changes
    groqApiKeyInput.addEventListener('input', () => {
      fetchGroqModelsButton.disabled = !groqApiKeyInput.value.trim();
    });
    
    // Generic helper function to get valid model for provider
    function getValidModelForProvider(
      currentModel: string, 
      providerModels: ModelOption[], 
      provider: 'openai' | 'litellm' | 'groq' | 'openrouter',
      modelType: 'mini' | 'nano'
    ): string {
      // Check if current model is valid for this provider
      if (providerModels.some(model => model.value === currentModel)) {
        return currentModel;
      }
      
      // Get defaults from AIChatPanel's DEFAULT_PROVIDER_MODELS
      const defaults = DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.openai;
      const defaultModel = modelType === 'mini' ? defaults.mini : defaults.nano;
      
      // Return default if it exists in provider models, otherwise return current model
      return defaultModel && providerModels.some(model => model.value === defaultModel) 
        ? defaultModel 
        : currentModel;
    }
    
    // Function to update Groq model selectors
    function updateGroqModelSelectors() {
      logger.debug('Updating Groq model selectors');
      
      // Get the latest model options filtered for Groq provider
      const groqModels = getModelOptions('groq');
      logger.debug('Groq models from getModelOptions:', groqModels);

      // Get valid models using generic helper
      const validMiniModel = getValidModelForProvider(miniModel, groqModels, 'groq', 'mini');
      const validNanoModel = getValidModelForProvider(nanoModel, groqModels, 'groq', 'nano');
      
      logger.debug('Groq model selection:', { originalMini: miniModel, validMini: validMiniModel, originalNano: nanoModel, validNano: validNanoModel });

      // Clear any existing model selectors
      const existingSelectors = groqContent.querySelectorAll('.model-selection-section');
      existingSelectors.forEach(selector => selector.remove());
      
      // Create a new model selection section
      const groqModelSection = document.createElement('div');
      groqModelSection.className = 'settings-section model-selection-section';
      groqContent.appendChild(groqModelSection);
      
      const groqModelSectionTitle = document.createElement('h3');
      groqModelSectionTitle.className = 'settings-subtitle';
      groqModelSectionTitle.textContent = 'Model Size Selection';
      groqModelSection.appendChild(groqModelSectionTitle);
      
      logger.debug(`Current miniModel: ${miniModel}, nanoModel: ${nanoModel}`);
      
      // Create Groq Mini Model selection and store reference
      SettingsDialog.#groqMiniModelSelect = createModelSelector(
        groqModelSection,
        i18nString(UIStrings.miniModelLabel),
        i18nString(UIStrings.miniModelDescription),
        'groq-mini-model-select',
        groqModels,
        validMiniModel,
        i18nString(UIStrings.defaultMiniOption),
        undefined // No focus handler needed for Groq
      );
      
      logger.debug('Created Groq Mini Model Select:', SettingsDialog.#groqMiniModelSelect);
      
      // Create Groq Nano Model selection and store reference
      SettingsDialog.#groqNanoModelSelect = createModelSelector(
        groqModelSection,
        i18nString(UIStrings.nanoModelLabel),
        i18nString(UIStrings.nanoModelDescription),
        'groq-nano-model-select',
        groqModels,
        validNanoModel,
        i18nString(UIStrings.defaultNanoOption),
        undefined // No focus handler needed for Groq
      );
      
      logger.debug('Created Groq Nano Model Select:', SettingsDialog.#groqNanoModelSelect);
    }
    
    // Add click handler for fetch Groq models button
    fetchGroqModelsButton.addEventListener('click', async () => {
      fetchGroqModelsButton.disabled = true;
      fetchGroqModelsStatus.textContent = i18nString(UIStrings.fetchingModels);
      fetchGroqModelsStatus.style.display = 'block';
      fetchGroqModelsStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      fetchGroqModelsStatus.style.color = 'var(--color-accent-blue)';

      try {
        const groqApiKey = groqApiKeyInput.value.trim();
        
        // Fetch Groq models using LLMClient static method
        const groqModels = await LLMClient.fetchGroqModels(groqApiKey);
        
        // Convert Groq models to ModelOption format
        const modelOptions: ModelOption[] = groqModels.map(model => ({
          value: model.id,
          label: model.id,
          type: 'groq' as const
        }));
        
        // Update model options with fetched Groq models
        updateModelOptions(modelOptions, false);
        
        // Get all Groq models including any custom ones
        const allGroqModels = getModelOptions('groq');
        const actualModelCount = groqModels.length;
        
        // Refresh existing model selectors with new options if they exist
        if (SettingsDialog.#groqMiniModelSelect) {
          refreshModelSelectOptions(SettingsDialog.#groqMiniModelSelect, allGroqModels, miniModel);
        }
        if (SettingsDialog.#groqNanoModelSelect) {
          refreshModelSelectOptions(SettingsDialog.#groqNanoModelSelect, allGroqModels, nanoModel);
        }

        fetchGroqModelsStatus.textContent = i18nString(UIStrings.fetchedModels, {PH1: actualModelCount});
        fetchGroqModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
        fetchGroqModelsStatus.style.color = 'var(--color-accent-green)';
        
        // Update Groq model selections
        updateGroqModelSelectors();
        
      } catch (error) {
        logger.error('Failed to fetch Groq models:', error);
        fetchGroqModelsStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fetchGroqModelsStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        fetchGroqModelsStatus.style.color = 'var(--color-accent-red)';
      } finally {
        fetchGroqModelsButton.disabled = !groqApiKeyInput.value.trim();
        setTimeout(() => {
          fetchGroqModelsStatus.style.display = 'none';
        }, 3000);
      }
    });
    
    // Initialize Groq model selectors
    updateGroqModelSelectors();
    
    // Setup OpenRouter content
    const openrouterSettingsSection = document.createElement('div');
    openrouterSettingsSection.className = 'settings-section';
    openrouterContent.appendChild(openrouterSettingsSection);
    
    // OpenRouter API Key
    const openrouterApiKeyLabel = document.createElement('div');
    openrouterApiKeyLabel.className = 'settings-label';
    openrouterApiKeyLabel.textContent = i18nString(UIStrings.openrouterApiKeyLabel);
    openrouterSettingsSection.appendChild(openrouterApiKeyLabel);
    
    const openrouterApiKeyHint = document.createElement('div');
    openrouterApiKeyHint.className = 'settings-hint';
    openrouterApiKeyHint.textContent = i18nString(UIStrings.openrouterApiKeyHint);
    openrouterSettingsSection.appendChild(openrouterApiKeyHint);
    
    const settingsSavedOpenRouterApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) || '';
    const openrouterApiKeyInput = document.createElement('input');
    openrouterApiKeyInput.className = 'settings-input openrouter-api-key-input';
    openrouterApiKeyInput.type = 'password';
    openrouterApiKeyInput.placeholder = 'Enter your OpenRouter API key';
    openrouterApiKeyInput.value = settingsSavedOpenRouterApiKey;
    openrouterSettingsSection.appendChild(openrouterApiKeyInput);
    
    // OAuth section - alternative to API key
    const oauthDivider = document.createElement('div');
    oauthDivider.className = 'settings-divider';
    oauthDivider.textContent = 'OR';
    openrouterSettingsSection.appendChild(oauthDivider);
    
    const oauthButtonContainer = document.createElement('div');
    oauthButtonContainer.className = 'oauth-button-container';
    openrouterSettingsSection.appendChild(oauthButtonContainer);
    
    const oauthButton = document.createElement('button');
    oauthButton.className = 'settings-button oauth-button';
    oauthButton.setAttribute('type', 'button');
    oauthButton.textContent = 'Connect with OpenRouter';
    oauthButtonContainer.appendChild(oauthButton);
    
    const oauthStatus = document.createElement('div');
    oauthStatus.className = 'oauth-status';
    oauthStatus.style.display = 'none';
    oauthButtonContainer.appendChild(oauthStatus);
    
    // Add OAuth-specific styles
    const oauthStyles = document.createElement('style');
    oauthStyles.textContent = `
      .settings-divider {
        text-align: center;
        margin: 15px 0;
        color: var(--color-text-secondary);
        font-size: 12px;
        font-weight: bold;
      }
      .oauth-button-container {
        margin-bottom: 10px;
      }
      .oauth-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        width: 100%;
        margin-bottom: 8px;
      }
      .oauth-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      .oauth-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .oauth-button.disconnect {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      .oauth-status {
        font-size: 12px;
        margin-top: 5px;
        padding: 5px 8px;
        border-radius: 4px;
        background: var(--color-background-highlight);
      }
    `;
    document.head.appendChild(oauthStyles);
    
    // Import OAuth service dynamically when needed
    let OpenRouterOAuth: any = null;
    const getOpenRouterOAuth = async () => {
      if (!OpenRouterOAuth) {
        const module = await import('../auth/OpenRouterOAuth.js');
        OpenRouterOAuth = module.OpenRouterOAuth;
      }
      return OpenRouterOAuth;
    };
    
    // Update OAuth button state
    const updateOAuthButton = async () => {
      const OAuth = await getOpenRouterOAuth();
      if (await OAuth.isOAuthAuthenticated()) {
        oauthButton.textContent = 'Disconnect OpenRouter';
        oauthButton.classList.add('disconnect');
        oauthStatus.textContent = '✓ Connected via OpenRouter account';
        oauthStatus.style.color = 'var(--color-accent-green)';
        oauthStatus.style.display = 'block';
      } else {
        oauthButton.textContent = 'Connect with OpenRouter';
        oauthButton.classList.remove('disconnect');
        oauthStatus.style.display = 'none';
      }
    };
    
    oauthButtonContainer.appendChild(oauthButton);
    updateOAuthButton();
    
    // OAuth button click handler
    oauthButton.addEventListener('click', async () => {
      const OAuth = await getOpenRouterOAuth();
      oauthButton.disabled = true;
      
      try {
        if (await OAuth.isOAuthAuthenticated()) {
          // Disconnect
          if (confirm('Are you sure you want to disconnect your OpenRouter account?')) {
            await OAuth.revokeToken();
            updateOAuthButton();
          }
        } else {
          // Connect - provide clear feedback for tab-based flow
          oauthButton.textContent = 'Redirecting to OpenRouter...';
          oauthStatus.textContent = 'You will be redirected to OpenRouter to authorize access. The page will return here automatically after authorization.';
          oauthStatus.style.color = 'var(--color-text-secondary)';
          oauthStatus.style.display = 'block';
          
          await OAuth.startAuthFlow();
          updateOAuthButton();
        }
      } catch (error) {
        console.error('OAuth flow error:', error);
        oauthStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        oauthStatus.style.color = 'var(--color-accent-red)';
        oauthStatus.style.display = 'block';
      } finally {
        oauthButton.disabled = false;
        if (!await OAuth.isOAuthAuthenticated()) {
          oauthButton.textContent = 'Connect with OpenRouter';
          oauthStatus.style.display = 'none';
        }
      }
    });
    
    // Handle OAuth events
    const handleOAuthSuccess = () => {
      updateOAuthButton();
      oauthStatus.textContent = '✓ Successfully connected to OpenRouter';
      oauthStatus.style.color = 'var(--color-accent-green)';
      oauthStatus.style.display = 'block';
      
      // Trigger chat panel refresh to recognize new credentials
      const chatPanel = document.querySelector('ai-chat-panel') as any;
      if (chatPanel && typeof chatPanel.refreshCredentials === 'function') {
        chatPanel.refreshCredentials();
      }
      
      // Auto-save settings and close dialog after successful OAuth
      onSettingsSaved(); // Notify parent that settings changed
      setTimeout(() => {
        dialog.hide(); // Close dialog after showing success message
      }, 2000); // 2 seconds to show success message
    };
    
    const handleOAuthError = (event: Event) => {
      const customEvent = event as CustomEvent;
      oauthStatus.textContent = `Error: ${customEvent.detail.error}`;
      oauthStatus.style.color = 'var(--color-accent-red)';
      oauthStatus.style.display = 'block';
    };
    
    const handleOAuthLogout = () => {
      // Clear the API key input field
      openrouterApiKeyInput.value = '';
      
      // Update OAuth button state
      updateOAuthButton();
      
      // Show logout confirmation
      oauthStatus.textContent = '✓ Disconnected from OpenRouter';
      oauthStatus.style.color = 'var(--color-text-secondary)';
      oauthStatus.style.display = 'block';
      
      // Refresh chat panel to recognize credential removal
      const chatPanel = document.querySelector('ai-chat-panel') as any;
      if (chatPanel && typeof chatPanel.refreshCredentials === 'function') {
        chatPanel.refreshCredentials();
      }
      
      // Auto-close dialog after showing disconnect message
      setTimeout(() => {
        dialog.hide();
      }, 2000); // 2 seconds to show disconnect message
    };
    
    window.addEventListener('openrouter-oauth-success', handleOAuthSuccess);
    window.addEventListener('openrouter-oauth-error', handleOAuthError);
    window.addEventListener('openrouter-oauth-logout', handleOAuthLogout);
    
    // Update API key input behavior for OAuth compatibility
    openrouterApiKeyInput.addEventListener('input', async () => {
      if (openrouterApiKeyInput.value.trim()) {
        // Switch to manual API key method
        localStorage.setItem('openrouter_auth_method', 'api_key');
        const OAuth = await getOpenRouterOAuth();
        if (await OAuth.isOAuthAuthenticated()) {
          OAuth.switchToManualApiKey();
        }
      }
    });
    
    // Fetch OpenRouter models button
    const openrouterFetchButtonContainer = document.createElement('div');
    openrouterFetchButtonContainer.className = 'fetch-button-container';
    openrouterSettingsSection.appendChild(openrouterFetchButtonContainer);
    
    const fetchOpenRouterModelsButton = document.createElement('button');
    fetchOpenRouterModelsButton.className = 'settings-button';
    fetchOpenRouterModelsButton.setAttribute('type', 'button');
    fetchOpenRouterModelsButton.textContent = i18nString(UIStrings.fetchOpenRouterModelsButton);
    fetchOpenRouterModelsButton.disabled = !openrouterApiKeyInput.value.trim();
    openrouterFetchButtonContainer.appendChild(fetchOpenRouterModelsButton);
    
    const fetchOpenRouterModelsStatus = document.createElement('div');
    fetchOpenRouterModelsStatus.className = 'settings-status';
    fetchOpenRouterModelsStatus.style.display = 'none';
    openrouterFetchButtonContainer.appendChild(fetchOpenRouterModelsStatus);
    
    // Update button state when API key changes
    openrouterApiKeyInput.addEventListener('input', () => {
      fetchOpenRouterModelsButton.disabled = !openrouterApiKeyInput.value.trim();
    });
    
    // Function to update OpenRouter model selectors
    function updateOpenRouterModelSelectors() {
      logger.debug('Updating OpenRouter model selectors');
      
      // Get the latest model options filtered for OpenRouter provider
      const openrouterModels = getModelOptions('openrouter');
      logger.debug('OpenRouter models from getModelOptions:', openrouterModels);

      // Get valid models using generic helper
      const validMiniModel = getValidModelForProvider(miniModel, openrouterModels, 'openrouter', 'mini');
      const validNanoModel = getValidModelForProvider(nanoModel, openrouterModels, 'openrouter', 'nano');
      
      logger.debug('OpenRouter model selection:', { originalMini: miniModel, validMini: validMiniModel, originalNano: nanoModel, validNano: validNanoModel });

      // Clear any existing model selectors
      const existingSelectors = openrouterContent.querySelectorAll('.model-selection-section');
      existingSelectors.forEach(selector => selector.remove());
      
      // Create a new model selection section
      const openrouterModelSection = document.createElement('div');
      openrouterModelSection.className = 'model-selection-section';
      openrouterContent.appendChild(openrouterModelSection);
      
      // Create Mini Model selection for OpenRouter and store reference
      SettingsDialog.#openrouterMiniModelSelect = createModelSelector(
        openrouterModelSection,
        i18nString(UIStrings.miniModelLabel),
        i18nString(UIStrings.miniModelDescription),
        'openrouter-mini-model-select',
        openrouterModels,
        validMiniModel,
        i18nString(UIStrings.defaultMiniOption),
        undefined // No focus handler needed for OpenRouter
      );
      
      // Create Nano Model selection for OpenRouter and store reference
      SettingsDialog.#openrouterNanoModelSelect = createModelSelector(
        openrouterModelSection,
        i18nString(UIStrings.nanoModelLabel),
        i18nString(UIStrings.nanoModelDescription),
        'openrouter-nano-model-select',
        openrouterModels,
        validNanoModel,
        i18nString(UIStrings.defaultNanoOption),
        undefined // No focus handler needed for OpenRouter
      );
    }
    
    // Add click handler for fetch OpenRouter models button
    fetchOpenRouterModelsButton.addEventListener('click', async () => {
      fetchOpenRouterModelsButton.disabled = true;
      fetchOpenRouterModelsStatus.textContent = i18nString(UIStrings.fetchingModels);
      fetchOpenRouterModelsStatus.style.display = 'block';
      fetchOpenRouterModelsStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      fetchOpenRouterModelsStatus.style.color = 'var(--color-accent-blue)';

      try {
        const openrouterApiKey = openrouterApiKeyInput.value.trim();
        
        // Fetch OpenRouter models using LLMClient static method
        const openrouterModels = await LLMClient.fetchOpenRouterModels(openrouterApiKey);
        
        // Convert OpenRouter models to ModelOption format
        const modelOptions: ModelOption[] = openrouterModels.map(model => ({
          value: model.id,
          label: model.name || model.id,
          type: 'openrouter' as const
        }));
        
        // Update model options with fetched OpenRouter models
        updateModelOptions(modelOptions, false);
        
        const actualModelCount = openrouterModels.length;
        
        // Update the model selectors with the new models
        updateOpenRouterModelSelectors();
        
        // Update status to show success
        fetchOpenRouterModelsStatus.textContent = i18nString(UIStrings.fetchedModels, {PH1: actualModelCount});
        fetchOpenRouterModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
        fetchOpenRouterModelsStatus.style.color = 'var(--color-accent-green)';
        
        logger.debug(`Successfully fetched ${actualModelCount} OpenRouter models`);
      } catch (error) {
        logger.error('Error fetching OpenRouter models:', error);
        fetchOpenRouterModelsStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fetchOpenRouterModelsStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        fetchOpenRouterModelsStatus.style.color = 'var(--color-accent-red)';
      } finally {
        fetchOpenRouterModelsButton.disabled = false;
        
        // Hide status message after 3 seconds
        setTimeout(() => {
          fetchOpenRouterModelsStatus.style.display = 'none';
        }, 3000);
      }
    });
    
    // Initialize OpenRouter model selectors
    updateOpenRouterModelSelectors();
    
    // Add Vector DB configuration section
    const vectorDBSection = document.createElement('div');
    vectorDBSection.className = 'settings-section vector-db-section';
    contentDiv.appendChild(vectorDBSection);
    
    const vectorDBTitle = document.createElement('h3');
    vectorDBTitle.textContent = i18nString(UIStrings.vectorDBLabel);
    vectorDBTitle.classList.add('settings-subtitle');
    vectorDBSection.appendChild(vectorDBTitle);
    
    // Vector DB enabled checkbox
    const vectorDBEnabledContainer = document.createElement('div');
    vectorDBEnabledContainer.className = 'tracing-enabled-container';
    vectorDBSection.appendChild(vectorDBEnabledContainer);

    const vectorDBEnabledCheckbox = document.createElement('input');
    vectorDBEnabledCheckbox.type = 'checkbox';
    vectorDBEnabledCheckbox.id = 'vector-db-enabled';
    vectorDBEnabledCheckbox.className = 'tracing-checkbox';
    vectorDBEnabledCheckbox.checked = localStorage.getItem(VECTOR_DB_ENABLED_KEY) === 'true';
    vectorDBEnabledContainer.appendChild(vectorDBEnabledCheckbox);

    const vectorDBEnabledLabel = document.createElement('label');
    vectorDBEnabledLabel.htmlFor = 'vector-db-enabled';
    vectorDBEnabledLabel.className = 'tracing-label';
    vectorDBEnabledLabel.textContent = i18nString(UIStrings.vectorDBEnabled);
    vectorDBEnabledContainer.appendChild(vectorDBEnabledLabel);

    const vectorDBEnabledHint = document.createElement('div');
    vectorDBEnabledHint.className = 'settings-hint';
    vectorDBEnabledHint.textContent = i18nString(UIStrings.vectorDBEnabledHint);
    vectorDBSection.appendChild(vectorDBEnabledHint);

    // Vector DB configuration container (shown when enabled)
    const vectorDBConfigContainer = document.createElement('div');
    vectorDBConfigContainer.className = 'tracing-config-container';
    vectorDBConfigContainer.style.display = vectorDBEnabledCheckbox.checked ? 'block' : 'none';
    vectorDBSection.appendChild(vectorDBConfigContainer);
    
    // Vector DB Endpoint
    const vectorDBEndpointDiv = document.createElement('div');
    vectorDBEndpointDiv.classList.add('settings-field');
    vectorDBConfigContainer.appendChild(vectorDBEndpointDiv);
    
    const vectorDBEndpointLabel = document.createElement('label');
    vectorDBEndpointLabel.textContent = i18nString(UIStrings.vectorDBEndpoint);
    vectorDBEndpointLabel.classList.add('settings-label');
    vectorDBEndpointDiv.appendChild(vectorDBEndpointLabel);
    
    const vectorDBEndpointHint = document.createElement('div');
    vectorDBEndpointHint.textContent = i18nString(UIStrings.vectorDBEndpointHint);
    vectorDBEndpointHint.classList.add('settings-hint');
    vectorDBEndpointDiv.appendChild(vectorDBEndpointHint);
    
    const vectorDBEndpointInput = document.createElement('input');
    vectorDBEndpointInput.classList.add('settings-input');
    vectorDBEndpointInput.type = 'text';
    vectorDBEndpointInput.placeholder = 'http://localhost:19530';
    vectorDBEndpointInput.value = localStorage.getItem(MILVUS_ENDPOINT_KEY) || '';
    vectorDBEndpointDiv.appendChild(vectorDBEndpointInput);
    
    // Vector DB API Key
    const vectorDBApiKeyDiv = document.createElement('div');
    vectorDBApiKeyDiv.classList.add('settings-field');
    vectorDBConfigContainer.appendChild(vectorDBApiKeyDiv);
    
    const vectorDBApiKeyLabel = document.createElement('label');
    vectorDBApiKeyLabel.textContent = i18nString(UIStrings.vectorDBApiKey);
    vectorDBApiKeyLabel.classList.add('settings-label');
    vectorDBApiKeyDiv.appendChild(vectorDBApiKeyLabel);
    
    const vectorDBApiKeyHint = document.createElement('div');
    vectorDBApiKeyHint.textContent = i18nString(UIStrings.vectorDBApiKeyHint);
    vectorDBApiKeyHint.classList.add('settings-hint');
    vectorDBApiKeyDiv.appendChild(vectorDBApiKeyHint);
    
    const vectorDBApiKeyInput = document.createElement('input');
    vectorDBApiKeyInput.classList.add('settings-input');
    vectorDBApiKeyInput.type = 'text';
    vectorDBApiKeyInput.placeholder = 'root';
    vectorDBApiKeyInput.value = localStorage.getItem(MILVUS_USERNAME_KEY) || 'root';
    vectorDBApiKeyDiv.appendChild(vectorDBApiKeyInput);
    
    // Milvus Password
    const milvusPasswordDiv = document.createElement('div');
    milvusPasswordDiv.classList.add('settings-field');
    vectorDBConfigContainer.appendChild(milvusPasswordDiv);
    
    const milvusPasswordLabel = document.createElement('label');
    milvusPasswordLabel.textContent = i18nString(UIStrings.milvusPassword);
    milvusPasswordLabel.classList.add('settings-label');
    milvusPasswordDiv.appendChild(milvusPasswordLabel);
    
    const milvusPasswordHint = document.createElement('div');
    milvusPasswordHint.textContent = i18nString(UIStrings.milvusPasswordHint);
    milvusPasswordHint.classList.add('settings-hint');
    milvusPasswordDiv.appendChild(milvusPasswordHint);
    
    const milvusPasswordInput = document.createElement('input');
    milvusPasswordInput.classList.add('settings-input');
    milvusPasswordInput.type = 'password';
    milvusPasswordInput.placeholder = 'Milvus (self-hosted) or API token (cloud)';
    milvusPasswordInput.value = localStorage.getItem(MILVUS_PASSWORD_KEY) || 'Milvus';
    milvusPasswordDiv.appendChild(milvusPasswordInput);
    
    // OpenAI API Key for embeddings
    const milvusOpenAIDiv = document.createElement('div');
    milvusOpenAIDiv.classList.add('settings-field');
    vectorDBConfigContainer.appendChild(milvusOpenAIDiv);
    
    const milvusOpenAILabel = document.createElement('label');
    milvusOpenAILabel.textContent = i18nString(UIStrings.milvusOpenAIKey);
    milvusOpenAILabel.classList.add('settings-label');
    milvusOpenAIDiv.appendChild(milvusOpenAILabel);
    
    const milvusOpenAIHint = document.createElement('div');
    milvusOpenAIHint.textContent = i18nString(UIStrings.milvusOpenAIKeyHint);
    milvusOpenAIHint.classList.add('settings-hint');
    milvusOpenAIDiv.appendChild(milvusOpenAIHint);
    
    const milvusOpenAIInput = document.createElement('input');
    milvusOpenAIInput.classList.add('settings-input');
    milvusOpenAIInput.type = 'password';
    milvusOpenAIInput.placeholder = 'sk-...';
    milvusOpenAIInput.value = localStorage.getItem(MILVUS_OPENAI_KEY) || '';
    milvusOpenAIDiv.appendChild(milvusOpenAIInput);
    
    // Vector DB Collection Name
    const vectorDBCollectionDiv = document.createElement('div');
    vectorDBCollectionDiv.classList.add('settings-field');
    vectorDBConfigContainer.appendChild(vectorDBCollectionDiv);
    
    const vectorDBCollectionLabel = document.createElement('label');
    vectorDBCollectionLabel.textContent = i18nString(UIStrings.vectorDBCollection);
    vectorDBCollectionLabel.classList.add('settings-label');
    vectorDBCollectionDiv.appendChild(vectorDBCollectionLabel);
    
    const vectorDBCollectionHint = document.createElement('div');
    vectorDBCollectionHint.textContent = i18nString(UIStrings.vectorDBCollectionHint);
    vectorDBCollectionHint.classList.add('settings-hint');
    vectorDBCollectionDiv.appendChild(vectorDBCollectionHint);
    
    const vectorDBCollectionInput = document.createElement('input');
    vectorDBCollectionInput.classList.add('settings-input');
    vectorDBCollectionInput.type = 'text';
    vectorDBCollectionInput.placeholder = 'bookmarks';
    vectorDBCollectionInput.value = localStorage.getItem(MILVUS_COLLECTION_KEY) || 'bookmarks';
    vectorDBCollectionDiv.appendChild(vectorDBCollectionInput);
    
    // Test Vector DB Connection Button
    const vectorDBTestDiv = document.createElement('div');
    vectorDBTestDiv.classList.add('settings-field', 'test-connection-field');
    vectorDBConfigContainer.appendChild(vectorDBTestDiv);
    
    const vectorDBTestButton = document.createElement('button');
    vectorDBTestButton.classList.add('settings-button', 'test-button');
    vectorDBTestButton.setAttribute('type', 'button');
    vectorDBTestButton.textContent = i18nString(UIStrings.testVectorDBConnection);
    vectorDBTestDiv.appendChild(vectorDBTestButton);
    
    const vectorDBTestStatus = document.createElement('div');
    vectorDBTestStatus.classList.add('settings-status');
    vectorDBTestStatus.style.display = 'none';
    vectorDBTestDiv.appendChild(vectorDBTestStatus);
    
    // Toggle vector DB config visibility
    vectorDBEnabledCheckbox.addEventListener('change', () => {
      vectorDBConfigContainer.style.display = vectorDBEnabledCheckbox.checked ? 'block' : 'none';
      localStorage.setItem(VECTOR_DB_ENABLED_KEY, vectorDBEnabledCheckbox.checked.toString());
    });
    
    // Save Vector DB settings on input change
    const saveVectorDBSettings = () => {
      localStorage.setItem(VECTOR_DB_ENABLED_KEY, vectorDBEnabledCheckbox.checked.toString());
      localStorage.setItem(MILVUS_ENDPOINT_KEY, vectorDBEndpointInput.value);
      localStorage.setItem(MILVUS_USERNAME_KEY, vectorDBApiKeyInput.value);
      localStorage.setItem(MILVUS_PASSWORD_KEY, milvusPasswordInput.value);
      localStorage.setItem(MILVUS_COLLECTION_KEY, vectorDBCollectionInput.value);
      localStorage.setItem(MILVUS_OPENAI_KEY, milvusOpenAIInput.value);
    };
    
    vectorDBEndpointInput.addEventListener('input', saveVectorDBSettings);
    vectorDBApiKeyInput.addEventListener('input', saveVectorDBSettings);
    milvusPasswordInput.addEventListener('input', saveVectorDBSettings);
    vectorDBCollectionInput.addEventListener('input', saveVectorDBSettings);
    milvusOpenAIInput.addEventListener('input', saveVectorDBSettings);
    
    // Test Vector DB connection
    vectorDBTestButton.addEventListener('click', async () => {
      const endpoint = vectorDBEndpointInput.value.trim();
      
      if (!endpoint) {
        vectorDBTestStatus.textContent = 'Please enter an endpoint URL';
        vectorDBTestStatus.style.color = 'var(--color-accent-red)';
        vectorDBTestStatus.style.display = 'block';
        setTimeout(() => {
          vectorDBTestStatus.style.display = 'none';
        }, 3000);
        return;
      }
      
      vectorDBTestButton.disabled = true;
      vectorDBTestStatus.textContent = i18nString(UIStrings.testingVectorDBConnection);
      vectorDBTestStatus.style.color = 'var(--color-text-secondary)';
      vectorDBTestStatus.style.display = 'block';
      
      try {
        // Import and test the Vector DB client
        const { VectorDBClient } = await import('../tools/VectorDBClient.js');
        const vectorClient = new VectorDBClient({
          endpoint,
          username: vectorDBApiKeyInput.value || 'root',
          password: milvusPasswordInput.value || 'Milvus',
          collection: vectorDBCollectionInput.value || 'bookmarks',
          openaiApiKey: milvusOpenAIInput.value || undefined
        });
        
        const testResult = await vectorClient.testConnection();
        
        if (testResult.success) {
          vectorDBTestStatus.textContent = i18nString(UIStrings.vectorDBConnectionSuccess);
          vectorDBTestStatus.style.color = 'var(--color-accent-green)';
        } else {
          vectorDBTestStatus.textContent = `${i18nString(UIStrings.vectorDBConnectionFailed)}: ${testResult.error}`;
          vectorDBTestStatus.style.color = 'var(--color-accent-red)';
        }
      } catch (error: any) {
        vectorDBTestStatus.textContent = `${i18nString(UIStrings.vectorDBConnectionFailed)}: ${error.message}`;
        vectorDBTestStatus.style.color = 'var(--color-accent-red)';
      } finally {
        vectorDBTestButton.disabled = false;
        setTimeout(() => {
          vectorDBTestStatus.style.display = 'none';
        }, 5000);
      }
    });
    
    // Add tracing configuration section
    const tracingSection = document.createElement('div');
    tracingSection.className = 'settings-section tracing-section';
    contentDiv.appendChild(tracingSection);

    const tracingSectionTitle = document.createElement('h3');
    tracingSectionTitle.className = 'settings-subtitle';
    tracingSectionTitle.textContent = i18nString(UIStrings.tracingSection);
    tracingSection.appendChild(tracingSectionTitle);

    // Get current tracing configuration
    const currentTracingConfig = getTracingConfig();

    // Tracing enabled checkbox
    const tracingEnabledContainer = document.createElement('div');
    tracingEnabledContainer.className = 'tracing-enabled-container';
    tracingSection.appendChild(tracingEnabledContainer);

    const tracingEnabledCheckbox = document.createElement('input');
    tracingEnabledCheckbox.type = 'checkbox';
    tracingEnabledCheckbox.id = 'tracing-enabled';
    tracingEnabledCheckbox.className = 'tracing-checkbox';
    tracingEnabledCheckbox.checked = isTracingEnabled();
    tracingEnabledContainer.appendChild(tracingEnabledCheckbox);

    const tracingEnabledLabel = document.createElement('label');
    tracingEnabledLabel.htmlFor = 'tracing-enabled';
    tracingEnabledLabel.className = 'tracing-label';
    tracingEnabledLabel.textContent = i18nString(UIStrings.tracingEnabled);
    tracingEnabledContainer.appendChild(tracingEnabledLabel);

    const tracingEnabledHint = document.createElement('div');
    tracingEnabledHint.className = 'settings-hint';
    tracingEnabledHint.textContent = i18nString(UIStrings.tracingEnabledHint);
    tracingSection.appendChild(tracingEnabledHint);

    // Tracing configuration container (shown when enabled)
    const tracingConfigContainer = document.createElement('div');
    tracingConfigContainer.className = 'tracing-config-container';
    tracingConfigContainer.style.display = tracingEnabledCheckbox.checked ? 'block' : 'none';
    tracingSection.appendChild(tracingConfigContainer);

    // Langfuse endpoint
    const endpointLabel = document.createElement('div');
    endpointLabel.className = 'settings-label';
    endpointLabel.textContent = i18nString(UIStrings.langfuseEndpoint);
    tracingConfigContainer.appendChild(endpointLabel);

    const endpointHint = document.createElement('div');
    endpointHint.className = 'settings-hint';
    endpointHint.textContent = i18nString(UIStrings.langfuseEndpointHint);
    tracingConfigContainer.appendChild(endpointHint);

    const endpointInput = document.createElement('input');
    endpointInput.className = 'settings-input';
    endpointInput.type = 'text';
    endpointInput.placeholder = 'http://localhost:3000';
    endpointInput.value = currentTracingConfig.endpoint || 'http://localhost:3000';
    tracingConfigContainer.appendChild(endpointInput);

    // Langfuse public key
    const publicKeyLabel = document.createElement('div');
    publicKeyLabel.className = 'settings-label';
    publicKeyLabel.textContent = i18nString(UIStrings.langfusePublicKey);
    tracingConfigContainer.appendChild(publicKeyLabel);

    const publicKeyHint = document.createElement('div');
    publicKeyHint.className = 'settings-hint';
    publicKeyHint.textContent = i18nString(UIStrings.langfusePublicKeyHint);
    tracingConfigContainer.appendChild(publicKeyHint);

    const publicKeyInput = document.createElement('input');
    publicKeyInput.className = 'settings-input';
    publicKeyInput.type = 'text';
    publicKeyInput.placeholder = 'pk-lf-...';
    publicKeyInput.value = currentTracingConfig.publicKey || '';
    tracingConfigContainer.appendChild(publicKeyInput);

    // Langfuse secret key
    const secretKeyLabel = document.createElement('div');
    secretKeyLabel.className = 'settings-label';
    secretKeyLabel.textContent = i18nString(UIStrings.langfuseSecretKey);
    tracingConfigContainer.appendChild(secretKeyLabel);

    const secretKeyHint = document.createElement('div');
    secretKeyHint.className = 'settings-hint';
    secretKeyHint.textContent = i18nString(UIStrings.langfuseSecretKeyHint);
    tracingConfigContainer.appendChild(secretKeyHint);

    const secretKeyInput = document.createElement('input');
    secretKeyInput.className = 'settings-input';
    secretKeyInput.type = 'password';
    secretKeyInput.placeholder = 'sk-lf-...';
    secretKeyInput.value = currentTracingConfig.secretKey || '';
    tracingConfigContainer.appendChild(secretKeyInput);

    // Test connection button
    const testTracingButton = document.createElement('button');
    testTracingButton.className = 'settings-button test-button';
    testTracingButton.textContent = i18nString(UIStrings.testTracing);
    tracingConfigContainer.appendChild(testTracingButton);

    // Test status message
    const testTracingStatus = document.createElement('div');
    testTracingStatus.className = 'settings-status';
    testTracingStatus.style.display = 'none';
    tracingConfigContainer.appendChild(testTracingStatus);

    // Toggle tracing config visibility
    tracingEnabledCheckbox.addEventListener('change', () => {
      tracingConfigContainer.style.display = tracingEnabledCheckbox.checked ? 'block' : 'none';
    });

    // Test tracing connection
    testTracingButton.addEventListener('click', async () => {
      testTracingButton.disabled = true;
      testTracingStatus.style.display = 'block';
      testTracingStatus.textContent = 'Testing connection...';
      testTracingStatus.style.backgroundColor = 'var(--color-background-elevation-1)';
      testTracingStatus.style.color = 'var(--color-text-primary)';

      try {
        const endpoint = endpointInput.value.trim();
        const publicKey = publicKeyInput.value.trim();
        const secretKey = secretKeyInput.value.trim();

        if (!endpoint || !publicKey || !secretKey) {
          throw new Error('All fields are required for testing');
        }

        // Test the connection with a simple trace
        const testPayload = {
          batch: [{
            id: `test-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'trace-create',
            body: {
              id: `trace-test-${Date.now()}`,
              name: 'Connection Test',
              timestamp: new Date().toISOString()
            }
          }]
        };

        const response = await fetch(`${endpoint}/api/public/ingestion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(`${publicKey}:${secretKey}`)
          },
          body: JSON.stringify(testPayload)
        });

        if (response.ok) {
          testTracingStatus.textContent = '✓ Connection successful';
          testTracingStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          testTracingStatus.style.color = 'var(--color-accent-green)';
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        testTracingStatus.textContent = `✗ ${error instanceof Error ? error.message : 'Connection failed'}`;
        testTracingStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        testTracingStatus.style.color = 'var(--color-accent-red)';
      } finally {
        testTracingButton.disabled = false;
        setTimeout(() => {
          testTracingStatus.style.display = 'none';
        }, 5000);
      }
    });

    // Add evaluation configuration section
    const evaluationSection = document.createElement('div');
    evaluationSection.className = 'settings-section evaluation-section';
    contentDiv.appendChild(evaluationSection);

    const evaluationSectionTitle = document.createElement('h3');
    evaluationSectionTitle.className = 'settings-subtitle';
    evaluationSectionTitle.textContent = i18nString(UIStrings.evaluationSection);
    evaluationSection.appendChild(evaluationSectionTitle);

    // Get current evaluation configuration
    const currentEvaluationConfig = getEvaluationConfig();

    // Evaluation enabled checkbox
    const evaluationEnabledContainer = document.createElement('div');
    evaluationEnabledContainer.className = 'evaluation-enabled-container';
    evaluationSection.appendChild(evaluationEnabledContainer);

    const evaluationEnabledCheckbox = document.createElement('input');
    evaluationEnabledCheckbox.type = 'checkbox';
    evaluationEnabledCheckbox.id = 'evaluation-enabled';
    evaluationEnabledCheckbox.className = 'evaluation-checkbox';
    evaluationEnabledCheckbox.checked = isEvaluationEnabled();
    evaluationEnabledContainer.appendChild(evaluationEnabledCheckbox);

    const evaluationEnabledLabel = document.createElement('label');
    evaluationEnabledLabel.htmlFor = 'evaluation-enabled';
    evaluationEnabledLabel.className = 'evaluation-label';
    evaluationEnabledLabel.textContent = i18nString(UIStrings.evaluationEnabled);
    evaluationEnabledContainer.appendChild(evaluationEnabledLabel);

    const evaluationEnabledHint = document.createElement('div');
    evaluationEnabledHint.className = 'settings-hint';
    evaluationEnabledHint.textContent = i18nString(UIStrings.evaluationEnabledHint);
    evaluationSection.appendChild(evaluationEnabledHint);

    // Connection status indicator
    const connectionStatusContainer = document.createElement('div');
    connectionStatusContainer.className = 'connection-status-container';
    connectionStatusContainer.style.display = 'flex';
    connectionStatusContainer.style.alignItems = 'center';
    connectionStatusContainer.style.gap = '8px';
    connectionStatusContainer.style.marginTop = '8px';
    connectionStatusContainer.style.fontSize = '13px';
    evaluationSection.appendChild(connectionStatusContainer);

    const connectionStatusDot = document.createElement('div');
    connectionStatusDot.className = 'connection-status-dot';
    connectionStatusDot.style.width = '8px';
    connectionStatusDot.style.height = '8px';
    connectionStatusDot.style.borderRadius = '50%';
    connectionStatusDot.style.flexShrink = '0';
    connectionStatusContainer.appendChild(connectionStatusDot);

    const connectionStatusText = document.createElement('span');
    connectionStatusText.className = 'connection-status-text';
    connectionStatusContainer.appendChild(connectionStatusText);

    // Function to update connection status
    const updateConnectionStatus = () => {
      const isConnected = isEvaluationConnected();
      
      logger.debug('Updating connection status', { isConnected });
      
      if (isConnected) {
        connectionStatusDot.style.backgroundColor = 'var(--color-accent-green)';
        connectionStatusText.textContent = 'Connected to evaluation server';
        connectionStatusText.style.color = 'var(--color-accent-green)';
      } else {
        connectionStatusDot.style.backgroundColor = 'var(--color-text-disabled)';
        connectionStatusText.textContent = 'Not connected';
        connectionStatusText.style.color = 'var(--color-text-disabled)';
      }
    };

    // Update status initially and when evaluation is enabled/disabled
    updateConnectionStatus();
    
    // Set up periodic status updates every 2 seconds
    const statusUpdateInterval = setInterval(updateConnectionStatus, 2000);

    // Evaluation configuration container (shown when enabled)
    const evaluationConfigContainer = document.createElement('div');
    evaluationConfigContainer.className = 'evaluation-config-container';
    evaluationConfigContainer.style.display = evaluationEnabledCheckbox.checked ? 'block' : 'none';
    evaluationSection.appendChild(evaluationConfigContainer);

    // Client ID display (read-only)
    const clientIdLabel = document.createElement('div');
    clientIdLabel.className = 'settings-label';
    clientIdLabel.textContent = 'Client ID';
    evaluationConfigContainer.appendChild(clientIdLabel);

    const clientIdHint = document.createElement('div');
    clientIdHint.className = 'settings-hint';
    clientIdHint.textContent = 'Unique identifier for this DevTools instance';
    evaluationConfigContainer.appendChild(clientIdHint);

    const clientIdInput = document.createElement('input');
    clientIdInput.type = 'text';
    clientIdInput.className = 'settings-input';
    clientIdInput.value = currentEvaluationConfig.clientId || 'Auto-generated on first connection';
    clientIdInput.readOnly = true;
    clientIdInput.style.backgroundColor = 'var(--color-background-elevation-1)';
    clientIdInput.style.cursor = 'default';
    evaluationConfigContainer.appendChild(clientIdInput);

    // Evaluation endpoint
    const evaluationEndpointLabel = document.createElement('div');
    evaluationEndpointLabel.className = 'settings-label';
    evaluationEndpointLabel.textContent = i18nString(UIStrings.evaluationEndpoint);
    evaluationConfigContainer.appendChild(evaluationEndpointLabel);

    const evaluationEndpointHint = document.createElement('div');
    evaluationEndpointHint.className = 'settings-hint';
    evaluationEndpointHint.textContent = i18nString(UIStrings.evaluationEndpointHint);
    evaluationConfigContainer.appendChild(evaluationEndpointHint);

    const evaluationEndpointInput = document.createElement('input');
    evaluationEndpointInput.type = 'text';
    evaluationEndpointInput.className = 'settings-input';
    evaluationEndpointInput.placeholder = 'ws://localhost:8080';
    evaluationEndpointInput.value = currentEvaluationConfig.endpoint || 'ws://localhost:8080';
    evaluationConfigContainer.appendChild(evaluationEndpointInput);

    // Evaluation secret key
    const evaluationSecretKeyLabel = document.createElement('div');
    evaluationSecretKeyLabel.className = 'settings-label';
    evaluationSecretKeyLabel.textContent = i18nString(UIStrings.evaluationSecretKey);
    evaluationConfigContainer.appendChild(evaluationSecretKeyLabel);

    const evaluationSecretKeyHint = document.createElement('div');
    evaluationSecretKeyHint.className = 'settings-hint';
    evaluationSecretKeyHint.textContent = i18nString(UIStrings.evaluationSecretKeyHint);
    evaluationConfigContainer.appendChild(evaluationSecretKeyHint);

    const evaluationSecretKeyInput = document.createElement('input');
    evaluationSecretKeyInput.type = 'password';
    evaluationSecretKeyInput.className = 'settings-input';
    evaluationSecretKeyInput.placeholder = 'Optional secret key';
    evaluationSecretKeyInput.value = currentEvaluationConfig.secretKey || '';
    evaluationConfigContainer.appendChild(evaluationSecretKeyInput);

    // Connect and Test buttons container
    const evaluationButtonsContainer = document.createElement('div');
    evaluationButtonsContainer.className = 'evaluation-buttons-container';
    evaluationConfigContainer.appendChild(evaluationButtonsContainer);

    const connectEvaluationButton = document.createElement('button');
    connectEvaluationButton.className = 'settings-button connect-button';
    connectEvaluationButton.textContent = i18nString(UIStrings.connectEvaluation);
    evaluationButtonsContainer.appendChild(connectEvaluationButton);

    const testEvaluationButton = document.createElement('button');
    testEvaluationButton.className = 'settings-button test-button';
    testEvaluationButton.textContent = i18nString(UIStrings.testEvaluation);
    evaluationButtonsContainer.appendChild(testEvaluationButton);

    // Test status message
    const testEvaluationStatus = document.createElement('div');
    testEvaluationStatus.className = 'settings-status';
    testEvaluationStatus.style.display = 'none';
    evaluationConfigContainer.appendChild(testEvaluationStatus);

    // Toggle evaluation config visibility
    evaluationEnabledCheckbox.addEventListener('change', () => {
      evaluationConfigContainer.style.display = evaluationEnabledCheckbox.checked ? 'block' : 'none';
    });

    // Test evaluation connection
    testEvaluationButton.addEventListener('click', async () => {
      testEvaluationButton.disabled = true;
      testEvaluationStatus.style.display = 'block';
      testEvaluationStatus.textContent = 'Testing connection...';
      testEvaluationStatus.style.backgroundColor = 'var(--color-background-elevation-1)';
      testEvaluationStatus.style.color = 'var(--color-text-primary)';

      try {
        const endpoint = evaluationEndpointInput.value.trim();
        const secretKey = evaluationSecretKeyInput.value.trim();

        if (!endpoint) {
          throw new Error('Endpoint is required for testing');
        }

        // Temporarily update config for testing
        setEvaluationConfig({
          enabled: true,
          endpoint,
          secretKey
        });

        const result = await testEvaluationConnection();
        
        if (result.success) {
          testEvaluationStatus.textContent = '✓ Connection successful';
          testEvaluationStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          testEvaluationStatus.style.color = 'var(--color-accent-green)';
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        testEvaluationStatus.textContent = `✗ ${error instanceof Error ? error.message : 'Connection failed'}`;
        testEvaluationStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        testEvaluationStatus.style.color = 'var(--color-accent-red)';
      } finally {
        testEvaluationButton.disabled = false;
        setTimeout(() => {
          testEvaluationStatus.style.display = 'none';
        }, 5000);
      }
    });

    // Connect evaluation service
    connectEvaluationButton.addEventListener('click', async () => {
      connectEvaluationButton.disabled = true;
      testEvaluationStatus.style.display = 'block';
      testEvaluationStatus.textContent = 'Connecting...';
      testEvaluationStatus.style.backgroundColor = 'var(--color-background-elevation-1)';
      testEvaluationStatus.style.color = 'var(--color-text-primary)';

      try {
        const endpoint = evaluationEndpointInput.value.trim();
        const secretKey = evaluationSecretKeyInput.value.trim();

        if (!endpoint) {
          throw new Error('Endpoint is required for connection');
        }

        // Update config and connect
        setEvaluationConfig({
          enabled: true,
          endpoint,
          secretKey
        });

        await connectToEvaluationService();
        
        // Update client ID display after connection
        const clientId = getEvaluationClientId();
        if (clientId) {
          clientIdInput.value = clientId;
        }
        
        testEvaluationStatus.textContent = '✓ Connected successfully';
        testEvaluationStatus.style.backgroundColor = 'var(--color-accent-green-background)';
        testEvaluationStatus.style.color = 'var(--color-accent-green)';
        
        // Update connection status indicator with a small delay to ensure connection is established
        setTimeout(updateConnectionStatus, 500);
      } catch (error) {
        testEvaluationStatus.textContent = `✗ ${error instanceof Error ? error.message : 'Connection failed'}`;
        testEvaluationStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        testEvaluationStatus.style.color = 'var(--color-accent-red)';
        
        // Update connection status indicator
        updateConnectionStatus();
      } finally {
        connectEvaluationButton.disabled = false;
        setTimeout(() => {
          testEvaluationStatus.style.display = 'none';
        }, 5000);
      }
    });
    
    // Add disclaimer section
    const disclaimerSection = document.createElement('div');
    disclaimerSection.classList.add('settings-section', 'disclaimer-section');
    contentDiv.appendChild(disclaimerSection);
    
    const disclaimerTitle = document.createElement('h3');
    disclaimerTitle.textContent = i18nString(UIStrings.importantNotice);
    disclaimerTitle.classList.add('settings-subtitle');
    disclaimerSection.appendChild(disclaimerTitle);

    const disclaimerText = document.createElement('div');
    disclaimerText.classList.add('settings-disclaimer');
    disclaimerText.innerHTML = `
      <p class="disclaimer-warning">
        <strong>Alpha Version:</strong> This is an alpha version of the Browser Operator - AI Assistant feature.
      </p>
      <p class="disclaimer-note">
        <strong>Data Sharing:</strong> When using this feature, your browser data and conversation content will be sent to the AI model for processing.
      </p>
      <p class="disclaimer-note">
        <strong>Model Support:</strong> We currently support OpenAI models directly. And we support LiteLLM as a proxy to access 100+ other models.
      </p>
      <p class="disclaimer-footer">
        By using this feature, you acknowledge that your data will be processed according to Model Provider's privacy policy and terms of service.
      </p>
    `;
    disclaimerSection.appendChild(disclaimerText);
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'settings-footer';
    contentDiv.appendChild(buttonContainer);
    
    // Status message for save operation
    const saveStatusMessage = document.createElement('div');
    saveStatusMessage.className = 'settings-status save-status';
    saveStatusMessage.style.display = 'none';
    saveStatusMessage.style.marginRight = 'auto'; // Push to left
    buttonContainer.appendChild(saveStatusMessage);
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'settings-button cancel-button';
    cancelButton.setAttribute('type', 'button');
    cancelButton.addEventListener('click', () => dialog.hide());
    buttonContainer.appendChild(cancelButton);
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'settings-button save-button';
    saveButton.setAttribute('type', 'button');
    buttonContainer.appendChild(saveButton);
    
    saveButton.addEventListener('click', async () => {
      // Disable save button while saving
      saveButton.disabled = true;
      
      // Show saving status
      saveStatusMessage.textContent = 'Saving settings...';
      saveStatusMessage.style.backgroundColor = 'var(--color-accent-blue-background)';
      saveStatusMessage.style.color = 'var(--color-accent-blue)';
      saveStatusMessage.style.display = 'block';
      
      // Save provider selection
      const selectedProvider = providerSelect.value;
      localStorage.setItem(PROVIDER_SELECTION_KEY, selectedProvider);
      
      // Save OpenAI API key
      const newApiKey = settingsApiKeyInput.value.trim();
      if (newApiKey) {
        localStorage.setItem('ai_chat_api_key', newApiKey);
      } else {
        localStorage.removeItem('ai_chat_api_key');
      }
      
      // Save or remove LiteLLM API key
      const liteLLMApiKeyValue = litellmApiKeyInput.value.trim();
      if (liteLLMApiKeyValue) {
        localStorage.setItem(LITELLM_API_KEY_STORAGE_KEY, liteLLMApiKeyValue);
      } else {
        localStorage.removeItem(LITELLM_API_KEY_STORAGE_KEY);
      }
      
      // Save or remove LiteLLM endpoint
      const liteLLMEndpointValue = litellmEndpointInput.value.trim();
      if (liteLLMEndpointValue) {
        localStorage.setItem(LITELLM_ENDPOINT_KEY, liteLLMEndpointValue);
      } else {
        localStorage.removeItem(LITELLM_ENDPOINT_KEY);
      }
      
      // Save or remove Groq API key
      const groqApiKeyValue = groqApiKeyInput.value.trim();
      if (groqApiKeyValue) {
        localStorage.setItem(GROQ_API_KEY_STORAGE_KEY, groqApiKeyValue);
      } else {
        localStorage.removeItem(GROQ_API_KEY_STORAGE_KEY);
      }
      
      // Save or remove OpenRouter API key
      const openrouterApiKeyValue = openrouterApiKeyInput.value.trim();
      if (openrouterApiKeyValue) {
        localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, openrouterApiKeyValue);
      } else {
        localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
      }
      
      // Determine which mini/nano model selectors to use based on current provider
      let miniModelValue = '';
      let nanoModelValue = '';
      
      if (selectedProvider === 'openai') {
        // Get values from OpenAI selectors
        if (SettingsDialog.#openaiMiniModelSelect) {
          miniModelValue = SettingsDialog.#openaiMiniModelSelect.value;
        }
        if (SettingsDialog.#openaiNanoModelSelect) {
          nanoModelValue = SettingsDialog.#openaiNanoModelSelect.value;
        }
      } else if (selectedProvider === 'litellm') {
        // Get values from LiteLLM selectors
        if (SettingsDialog.#litellmMiniModelSelect) {
          miniModelValue = SettingsDialog.#litellmMiniModelSelect.value;
        }
        if (SettingsDialog.#litellmNanoModelSelect) {
          nanoModelValue = SettingsDialog.#litellmNanoModelSelect.value;
        }
      } else if (selectedProvider === 'groq') {
        // Get values from Groq selectors
        if (SettingsDialog.#groqMiniModelSelect) {
          miniModelValue = SettingsDialog.#groqMiniModelSelect.value;
        }
        if (SettingsDialog.#groqNanoModelSelect) {
          nanoModelValue = SettingsDialog.#groqNanoModelSelect.value;
        }
      } else if (selectedProvider === 'openrouter') {
        // Get values from OpenRouter selectors
        if (SettingsDialog.#openrouterMiniModelSelect) {
          miniModelValue = SettingsDialog.#openrouterMiniModelSelect.value;
        }
        if (SettingsDialog.#openrouterNanoModelSelect) {
          nanoModelValue = SettingsDialog.#openrouterNanoModelSelect.value;
        }
      }
      
      // Save mini model if selected
      logger.debug('Mini model value to save:', miniModelValue);
      if (miniModelValue) {
        localStorage.setItem(MINI_MODEL_STORAGE_KEY, miniModelValue);
      } else {
        localStorage.removeItem(MINI_MODEL_STORAGE_KEY);
      }
      
      // Save nano model if selected 
      logger.debug('Nano model value to save:', nanoModelValue);
      if (nanoModelValue) {
        localStorage.setItem(NANO_MODEL_STORAGE_KEY, nanoModelValue);
      } else {
        localStorage.removeItem(NANO_MODEL_STORAGE_KEY);
      }
      
      // Save tracing configuration
      if (tracingEnabledCheckbox.checked) {
        const endpoint = endpointInput.value.trim();
        const publicKey = publicKeyInput.value.trim();
        const secretKey = secretKeyInput.value.trim();

        if (endpoint && publicKey && secretKey) {
          setTracingConfig({
            provider: 'langfuse',
            endpoint,
            publicKey,
            secretKey
          });
        }
      } else {
        setTracingConfig({ provider: 'disabled' });
      }

      // Save evaluation configuration
      setEvaluationConfig({
        enabled: evaluationEnabledCheckbox.checked,
        endpoint: evaluationEndpointInput.value.trim() || 'ws://localhost:8080',
        secretKey: evaluationSecretKeyInput.value.trim()
      });
      
      logger.debug('Settings saved successfully');
      logger.debug('Mini Model:', localStorage.getItem(MINI_MODEL_STORAGE_KEY));
      logger.debug('Nano Model:', localStorage.getItem(NANO_MODEL_STORAGE_KEY));
      logger.debug('Provider:', selectedProvider);
      
      // Set success message and notify parent
      saveStatusMessage.textContent = 'Settings saved successfully';
      saveStatusMessage.style.backgroundColor = 'var(--color-accent-green-background)';
      saveStatusMessage.style.color = 'var(--color-accent-green)';
      saveStatusMessage.style.display = 'block';
      
      onSettingsSaved();
      
      setTimeout(() => {
        dialog.hide();
      }, 1500);
    });
    
    // Advanced Settings Toggle Logic
    function toggleAdvancedSections(show: boolean): void {
      const display = show ? 'block' : 'none';
      historySection.style.display = display;
      vectorDBSection.style.display = display;
      tracingSection.style.display = display;
      evaluationSection.style.display = display;
      
      // Save state to localStorage
      localStorage.setItem(ADVANCED_SETTINGS_ENABLED_KEY, show.toString());
    }
    
    // Set initial state of advanced sections
    toggleAdvancedSections(advancedToggleCheckbox.checked);
    
    // Add event listener for toggle
    advancedToggleCheckbox.addEventListener('change', () => {
      toggleAdvancedSections(advancedToggleCheckbox.checked);
    });
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .settings-dialog {
        color: var(--color-text-primary);
        background-color: var(--color-background);
      }
      
      .settings-content {
        padding: 0;
        max-width: 100%;
      }
      
      .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .settings-title {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        color: var(--color-text-primary);
      }
      
      .settings-close-button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 4px 8px;
      }
      
      .settings-close-button:hover {
        color: var(--color-text-primary);
      }
      
      .provider-selection-section {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .provider-select {
        margin-top: 8px;
      }
      
      .provider-content {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .settings-section {
        margin-bottom: 24px;
      }
      
      .settings-subtitle {
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 12px 0;
        color: var(--color-text-primary);
      }
      
      .settings-label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        color: var(--color-text-primary);
      }
      
      .settings-hint {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-bottom: 8px;
      }
      
      .settings-description {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin: 4px 0 12px 0;
      }
      
      .settings-input, .settings-select {
        width: 100%;
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid var(--color-details-hairline);
        background-color: var(--color-background-elevation-2);
        color: var(--color-text-primary);
        font-size: 14px;
        box-sizing: border-box;
        height: 32px;
      }
      
      .settings-input:focus, .settings-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary-opacity-30);
      }
      
      .settings-status {
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 13px;
        margin: 8px 0;
      }
      
      .fetch-button-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
      }
      
      .custom-models-section {
        margin-top: 16px;
      }
      
      .custom-models-list {
        margin-bottom: 16px;
      }
      
      .custom-model-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding: 6px 0;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .custom-model-name {
        flex: 1;
        font-size: 14px;
      }
      
      .new-model-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .custom-model-input {
        flex: 1;
        margin-bottom: 0;
      }
      
      /* Button spacing and layout */
      .button-group {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .test-status {
        font-size: 12px;
        margin-left: 4px;
      }
      
      .model-test-status {
        margin-top: 4px;
      }
      
      .model-selection-container {
        margin-bottom: 20px;
      }
      
      .mini-model-description, .nano-model-description {
        font-size: 12px;
        font-style: italic;
      }
      
      .history-section {
        margin-top: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .disclaimer-section {
        background-color: var(--color-background-elevation-1);
        border-radius: 8px;
        padding: 16px 20px;
        margin: 16px 20px;
        border: 1px solid var(--color-details-hairline);
      }
      
      .disclaimer-warning {
        color: var(--color-accent-orange);
        margin-bottom: 8px;
      }
      
      .disclaimer-note {
        margin-bottom: 8px;
      }
      
      .disclaimer-footer {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-top: 8px;
      }
      
      .settings-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--color-details-hairline);
      }
      
      .save-status {
        margin: 0;
        font-size: 13px;
        padding: 6px 10px;
      }
      
      .settings-button {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        background-color: var(--color-background-elevation-1);
        border: 1px solid var(--color-details-hairline);
        color: var(--color-text-primary);
      }
      
      .settings-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      .settings-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Add button styling */
      .add-button {
        min-width: 60px;
        border-radius: 4px;
        font-size: 12px;
      }
      
      /* Icon button styling */
      .icon-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        color: var(--color-text-secondary);
        transition: all 0.15s;
      }
      
      .icon-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      /* Specific icon button hover states */
      .remove-button:hover {
        color: var(--color-accent-red);
      }
      
      .test-button:hover {
        color: var(--color-accent-green);
      }
      
      .trash-icon, .check-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Add specific button styling */
      .add-button {
        background-color: var(--color-background-elevation-1);
      }
      
      .add-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      /* Cancel button */
      .cancel-button {
        background-color: var(--color-background-elevation-1);
        border: 1px solid var(--color-details-hairline);
        color: var(--color-text-primary);
      }
      
      .cancel-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      /* Save button */
      .save-button {
        background-color: var(--color-primary);
        border: 1px solid var(--color-primary);
        color: white;
      }
      
      .save-button:hover {
        background-color: var(--color-primary-variant);
      }
      
      .clear-button {
        margin-top: 8px;
      }
      
      /* Vector DB section styles */
      .vector-db-section {
        margin-top: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      /* Tracing section styles */
      .tracing-section {
        margin-top: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .settings-section-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin: 0 0 16px 0;
      }
      
      .tracing-enabled-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .tracing-checkbox {
        margin: 0;
      }
      
      .tracing-label {
        font-weight: 500;
        color: var(--color-text-primary);
        cursor: pointer;
      }
      
      .tracing-config-container {
        margin-top: 16px;
        padding-left: 24px;
        border-left: 2px solid var(--color-details-hairline);
      }

      /* Advanced Settings Toggle styles */
      .advanced-settings-toggle-section {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
        background-color: var(--color-background-highlight);
      }
      
      .advanced-settings-toggle-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .advanced-settings-checkbox {
        margin: 0;
        transform: scale(1.1);
      }
      
      .advanced-settings-label {
        font-weight: 500;
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: 14px;
      }

      /* Evaluation section styles */
      .evaluation-section {
        margin-top: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .evaluation-enabled-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .evaluation-checkbox {
        margin: 0;
      }
      
      .evaluation-label {
        font-weight: 500;
        color: var(--color-text-primary);
        cursor: pointer;
      }
      
      .evaluation-config-container {
        margin-top: 16px;
        padding-left: 24px;
        border-left: 2px solid var(--color-details-hairline);
      }

      .evaluation-buttons-container {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }

      .connect-button {
        background-color: var(--color-accent-blue-background);
        color: var(--color-accent-blue);
        border: 1px solid var(--color-accent-blue);
      }

      .connect-button:hover {
        background-color: var(--color-accent-blue);
        color: var(--color-background);
      }

      .connect-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
    dialog.contentElement.appendChild(styleElement);
    
    dialog.show();
    
    return Promise.resolve();
  }
}

// Helper function to create a model selector
function createModelSelector(
  container: HTMLElement,
  labelText: string,
  description: string,
  selectorType: string, // renamed from className for clarity
  modelOptions: ModelOption[],
  selectedModel: string,
  defaultOptionText: string,
  onFocus?: () => void // Optional callback for when the selector is focused
): HTMLSelectElement {
  const modelContainer = document.createElement('div');
  modelContainer.className = 'model-selection-container';
  container.appendChild(modelContainer);
  
  const modelLabel = document.createElement('div');
  modelLabel.className = 'settings-label';
  modelLabel.textContent = labelText;
  modelContainer.appendChild(modelLabel);
  
  const modelDescription = document.createElement('div');
  modelDescription.className = 'settings-hint';
  modelDescription.textContent = description;
  modelContainer.appendChild(modelDescription);
  
  const modelSelect = document.createElement('select');
  modelSelect.className = 'settings-input';
  modelSelect.dataset.modelType = selectorType; // Use data attribute instead of class
  modelContainer.appendChild(modelSelect);
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultOptionText;
  modelSelect.appendChild(defaultOption);
  
  // Add model options
  modelOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    if (option.value === selectedModel) {
      optionElement.selected = true;
    }
    modelSelect.appendChild(optionElement);
  });
  
  // Add focus event listener if a callback was provided
  if (onFocus) {
    modelSelect.addEventListener('focus', onFocus);
  }
  
  return modelSelect;
}