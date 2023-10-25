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
  ToggleSubpane = 15,
  ElementClassesPane = 16,
  AddElementClassPrompt = 17,
  ElementStatesPan = 18,
  CssLayersPane = 19,
  DropDown = 20,
  StylesMetricsPane = 21,
  JumpToSource = 22,
  MetricsBox = 23,
  MetricsBoxPart = 24,
  DOMBreakpointsPane = 25,
  DOMBreakpoint = 26,
  ElementPropertiesPane = 27,
  EventListenersPane = 28,
  Refresh = 29,
  FilterDropdown = 30,
  AddColor = 31,
  BezierCurveEditor = 32,
  BezierEditor = 33,
  BezierPresetCategory = 34,
  BezierPreview = 35,
  ColorCanvas = 36,
  ColorEyeDropper = 37,
  ColorPicker = 38,
  CopyColor = 39,
  CssAngleEditor = 40,
  CssFlexboxEditor = 41,
  CssGridEditor = 42,
  CssShadowEditor = 43,
  Link = 44,
  Next = 45,
  Item = 46,
  PaletteColorShades = 47,
  PalettePanel = 48,
  Previous = 49,
  ShowStyleEditor = 50,
  Slider = 51,
  CssColorMix = 52,
  Value = 53,
  Key = 54,
  GridSettings = 55,
  FlexboxOverlays = 56,
  GridOverlays = 57,
  JumpToElement = 58,
  ElementsPanel = 59,
  ElementsTreeOutline = 60,
  Toolbar = 61,
  ElementsBreadcrumbs = 62,
  FullAccessibilityTree = 63,
  ToggleDeviceMode = 64,
  ToggleElementSearch = 65,
  PanelTabHeader = 66,
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
  track: (options: {
    click?: boolean,
    dblclick?: boolean,
    hover?: boolean,
    drag?: boolean,
    change?: boolean,
    keydown?: boolean|string,
  }) => ConfigStringBuilder;
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
    track: function(options: {
      click?: boolean,
      dblclick?: boolean,
      hover?: boolean,
      drag?: boolean,
      change?: boolean,
      keydown?: boolean|string,
    }): ConfigStringBuilder {
      components.push(`track: ${
          Object.entries(options).map(([key, value]) => value !== true ? `${key}: ${value}` : key).join(', ')}`);
      return this;
    },
    toString: function(): string {
      return components.join('; ');
    },
  };
}
