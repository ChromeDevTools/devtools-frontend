// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Help dialog title
   */
  helpTitle: 'AI Assistant Help',
  /**
   *@description Getting started section title
   */
  gettingStarted: 'Getting Started',
  /**
   *@description Getting started content
   */
  gettingStartedContent: 'To use AI Assistant, you need to provide an API key in the Settings. Supported providers include OpenAI, OpenRouter, Groq, and LiteLLM.',
  /**
   *@description Available models section title
   */
  availableModels: 'Available Models',
  /**
   *@description Common tasks section title
   */
  commonTasks: 'Common Tasks',
  /**
   *@description Troubleshooting section title
   */
  troubleshooting: 'Troubleshooting',
  /**
   *@description Important notice title
   */
  importantNotice: 'Important Notice',
  /**
   *@description Alpha version warning
   */
  alphaVersionWarning: 'Alpha Version: This is an alpha version of the Browser Operator - AI Assistant feature. Do not use it for production or sensitive data.',
  /**
   *@description Data sharing notice
   */
  dataSharingNotice: 'When using this feature, your browser data and conversation content will be sent to the AI model for processing.',
  /**
   *@description Close button text
   */
  closeButton: 'Close',
};

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ui/HelpDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class HelpDialog {
  static show(): void {
    // Create a help dialog
    const dialog = new UI.Dialog.Dialog();
    dialog.setDimmed(true);
    dialog.setOutsideClickCallback(() => dialog.hide());
    dialog.contentElement.classList.add('help-dialog');

    // Create help content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'help-content';
    contentDiv.style.overflowY = 'auto';
    dialog.contentElement.appendChild(contentDiv);
    
    // Create header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'help-header';
    contentDiv.appendChild(headerDiv);
    
    const title = document.createElement('h2');
    title.className = 'help-title';
    title.textContent = i18nString(UIStrings.helpTitle);
    headerDiv.appendChild(title);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'help-close-button';
    closeButton.setAttribute('aria-label', 'Close help');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => dialog.hide());
    headerDiv.appendChild(closeButton);
    
    // Help content sections
    const helpSectionsContainer = document.createElement('div');
    helpSectionsContainer.className = 'help-sections-container';
    contentDiv.appendChild(helpSectionsContainer);
    
    // Getting Started section
    const gettingStartedSection = document.createElement('div');
    gettingStartedSection.className = 'help-section';
    helpSectionsContainer.appendChild(gettingStartedSection);
    
    const gettingStartedTitle = document.createElement('h3');
    gettingStartedTitle.className = 'help-subtitle';
    gettingStartedTitle.textContent = i18nString(UIStrings.gettingStarted);
    gettingStartedSection.appendChild(gettingStartedTitle);
    
    const gettingStartedContent = document.createElement('p');
    gettingStartedContent.className = 'help-text';
    gettingStartedContent.textContent = i18nString(UIStrings.gettingStartedContent);
    gettingStartedSection.appendChild(gettingStartedContent);
    
    // Available Models section
    const modelsSection = document.createElement('div');
    modelsSection.className = 'help-section';
    helpSectionsContainer.appendChild(modelsSection);
    
    const modelsTitle = document.createElement('h3');
    modelsTitle.className = 'help-subtitle';
    modelsTitle.textContent = i18nString(UIStrings.availableModels);
    modelsSection.appendChild(modelsTitle);
    
    const modelsContent = document.createElement('p');
    modelsContent.className = 'help-text';
    modelsContent.textContent = 'AI Assistant supports models from multiple providers:';
    modelsSection.appendChild(modelsContent);
    
    const modelsList = document.createElement('ul');
    modelsList.className = 'help-list';
    modelsSection.appendChild(modelsList);
    
    const models = [
      {name: 'OpenAI Models', description: 'GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, O4 Mini, O3 Mini'},
      {name: 'OpenRouter Models', description: 'Access to Claude, Llama, Mistral, and other models via OpenRouter'},
      {name: 'Groq Models', description: 'Fast inference with Llama and Mixtral models'},
      {name: 'LiteLLM Models', description: 'Unified API for any supported model provider'},
    ];
    
    models.forEach(model => {
      const modelItem = document.createElement('li');
      modelItem.className = 'help-list-item';
      modelItem.textContent = `${model.name} - ${model.description}`;
      modelsList.appendChild(modelItem);
    });
    
    // Common Tasks section
    const tasksSection = document.createElement('div');
    tasksSection.className = 'help-section';
    helpSectionsContainer.appendChild(tasksSection);
    
    const tasksTitle = document.createElement('h3');
    tasksTitle.className = 'help-subtitle';
    tasksTitle.textContent = i18nString(UIStrings.commonTasks);
    tasksSection.appendChild(tasksTitle);
    
    const tasksList = document.createElement('ul');
    tasksList.className = 'help-list';
    tasksSection.appendChild(tasksList);
    
    const tasks = [
      {name: 'New Chat', description: 'Start a fresh conversation'},
      {name: 'Delete Chat', description: 'Remove the current conversation'},
      {name: 'History', description: 'View previous conversations'},
      {name: 'Settings', description: 'Configure your API key and preferences'},
    ];
    
    tasks.forEach(task => {
      const taskItem = document.createElement('li');
      taskItem.className = 'help-list-item';
      
      const taskName = document.createElement('strong');
      taskName.textContent = task.name;
      taskItem.appendChild(taskName);
      
      taskItem.appendChild(document.createTextNode(` - ${task.description}`));
      tasksList.appendChild(taskItem);
    });
    
    // Troubleshooting section
    const troubleshootingSection = document.createElement('div');
    troubleshootingSection.className = 'help-section';
    helpSectionsContainer.appendChild(troubleshootingSection);
    
    const troubleshootingTitle = document.createElement('h3');
    troubleshootingTitle.className = 'help-subtitle';
    troubleshootingTitle.textContent = i18nString(UIStrings.troubleshooting);
    troubleshootingSection.appendChild(troubleshootingTitle);
    
    const troubleshootingIntro = document.createElement('p');
    troubleshootingIntro.className = 'help-text';
    troubleshootingIntro.textContent = 'If you encounter issues:';
    troubleshootingSection.appendChild(troubleshootingIntro);
    
    const troubleshootingList = document.createElement('ul');
    troubleshootingList.className = 'help-list';
    troubleshootingSection.appendChild(troubleshootingList);
    
    const troubleshootingItems = [
      'Verify your API key is valid and has sufficient credits for your chosen provider',
      'Check your internet connection',
      'Try a different model or provider for your specific task',
      'For OpenRouter: Ensure you have credits and the model is available',
      'For Groq: Check that your API key has access to the selected model',
    ];
    
    troubleshootingItems.forEach(item => {
      const troubleshootingItem = document.createElement('li');
      troubleshootingItem.className = 'help-list-item';
      troubleshootingItem.textContent = item;
      troubleshootingList.appendChild(troubleshootingItem);
    });
    
    // Disclaimer section
    const disclaimerSection = document.createElement('div');
    disclaimerSection.className = 'help-section help-disclaimer-section';
    helpSectionsContainer.appendChild(disclaimerSection);
    
    const disclaimerTitle = document.createElement('h3');
    disclaimerTitle.className = 'help-subtitle';
    disclaimerTitle.textContent = i18nString(UIStrings.importantNotice);
    disclaimerSection.appendChild(disclaimerTitle);
    
    const disclaimerWarning = document.createElement('p');
    disclaimerWarning.className = 'help-disclaimer-warning';
    disclaimerWarning.textContent = i18nString(UIStrings.alphaVersionWarning);
    disclaimerSection.appendChild(disclaimerWarning);
    
    const disclaimerNote = document.createElement('p');
    disclaimerNote.className = 'help-disclaimer-note';
    disclaimerNote.textContent = i18nString(UIStrings.dataSharingNotice);
    disclaimerSection.appendChild(disclaimerNote);
    
    // Footer with button
    const footerDiv = document.createElement('div');
    footerDiv.className = 'help-footer';
    contentDiv.appendChild(footerDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'help-button';
    closeBtn.textContent = i18nString(UIStrings.closeButton);
    closeBtn.addEventListener('click', () => dialog.hide());
    footerDiv.appendChild(closeBtn);
    
    // Add styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .help-dialog {
        color: var(--color-text-primary);
        background-color: var(--color-background);
      }
      
      .help-content {
        padding: 0;
        max-width: 100%;
      }
      
      .help-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .help-title {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        color: var(--color-text-primary);
      }
      
      .help-close-button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 4px 8px;
      }
      
      .help-close-button:hover {
        color: var(--color-text-primary);
      }
      
      .help-sections-container {
        padding: 20px;
      }
      
      .help-section {
        margin-bottom: 24px;
      }
      
      .help-subtitle {
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 12px 0;
        color: var(--color-text-primary);
      }
      
      .help-text {
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 12px 0;
        color: var(--color-text-primary);
      }
      
      .help-list {
        margin: 0 0 12px 0;
        padding-left: 24px;
      }
      
      .help-list-item {
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 6px;
        color: var(--color-text-primary);
      }
      
      .help-disclaimer-section {
        background-color: var(--color-background-elevation-1);
        border-radius: 8px;
        padding: 16px;
        margin-top: 20px;
        border: 1px solid var(--color-details-hairline);
      }
      
      .help-disclaimer-warning {
        color: var(--color-accent-orange);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 8px;
      }
      
      .help-disclaimer-note {
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 0;
      }
      
      .help-footer {
        display: flex;
        justify-content: flex-end;
        padding: 16px 20px;
        border-top: 1px solid var(--color-details-hairline);
      }
      
      .help-button {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        background-color: var(--color-primary);
        border: 1px solid var(--color-primary);
        color: white;
        transition: all 0.2s;
      }
      
      .help-button:hover {
        background-color: var(--color-primary-variant);
      }
    `;
    dialog.contentElement.appendChild(styleElement);
    
    dialog.show();
  }
}