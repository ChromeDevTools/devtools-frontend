// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';

interface PromptEditDialogOptions {
  agentType: string;
  agentLabel: string;
  currentPrompt: string;
  defaultPrompt: string;
  hasCustomPrompt: boolean;
  onSave: (prompt: string) => void;
  onRestore: () => void;
  onError?: (error: Error) => void;
}

// Constants for dialog configuration
const DIALOG_CONSTANTS = {
  MIN_WIDTH: 600,
  MIN_HEIGHT: 500,
  TEXTAREA_ROWS: 20,
  TEXTAREA_COLS: 80,
  STATUS_MESSAGE_DURATION: 3000,
  DOUBLE_CLICK_DELAY: 300,
} as const;

const UIStrings = {
  /**
   *@description Dialog title for editing agent prompts
   */
  title: 'Edit Agent Prompt',
  /**
   *@description Label for the agent type being edited
   */
  agentTypeLabel: 'Agent Type',
  /**
   *@description Label for the prompt textarea
   */
  promptLabel: 'System Prompt',
  /**
   *@description Hint text for the prompt textarea
   */
  promptHint: 'Enter the system prompt that defines how this agent behaves',
  /**
   *@description Save button text
   */
  saveButton: 'Save Custom Prompt',
  /**
   *@description Restore default button text
   */
  restoreButton: 'Restore Default',
  /**
   *@description Cancel button text
   */
  cancelButton: 'Cancel',
  /**
   *@description Status message when prompt is saved
   */
  promptSaved: 'Custom prompt saved successfully',
  /**
   *@description Status message when prompt is restored to default
   */
  promptRestored: 'Prompt restored to default',
  /**
   *@description Custom prompt indicator
   */
  customPromptIndicator: 'Using custom prompt',
  /**
   *@description Default prompt indicator
   */
  defaultPromptIndicator: 'Using default prompt',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ui/PromptEditDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Type guard for dialog cleanup
type CleanupFunction = () => void;

export class PromptEditDialog {
  private static activeDialog: UI.Dialog.Dialog | null = null;
  private static cleanupFunctions: CleanupFunction[] = [];

  static show(options: PromptEditDialogOptions): void {
    // Close any existing dialog
    if (this.activeDialog) {
      this.close();
    }

    const dialog = new UI.Dialog.Dialog();
    this.activeDialog = dialog;
    dialog.setDimmed(true);
    dialog.setOutsideClickCallback(() => this.close());
    dialog.contentElement.classList.add('prompt-edit-dialog');
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    dialog.setMaxContentSize(new UI.Geometry.Size(window.innerWidth * 0.9, window.innerHeight * 0.9));

    // Apply styles by injecting a style element
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .prompt-edit-dialog {
        color: var(--color-text-primary);
        background-color: var(--color-background);
        max-width: 90vw;
        max-height: 90vh;
      }
      
      .prompt-edit-content {
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 600px;
        min-height: 500px;
      }
      
      .prompt-edit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
        flex-shrink: 0;
      }
      
      .prompt-edit-title {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        color: var(--color-text-primary);
      }
      
      .prompt-edit-close-button {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 4px 8px;
        border-radius: 4px;
        transition: color 0.2s;
      }
      
      .prompt-edit-close-button:hover {
        color: var(--color-text-primary);
        background-color: var(--color-background-elevation-1);
      }
      
      .prompt-edit-close-button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
      
      .prompt-edit-section {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .prompt-edit-label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 6px;
        color: var(--color-text-primary);
      }
      
      .prompt-edit-hint {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-bottom: 8px;
      }
      
      .prompt-edit-agent-value {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }
      
      .prompt-edit-status {
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        display: inline-block;
      }
      
      .prompt-edit-status.custom {
        background-color: var(--color-accent-blue-background);
        color: var(--color-accent-blue);
      }
      
      .prompt-edit-status.default {
        background-color: var(--color-background-elevation-2);
        color: var(--color-text-secondary);
      }
      
      .prompt-edit-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--color-details-hairline);
        border-radius: 4px;
        background-color: var(--color-background-elevation-2);
        color: var(--color-text-primary);
        font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        line-height: 1.4;
        resize: vertical;
        box-sizing: border-box;
        min-height: 300px;
      }
      
      .prompt-edit-textarea:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 1px var(--color-primary-opacity-30);
      }
      
      .prompt-edit-status-message {
        padding: 8px 16px;
        margin: 8px 20px;
        border-radius: 4px;
        font-size: 13px;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .prompt-edit-status-message.show {
        opacity: 1;
      }
      
      .prompt-edit-status-message.success {
        background-color: var(--color-accent-green-background);
        color: var(--color-accent-green);
      }
      
      .prompt-edit-status-message.error {
        background-color: var(--color-accent-red-background);
        color: var(--color-accent-red);
      }
      
      .prompt-edit-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid var(--color-details-hairline);
        flex-shrink: 0;
      }
      
      .prompt-edit-button {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        border: 1px solid var(--color-details-hairline);
      }
      
      .prompt-edit-button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
      
      .cancel-button, .restore-button {
        background-color: var(--color-background-elevation-1);
        color: var(--color-text-primary);
      }
      
      .cancel-button:hover, .restore-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      .save-button {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
      }
      
      .save-button:hover:not(:disabled) {
        background-color: var(--color-primary-variant);
        border-color: var(--color-primary-variant);
      }
      
      .save-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .restore-button {
        background-color: var(--color-accent-orange-background);
        border-color: var(--color-accent-orange);
        color: var(--color-accent-orange);
      }
      
      .restore-button:hover {
        background-color: var(--color-accent-orange);
        color: white;
      }
    `;
    dialog.contentElement.appendChild(styleElement);

    // Create main content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'prompt-edit-content';
    dialog.contentElement.appendChild(contentDiv);

    // Create header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'prompt-edit-header';
    contentDiv.appendChild(headerDiv);

    const title = document.createElement('h2');
    title.className = 'prompt-edit-title';
    title.textContent = i18nString(UIStrings.title);
    headerDiv.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.className = 'prompt-edit-close-button';
    closeButton.setAttribute('aria-label', 'Close dialog');
    closeButton.setAttribute('role', 'button');
    closeButton.setAttribute('tabindex', '0');
    closeButton.textContent = '×';
    
    const handleClose = (): void => this.close();
    closeButton.addEventListener('click', handleClose);
    this.cleanupFunctions.push(() => closeButton.removeEventListener('click', handleClose));
    
    headerDiv.appendChild(closeButton);

    // Agent type display
    const agentSection = document.createElement('div');
    agentSection.className = 'prompt-edit-section';
    contentDiv.appendChild(agentSection);

    const agentLabel = document.createElement('div');
    agentLabel.className = 'prompt-edit-label';
    agentLabel.textContent = i18nString(UIStrings.agentTypeLabel);
    agentSection.appendChild(agentLabel);

    const agentValue = document.createElement('div');
    agentValue.className = 'prompt-edit-agent-value';
    agentValue.textContent = options.agentLabel;
    agentSection.appendChild(agentValue);

    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = `prompt-edit-status ${options.hasCustomPrompt ? 'custom' : 'default'}`;
    statusIndicator.textContent = options.hasCustomPrompt ? 
      i18nString(UIStrings.customPromptIndicator) : 
      i18nString(UIStrings.defaultPromptIndicator);
    agentSection.appendChild(statusIndicator);

    // Prompt editing section
    const promptSection = document.createElement('div');
    promptSection.className = 'prompt-edit-section';
    contentDiv.appendChild(promptSection);

    const promptLabel = document.createElement('div');
    promptLabel.className = 'prompt-edit-label';
    promptLabel.textContent = i18nString(UIStrings.promptLabel);
    promptSection.appendChild(promptLabel);

    const promptHint = document.createElement('div');
    promptHint.className = 'prompt-edit-hint';
    promptHint.textContent = i18nString(UIStrings.promptHint);
    promptSection.appendChild(promptHint);

    const promptTextarea = document.createElement('textarea');
    promptTextarea.className = 'prompt-edit-textarea';
    promptTextarea.value = options.currentPrompt;
    promptTextarea.rows = DIALOG_CONSTANTS.TEXTAREA_ROWS;
    promptTextarea.cols = DIALOG_CONSTANTS.TEXTAREA_COLS;
    promptTextarea.setAttribute('aria-label', i18nString(UIStrings.promptLabel));
    promptTextarea.setAttribute('aria-describedby', 'prompt-hint');
    promptHint.id = 'prompt-hint';
    promptSection.appendChild(promptTextarea);

    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.className = 'prompt-edit-status-message';
    statusMessage.setAttribute('role', 'status');
    statusMessage.setAttribute('aria-live', 'polite');
    contentDiv.appendChild(statusMessage);

    let statusTimeout: number | null = null;
    const showStatus = (message: string, type: 'success' | 'error'): void => {
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
      statusMessage.textContent = message;
      statusMessage.classList.remove('success', 'error', 'show');
      statusMessage.classList.add(type, 'show');
      
      statusTimeout = window.setTimeout(() => {
        statusMessage.classList.remove('show');
        statusTimeout = null;
      }, DIALOG_CONSTANTS.STATUS_MESSAGE_DURATION);
    };
    
    this.cleanupFunctions.push(() => {
      if (statusTimeout) {
        clearTimeout(statusTimeout);
      }
    });

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'prompt-edit-buttons';
    contentDiv.appendChild(buttonContainer);

    // Restore button (only show if has custom prompt)
    let restoreButton: HTMLButtonElement | null = null;
    if (options.hasCustomPrompt) {
      restoreButton = document.createElement('button');
      restoreButton.className = 'prompt-edit-button restore-button';
      restoreButton.textContent = i18nString(UIStrings.restoreButton);
      const handleRestore = (): void => {
        try {
          promptTextarea.value = options.defaultPrompt;
          statusIndicator.className = 'prompt-edit-status default';
          statusIndicator.textContent = i18nString(UIStrings.defaultPromptIndicator);
          
          options.onRestore();
          showStatus(i18nString(UIStrings.promptRestored), 'success');
          
          // Hide restore button after restoring
          if (restoreButton) {
            restoreButton.style.display = 'none';
          }
        } catch (error) {
          console.error('Failed to restore prompt:', error);
          showStatus('Failed to restore prompt', 'error');
          if (options.onError) {
            options.onError(error as Error);
          }
        }
      };
      
      restoreButton.addEventListener('click', handleRestore);
      this.cleanupFunctions.push(() => restoreButton?.removeEventListener('click', handleRestore));
      buttonContainer.appendChild(restoreButton);
    }

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.className = 'prompt-edit-button cancel-button';
    cancelButton.textContent = i18nString(UIStrings.cancelButton);
    const handleCancel = (): void => this.close();
    cancelButton.addEventListener('click', handleCancel);
    this.cleanupFunctions.push(() => cancelButton.removeEventListener('click', handleCancel));
    buttonContainer.appendChild(cancelButton);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.className = 'prompt-edit-button save-button';
    saveButton.textContent = i18nString(UIStrings.saveButton);
    const handleSave = (): void => {
      const newPrompt = promptTextarea.value.trim();
      if (!newPrompt) {
        showStatus('Prompt cannot be empty', 'error');
        return;
      }
      
      try {
        options.onSave(newPrompt);
        
        statusIndicator.className = 'prompt-edit-status custom';
        statusIndicator.textContent = i18nString(UIStrings.customPromptIndicator);
        showStatus(i18nString(UIStrings.promptSaved), 'success');
        
        // Show restore button after saving custom prompt
        if (!restoreButton) {
          const newRestoreButton = document.createElement('button');
          newRestoreButton.className = 'prompt-edit-button restore-button';
          newRestoreButton.textContent = i18nString(UIStrings.restoreButton);
          const handleNewRestore = (): void => {
            try {
              promptTextarea.value = options.defaultPrompt;
              statusIndicator.className = 'prompt-edit-status default';
              statusIndicator.textContent = i18nString(UIStrings.defaultPromptIndicator);
              
              options.onRestore();
              showStatus(i18nString(UIStrings.promptRestored), 'success');
              newRestoreButton.style.display = 'none';
            } catch (error) {
              console.error('Failed to restore prompt:', error);
              showStatus('Failed to restore prompt', 'error');
              if (options.onError) {
                options.onError(error as Error);
              }
            }
          };
          
          newRestoreButton.addEventListener('click', handleNewRestore);
          this.cleanupFunctions.push(() => newRestoreButton.removeEventListener('click', handleNewRestore));
          buttonContainer.insertBefore(newRestoreButton, cancelButton);
          restoreButton = newRestoreButton;
        } else {
          restoreButton.style.display = 'inline-block';
        }
      } catch (error) {
        console.error('Failed to save prompt:', error);
        showStatus('Failed to save prompt', 'error');
        if (options.onError) {
          options.onError(error as Error);
        }
      }
    };
    
    saveButton.addEventListener('click', handleSave);
    this.cleanupFunctions.push(() => saveButton.removeEventListener('click', handleSave));
    buttonContainer.appendChild(saveButton);

    // Add keyboard event handling
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      }
    };
    
    dialog.contentElement.addEventListener('keydown', handleKeyDown);
    this.cleanupFunctions.push(() => dialog.contentElement.removeEventListener('keydown', handleKeyDown));

    // Show dialog and focus textarea
    dialog.show();
    promptTextarea.focus();
    promptTextarea.setSelectionRange(0, 0);
  }

  static close(): void {
    if (this.activeDialog) {
      // Run all cleanup functions
      for (const cleanup of this.cleanupFunctions) {
        cleanup();
      }
      this.cleanupFunctions = [];
      
      this.activeDialog.hide();
      this.activeDialog = null;
    }
  }
}