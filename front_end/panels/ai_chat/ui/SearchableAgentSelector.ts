// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
import type { AgentConfig } from '../core/BaseOrchestratorAgent.js';

const {html, nothing, Decorators} = Lit;
const {customElement, property, state} = Decorators;

export interface SearchableAgentSelectorOptions {
  selectedAgentType: string | null;
  agentConfigs: {[key: string]: AgentConfig};
  onAgentSelect: (agentType: string) => void;
  onAddAgent?: () => void;
  onDeleteAgent?: (agentType: string) => void;
  onEditAgent?: (agentType: string) => void;
  showLabels?: boolean;
}

interface FilteredAgent {
  config: AgentConfig;
  matchScore: number;
  matchedText?: string;
}

@customElement('searchable-agent-selector')
export class SearchableAgentSelector extends Lit.LitElement {
  @property({type: String}) selectedAgentType: string | null = null;
  @property({type: Object}) agentConfigs: {[key: string]: AgentConfig} = {};
  @property({type: Boolean}) showLabels = false;
  
  @state() private searchQuery = '';
  @state() private isOpen = false;
  @state() private selectedIndex = -1;
  @state() private filteredAgents: FilteredAgent[] = [];

  // Callback properties
  onAgentSelect?: (agentType: string) => void;
  onAddAgent?: () => void;
  onDeleteAgent?: (agentType: string) => void;
  onEditAgent?: (agentType: string) => void;

  private searchInputRef?: HTMLInputElement;

  override firstUpdated(): void {
    this.updateFilteredAgents();
  }

  override updated(changedProperties: Map<string, any>): void {
    if (changedProperties.has('agentConfigs')) {
      this.updateFilteredAgents();
    }
    if (changedProperties.has('searchQuery')) {
      this.updateFilteredAgents();
      this.selectedIndex = -1;
    }
  }

  override render(): Lit.TemplateResult {
    const selectedAgent = this.selectedAgentType ? this.agentConfigs[this.selectedAgentType] : null;
    const displayText = selectedAgent ? selectedAgent.label : '';
    const placeholderText = selectedAgent ? '' : 'Search agents...';

    return html`
      <div class="searchable-agent-selector">
        <div class="search-container">
          <input
            type="text"
            class="agent-search-input"
            .value=${this.searchQuery || displayText}
            placeholder=${placeholderText}
            @input=${this.handleSearchInput}
            @focus=${this.handleInputFocus}
            @blur=${this.handleInputBlur}
            @keydown=${this.handleKeyDown}
            @click=${this.handleInputClick}
            aria-label="Search agents"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="search-icon">
            ${this.isOpen ? '▲' : '▼'}
          </div>
        </div>
        
        ${this.isOpen ? html`
          <div class="suggestions-dropdown" @click=${this.handleSuggestionClick}>
            ${this.filteredAgents.length > 0 ? 
              this.filteredAgents.map((item, index) => this.renderSuggestionItem(item, index)) :
              html`<div class="no-results">No agents found</div>`
            }
            ${this.onAddAgent ? html`
              <div class="suggestion-separator"></div>
              <div 
                class="suggestion-item add-agent-item"
                data-action="add"
                role="option"
                tabindex="-1"
              >
                <span class="suggestion-icon">+</span>
                <span class="suggestion-label">Add New Agent</span>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderSuggestionItem(item: FilteredAgent, index: number): Lit.TemplateResult {
    const { config } = item;
    const isSelected = this.selectedIndex === index;
    const isCurrentlySelected = this.selectedAgentType === config.type;
    const isCustomized = this.hasCustomPrompt(config.type);
    const isCustomAgent = !['shopping', 'default', 'deep-research'].includes(config.type);
    
    const itemClasses = [
      'suggestion-item',
      isSelected ? 'highlighted' : '',
      isCurrentlySelected ? 'selected' : '',
      isCustomized ? 'customized' : '',
      isCustomAgent ? 'custom-agent' : ''
    ].filter(Boolean).join(' ');

    return html`
      <div 
        class=${itemClasses}
        data-agent-type=${config.type}
        data-action="select"
        role="option"
        tabindex="-1"
        aria-selected=${isCurrentlySelected}
        title=${config.description || config.label}
        @dblclick=${() => this.handleEditAgent(config.type)}
      >
        <span class="suggestion-icon">${config.icon}</span>
        <span class="suggestion-label">${config.label}</span>
        ${isCustomized ? html`<span class="suggestion-indicator">●</span>` : nothing}
        ${isCustomAgent && this.onDeleteAgent ? html`
          <button 
            class="suggestion-delete"
            data-agent-type=${config.type}
            data-action="delete"
            title="Delete ${config.label}"
            @click=${(e: Event) => e.stopPropagation()}
            tabindex="-1"
          >
            ×
          </button>
        ` : nothing}
      </div>
    `;
  }

  private updateFilteredAgents(): void {
    const query = this.searchQuery.toLowerCase().trim();
    const allAgents = Object.values(this.agentConfigs);
    
    if (!query) {
      // No search query - show all agents
      this.filteredAgents = allAgents.map(config => ({
        config,
        matchScore: 1
      }));
    } else {
      // Filter and score agents based on search query
      this.filteredAgents = allAgents
        .map(config => {
          const labelMatch = config.label.toLowerCase().includes(query);
          const descMatch = config.description?.toLowerCase().includes(query);
          const typeMatch = config.type.toLowerCase().includes(query);
          
          if (!labelMatch && !descMatch && !typeMatch) {
            return null;
          }
          
          // Simple scoring: exact matches score higher
          let score = 0;
          if (config.label.toLowerCase().startsWith(query)) score += 10;
          if (config.label.toLowerCase().includes(query)) score += 5;
          if (config.description?.toLowerCase().includes(query)) score += 2;
          if (config.type.toLowerCase().includes(query)) score += 1;
          
          return {
            config,
            matchScore: score
          };
        })
        .filter((item): item is FilteredAgent => item !== null)
        .sort((a, b) => b.matchScore - a.matchScore);
    }
  }

  private handleSearchInput = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value;
    
    if (!this.isOpen && this.searchQuery) {
      this.openDropdown();
    }
  };

  private handleInputFocus = (): void => {
    this.openDropdown();
  };

  private handleInputBlur = (e: FocusEvent): void => {
    // Delay closing to allow clicks on suggestions
    setTimeout(() => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget || !this.contains(relatedTarget)) {
        this.closeDropdown();
      }
    }, 150);
  };

  private handleInputClick = (): void => {
    if (!this.isOpen) {
      this.openDropdown();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.navigateDown();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateUp();
        break;
      case 'Enter':
        e.preventDefault();
        this.selectCurrentItem();
        break;
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  };

  private handleSuggestionClick = (e: Event): void => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const item = target.closest('[data-action]') as HTMLElement;
    
    if (!item) return;

    const action = item.dataset.action;
    const agentType = item.dataset.agentType;

    switch (action) {
      case 'select':
        if (agentType) {
          this.selectAgent(agentType);
        }
        break;
      case 'add':
        this.onAddAgent?.();
        this.closeDropdown();
        break;
      case 'delete':
        if (agentType) {
          this.onDeleteAgent?.(agentType);
          // Keep dropdown open after delete
        }
        break;
    }
  };

  private navigateDown(): void {
    if (!this.isOpen) {
      this.openDropdown();
      return;
    }
    
    const maxIndex = this.filteredAgents.length - 1 + (this.onAddAgent ? 1 : 0);
    this.selectedIndex = Math.min(this.selectedIndex + 1, maxIndex);
  }

  private navigateUp(): void {
    if (!this.isOpen) return;
    
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
  }

  private selectCurrentItem(): void {
    if (!this.isOpen || this.selectedIndex === -1) return;
    
    if (this.selectedIndex < this.filteredAgents.length) {
      // Select agent
      const selectedAgent = this.filteredAgents[this.selectedIndex];
      this.selectAgent(selectedAgent.config.type);
    } else if (this.onAddAgent) {
      // Add new agent (last item)
      this.onAddAgent();
      this.closeDropdown();
    }
  }

  private selectAgent(agentType: string): void {
    this.selectedAgentType = agentType;
    this.searchQuery = '';
    this.onAgentSelect?.(agentType);
    this.closeDropdown();
  }

  private handleEditAgent(agentType: string): void {
    this.onEditAgent?.(agentType);
  }

  private openDropdown(): void {
    this.isOpen = true;
    this.selectedIndex = -1;
    this.addGlobalClickListener();
  }

  private closeDropdown(): void {
    this.isOpen = false;
    this.selectedIndex = -1;
    this.removeGlobalClickListener();
    
    // Clear search query if no agent is selected
    if (!this.selectedAgentType) {
      this.searchQuery = '';
    }
  }

  private addGlobalClickListener(): void {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!this.contains(target)) {
        this.closeDropdown();
      }
    };
    
    document.addEventListener('click', handler);
    this.cleanupFunctions.push(() => document.removeEventListener('click', handler));
  }

  private cleanupFunctions: (() => void)[] = [];

  private removeGlobalClickListener(): void {
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
  }

  private hasCustomPrompt(agentType: string): boolean {
    const customPrompts = localStorage.getItem('ai_chat_custom_prompts');
    if (!customPrompts) return false;
    
    try {
      const prompts = JSON.parse(customPrompts);
      return Boolean(prompts[agentType]);
    } catch {
      return false;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback?.();
    this.removeGlobalClickListener();
  }
}

// Helper function to create and render the searchable agent selector
export function renderSearchableAgentSelector(options: SearchableAgentSelectorOptions): Lit.TemplateResult {
  return html`
    <searchable-agent-selector
      .selectedAgentType=${options.selectedAgentType}
      .agentConfigs=${options.agentConfigs}
      .showLabels=${options.showLabels || false}
      .onAgentSelect=${options.onAgentSelect}
      .onAddAgent=${options.onAddAgent}
      .onDeleteAgent=${options.onDeleteAgent}
      .onEditAgent=${options.onEditAgent}
    ></searchable-agent-selector>
  `;
}