// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const LOGGING_ATTRIBUTE = 'jslog';

export interface LoggingConfig {
  ve: number;
  track?: Map<string, string>;
  context?: string;
  parent?: string;
}

export function needsLogging(element: Element): boolean {
  return element.hasAttribute(LOGGING_ATTRIBUTE);
}

export function getLoggingConfig(element: Element): LoggingConfig {
  return parseJsLog(element.getAttribute(LOGGING_ATTRIBUTE) || '');
}

// eslint-disable-next-line rulesdir/const_enum
enum VisualElements {
  TreeItem = 1,
  AriaAttributes = 2,
  AccessibilityComputedProperties = 3,
  AccessibilityPane = 4,
  AccessibilitySourceOrder = 5,
  Toggle = 6,
  AddStylesRule = 7,
  FilterTextField = 8,
  ShowAllStyleProperties = 9,
  StylePropertiesSection = 10,
  StylePropertiesSectionSeparator = 11,
  StylesPane = 12,
  StylesSelector = 13,
  TreeItemExpand = 14,
}

function resolveVe(ve: string): number {
  return VisualElements[ve as keyof typeof VisualElements] || 0;
}

function parseJsLog(jslog: string): LoggingConfig {
  const components = jslog.replace(/ /g, '').split(';');
  const getComponent = (name: string): string|undefined =>
      components.find(c => c.startsWith(name))?.substr(name.length);
  const ve = resolveVe(components[0]);
  if (ve === 0) {
    throw new Error('Unkown VE: ' + jslog);
  }
  const config: LoggingConfig = {ve};
  const context = getComponent('context:');
  if (context) {
    config.context = context;
  }

  const parent = getComponent('parent:');
  if (parent) {
    config.parent = parent;
  }

  const trackString = getComponent('track:');
  if (trackString) {
    config.track = new Map<string, string>(trackString.split(',').map(t => t.split(':') as [string, string]));
  }

  return config;
}

export interface ConfigStringBuilder {
  context: (value: string|number) => ConfigStringBuilder;
  parent: (value: string) => ConfigStringBuilder;
  track: (options: {click?: boolean, change?: boolean, keydown?: boolean|string}) => ConfigStringBuilder;
  toString: () => string;
}

export function makeConfigStringBuilder(veName: string): ConfigStringBuilder {
  const components = [veName];
  return {
    context: function(value: string|number): ConfigStringBuilder {
      components.push(`context: ${value}`);
      return this;
    },
    parent: function(value: string): ConfigStringBuilder {
      components.push(`parent: ${value}`);
      return this;
    },
    track: function(options: {click?: boolean, change?: boolean, keydown?: boolean|string}): ConfigStringBuilder {
      components.push(`track: ${
          Object.entries(options).map(([key, value]) => value !== true ? `${key}: ${value}` : key).join(', ')}`);
      return this;
    },
    toString: function(): string {
      return components.join('; ');
    },
  };
}
