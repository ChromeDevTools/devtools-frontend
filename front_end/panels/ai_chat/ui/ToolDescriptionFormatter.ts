// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Interface for tool description formatting result
 */
export interface ToolDescriptionData {
  isMultiLine: boolean;
  content: string | Array<{key: string; value: string}>;
  action: string;
}

/**
 * Utility class for formatting tool descriptions and icons
 * Extracted from ChatView to be reusable across components
 */
export class ToolDescriptionFormatter {
  /**
   * Get tool icon based on tool name
   */
  static getToolIcon(toolName: string): string {
    if (toolName.includes('search')) return '🔍';
    if (toolName.includes('browse') || toolName.includes('navigate')) return '🌐';
    if (toolName.includes('create') || toolName.includes('write')) return '📝';
    if (toolName.includes('extract') || toolName.includes('analyze')) return '🔬';
    if (toolName.includes('click') || toolName.includes('action')) return '👆';
    if (toolName.includes('screenshot')) return '📸';
    if (toolName.includes('accessibility') || toolName.includes('tree')) return '🌳';
    if (toolName.includes('thinking') || toolName.includes('sequential')) return '🧠';
    if (toolName.includes('fetch') || toolName.includes('download')) return '📥';
    if (toolName.includes('scroll')) return '📜';
    if (toolName.includes('type') || toolName.includes('input')) return '⌨️';
    return '🔧';
  }

  /**
   * Format value for display - convert objects to YAML-like format
   */
  static formatValueForDisplay(value: any, depth: number = 0): string {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[Max depth reached]';
    }
    
    if (value === null || value === undefined) {
      return String(value);
    }
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length === 1) return this.formatValueForDisplay(value[0], depth + 1);
      return value.map(item => `- ${this.formatValueForDisplay(item, depth + 1)}`).join('\n');
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      
      return keys.map(key => {
        const childValue = this.formatValueForDisplay(value[key], depth + 1);
        return `${key}: ${childValue}`;
      }).join('\n');
    }
    
    return String(value);
  }

  /**
   * Get tool description from name and args
   */
  static getToolDescription(toolName: string, args: any): ToolDescriptionData {
    const action = toolName.replace(/_/g, ' ').toLowerCase();
    
    // Filter out common metadata fields
    const filteredArgs = Object.fromEntries(
      Object.entries(args).filter(([key]) => 
        key !== 'reasoning' && key !== 'toolCallId' && key !== 'timestamp'
      )
    );
    
    const argKeys = Object.keys(filteredArgs);
    
    if (argKeys.length === 0) {
      return { isMultiLine: false, content: action, action };
    }
    
    if (argKeys.length === 1) {
      // Single argument - inline format
      const [key, value] = Object.entries(filteredArgs)[0];
      const formattedValue = this.formatValueForDisplay(value);
      const needsNewline = formattedValue.length > 80;
      return { isMultiLine: false, content: `${action}:${needsNewline ? '\n' : ' '}${formattedValue}`, action };
    }
    
    // Multiple arguments - return structured data for multi-line rendering
    // Sort to put 'query' first if it exists
    const sortedKeys = argKeys.sort((a, b) => {
      if (a === 'query') return -1;
      if (b === 'query') return 1;
      return 0;
    });
    
    const structuredContent = sortedKeys.map(key => ({
      key,
      value: this.formatValueForDisplay(filteredArgs[key])
    }));
    
    return { isMultiLine: true, content: structuredContent, action };
  }

  /**
   * Filter metadata fields from tool arguments
   */
  static filterMetadataFields(args: any): any {
    return Object.fromEntries(
      Object.entries(args).filter(([key]) => 
        key !== 'reasoning' && key !== 'toolCallId' && key !== 'timestamp'
      )
    );
  }

  /**
   * Format tool name for display (replace underscores with spaces)
   */
  static formatToolName(toolName: string): string {
    return toolName.replace(/_/g, ' ');
  }

  /**
   * Get readable action name from tool name
   */
  static getActionName(toolName: string): string {
    return toolName.replace(/_/g, ' ').toLowerCase();
  }
}