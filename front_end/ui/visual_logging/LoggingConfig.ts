// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const LOGGING_ATTRIBUTE = 'jslog';

export interface LoggingConfig {
  ve: number;
  track?: Map<string, string|undefined>;
  context?: string;
  parent?: string;
}

export function needsLogging(element: Element): boolean {
  return element.hasAttribute(LOGGING_ATTRIBUTE);
}

export function getLoggingConfig(element: Element): LoggingConfig {
  return parseJsLog(element.getAttribute(LOGGING_ATTRIBUTE) || '');
}

export enum VisualElements {
  TreeItem = 1,
  Close = 2,
  Counter = 3,
  Drawer = 4,
  Resizer = 5,
  Toggle = 6,
  Tree = 7,
  TextField = 8,
  AnimationClip = 9,
  Section = 10,
  SectionHeader = 11,
  Timeline = 12,
  StylesSelector = 13,
  Expand = 14,
  ToggleSubpane = 15,
  ControlPoint = 16,
  Toolbar = 17,
  Popover = 18,
  BreakpointMarker = 19,
  DropDown = 20,
  Adorner = 21,
  /* 22 used to be JumpToSource, but free to grab now */
  MetricsBox = 23,
  MetricsBoxPart = 24,
  /* 25 used to be DOMBreakpointsPane, but free to grab now */
  DOMBreakpoint = 26,
  /* 27 used to be ElementPropertiesPane, but free to grab now */
  /* 28 used to be EventListenersPane, but free to grab now */
  Action = 29,
  FilterDropdown = 30,
  Dialog = 31,
  BezierCurveEditor = 32,
  /* 33 used to be BezierEditor, but free to grab now */
  BezierPresetCategory = 34,
  Preview = 35,
  Canvas = 36,
  ColorEyeDropper = 37,
  /* 38 used to be ColorPicker, but free to grab now */
  /* 39 used to be CopyColor, but free to grab now */
  /* 40 used to be CssAngleEditor, but free to grab now */
  /* 41 used to be CssFlexboxEditor, but free to grab now */
  /* 42 used to be CssGridEditor, but free to grab now */
  /* 43 used to be CssShadowEditor, but free to grab now */
  Link = 44,
  /* 45 used to be Next, but free to grab now */
  Item = 46,
  PaletteColorShades = 47,
  Panel = 48,
  /* 49 used to be Previous, but free to grab now */
  ShowStyleEditor = 50,
  Slider = 51,
  CssColorMix = 52,
  Value = 53,
  Key = 54,
  /* 55 used to be GridSettings, but free to grab now */
  /* 56 used to be FlexboxOverlays, but free to grab now */
  /* 57 used to be GridOverlays, but free to grab now */
  /* 58 used to be JumpToElement, but free to grab now */
  PieChart = 59,
  PieChartSlice = 60,
  PieChartTotal = 61,
  ElementsBreadcrumbs = 62,
  /* 63 used to be FullAccessibilityTree, but free to grab now */
  /* 64 used to be ToggleDeviceMode, but free to grab now */
  /* 65 used to be ToggleElementSearch, but free to grab now */
  PanelTabHeader = 66,
  Menu = 67,
  /* 68 used to be DeveloperResourcesPanel, but free to grab now */
  TableHeader = 69,
  TableCell = 70,
  /* 71 used to be StylesComputedPane, but free to grab now */
  Pane = 72,
  ResponsivePresets = 73,
  DeviceModeRuler = 74,
  MediaInspectorView = 75,
}

export type VisualElementName = keyof typeof VisualElements;

function resolveVe(ve: string): number {
  return VisualElements[ve as VisualElementName] ?? 0;
}

export function parseJsLog(jslog: string): LoggingConfig {
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
  /**
   * Specifies an optional context for the visual element. For string contexts
   * the convention is to use kebap case (e.g. `foo-bar`).
   *
   * @param value Optional context, which can be either a string or a number.
   * @returns The builder itself.
   */
  context: (value: string|number|undefined) => ConfigStringBuilder;

  /**
   * Speficies the name of a `ParentProvider` used to lookup the parent visual element.
   *
   * @param value The name of a previously registered `ParentProvider`.
   * @returns The builder itself.
   */
  parent: (value: string) => ConfigStringBuilder;

  /**
   * Specifies which DOM events to track for this visual element.
   *
   * @param options The set of DOM events to track.
   * @returns The builder itself.
   */
  track: (options: {
    click?: boolean,
    dblclick?: boolean,
    hover?: boolean,
    drag?: boolean,
    change?: boolean,
    keydown?: boolean|string,
    resize?: boolean,
  }) => ConfigStringBuilder;

  /**
   * Serializes the configuration into a `jslog` string.
   *
   * @returns The serialized string value to put on a DOM element via the `jslog` attribute.
   */
  toString: () => string;
}

export function makeConfigStringBuilder(veName: VisualElementName, context?: string): ConfigStringBuilder {
  const components: string[] = [veName];
  if (typeof context !== 'undefined') {
    components.push(`context: ${context}`);
  }
  return {
    context: function(value: string|number|undefined): ConfigStringBuilder {
      if (typeof value !== 'undefined') {
        components.push(`context: ${value}`);
      }
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
      resize?: boolean,
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
