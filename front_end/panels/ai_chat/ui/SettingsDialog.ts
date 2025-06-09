// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { LiteLLMClient } from '../core/LiteLLMClient.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('SettingsDialog');

// Model type definition
interface ModelOption {
  value: string;
  label: string;
  type: 'openai' | 'litellm';
}

// Local storage keys
const MODEL_SELECTION_KEY = 'ai_chat_model_selection';
const MINI_MODEL_STORAGE_KEY = 'ai_chat_mini_model';
const NANO_MODEL_STORAGE_KEY = 'ai_chat_nano_model';
const LITELLM_ENDPOINT_KEY = 'ai_chat_litellm_endpoint';
const LITELLM_API_KEY_STORAGE_KEY = 'ai_chat_litellm_api_key';
const PROVIDER_SELECTION_KEY = 'ai_chat_provider';

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
};

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ui/SettingsDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SettingsDialog {
  // Variables to store direct references to model selectors
  static #openaiMiniModelSelect: HTMLSelectElement | null = null;
  static #openaiNanoModelSelect: HTMLSelectElement | null = null;
  static #litellmMiniModelSelect: HTMLSelectElement | null = null;
  static #litellmNanoModelSelect: HTMLSelectElement | null = null;
  
  static async show(
    selectedModel: string,
    miniModel: string,
    nanoModel: string,
    onSettingsSaved: () => void,
    fetchLiteLLMModels: (apiKey: string|null, endpoint?: string) => Promise<{models: ModelOption[], hadWildcard: boolean}>,
    updateModelOptions: (litellmModels: ModelOption[], hadWildcard?: boolean) => void,
    getModelOptions: (provider?: 'openai' | 'litellm') => ModelOption[],
    addCustomModelOption: (modelName: string, modelType?: 'openai' | 'litellm') => ModelOption[],
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
    
    // Create provider-specific content containers
    const openaiContent = document.createElement('div');
    openaiContent.className = 'provider-content openai-content';
    openaiContent.style.display = currentProvider === 'openai' ? 'block' : 'none';
    contentDiv.appendChild(openaiContent);
    
    const litellmContent = document.createElement('div');
    litellmContent.className = 'provider-content litellm-content';
    litellmContent.style.display = currentProvider === 'litellm' ? 'block' : 'none';
    contentDiv.appendChild(litellmContent);
    
    // Event listener for provider change
    providerSelect.addEventListener('change', async () => {
      const selectedProvider = providerSelect.value;
      
      // Toggle visibility of provider content
      openaiContent.style.display = selectedProvider === 'openai' ? 'block' : 'none';
      litellmContent.style.display = selectedProvider === 'litellm' ? 'block' : 'none';
      
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
      }

      // Get model options filtered by the selected provider
      const availableModels = getModelOptions(selectedProvider as 'openai' | 'litellm');
      logger.debug(`Available models for ${selectedProvider}:`, availableModels);
      logger.debug(`Current miniModel: ${miniModel}, nanoModel: ${nanoModel}`);

      // Refresh model selectors based on new provider
      if (selectedProvider === 'openai') {
        // Use our reusable function to update OpenAI model selectors
        updateOpenAIModelSelectors();
      } else {
        // Make sure LiteLLM selectors are updated
        updateLiteLLMModelSelectors();
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
        miniModel,
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
        nanoModel,
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
        miniModel,
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
        nanoModel,
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

            const result = await LiteLLMClient.testConnection(liteLLMApiKey, model, endpoint);

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
        
        const result = await LiteLLMClient.testConnection(liteLLMApiKey, modelName, endpoint);
        
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
      } else {
        // Get values from LiteLLM selectors
        if (SettingsDialog.#litellmMiniModelSelect) {
          miniModelValue = SettingsDialog.#litellmMiniModelSelect.value;
        }
        if (SettingsDialog.#litellmNanoModelSelect) {
          nanoModelValue = SettingsDialog.#litellmNanoModelSelect.value;
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