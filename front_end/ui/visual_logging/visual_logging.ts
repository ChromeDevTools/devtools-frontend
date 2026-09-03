// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Debugging from './Debugging.js';
import type * as LoggableModule from './Loggable.js';
import * as LoggingConfig from './LoggingConfig.js';
import * as LoggingDriver from './LoggingDriver.js';
import * as LoggingEvents from './LoggingEvents.js';
import * as NonDomState from './NonDomState.js';

export type Loggable = LoggableModule.Loggable;
export {DebugLoggingFormat, setVeDebuggingEnabled, setVeDebugLoggingEnabled} from './Debugging.js';
export {
  elementKey,
  getLoggingConfig,
  getVePath,
  type LoggingConfig,
  needsLogging,
  parseJsLog,
  VisualElements,
} from './LoggingConfig.js';
export {addDocument, startLogging, stopLogging} from './LoggingDriver.js';
export {logImpressions, logSettingAccess, logFunctionCall} from './LoggingEvents.js';
export const logClick = (loggable: Loggable, event: Event, options: {doubleClick?: boolean} = {}): void =>
    LoggingEvents.logClick(LoggingDriver.clickLogThrottler)(loggable, event, options);

export const logResize = (l: Loggable, s: DOMRect): void => LoggingEvents.logResize(l, s);
export const logKeyDown = async(l: Loggable|null, e: Event, context?: string): Promise<void> =>
    await LoggingEvents.logKeyDown(LoggingDriver.keyboardLogThrottler)(l, e, context);
export {registerParentProvider, setMappedParent} from './LoggingState.js';

export function registerLoggable(loggable: Loggable, config: string, parent: Loggable|null, size: DOMRect): void {
  if (!LoggingDriver.isLogging()) {
    return;
  }
  NonDomState.registerLoggable(loggable, LoggingConfig.parseJsLog(config), parent || undefined, size);
  void LoggingDriver.scheduleProcessing();
}

export async function isUnderInspection(origin?: string): Promise<boolean> {
  if (!origin) {
    return false;
  }
  const context = await LoggingEvents.contextAsNumber(origin);
  if (!context) {
    return false;
  }
  return [431010711, -1313957874, -1093325535].includes(context);
}

export function setHighlightedVe(veKey: string|null): void {
  Debugging.setHighlightedVe(veKey);
  if (veKey) {
    void LoggingDriver.process();
  }
}

export type VisualElementBuilder = (context?: string) => LoggingConfig.ConfigStringBuilder;

/**
 * Action visual elements are either buttons or menu items that trigger a given action. Use the
 * context to differentiate between different actions, and make sure that buttons and menu items
 * that have the same effect use the same context.
 *
 * Ideally the `action`s context should match the ID of an `UI.ActionRegistration.Action`.
 */
export const action: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Action');
export const adorner: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Adorner');
export const animationClip: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'AnimationClip');
export const badge: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Badge');
export const bezierCurveEditor: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'BezierCurveEditor');
export const bezierPresetCategory: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'BezierPresetCategory');
export const breakpointMarker: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'BreakpointMarker');
export const canvas: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Canvas');
export const close: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Close');
export const colorEyeDropper: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'ColorEyeDropper');
export const counter: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Counter');
/**
 * Visual element to denote a moveable control point such as the ones exist in BezierEditor
 * for bezier control points or keyframes in AnimationUI.
 */
export const controlPoint: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'ControlPoint');
export const cssColorMix: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'CssColorMix');
export const cssRuleHeader: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'CSSRuleHeader');
export const deviceModeRuler: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'DeviceModeRuler');
export const dialog: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Dialog');
export const domBreakpoint: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'DOMBreakpoint');
export const drawer: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Drawer');
export const dropDown: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'DropDown');
export const elementsBreadcrumbs: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'ElementsBreadcrumbs');
export const expand: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Expand');
export const filterDropdown: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'FilterDropdown');
export const gutter: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Gutter');
export const item: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Item');
export const key: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Key');

/**
 * Visual element to denote a hyper link. Use the context to differentiate between various types
 * of hyperlinks.
 */
export const link: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Link');

export const mediaInspectorView: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'MediaInspectorView');
export const menu: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Menu');
export const metricsBox: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'MetricsBox');
export const paletteColorShades: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'PaletteColorShades');
export const pane: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Pane');

/**
 * Visual element to denote a top level panel, no matter if that panel is shown in the main
 * view or in the drawer. Use the context to differentiate between different panels, but ensure
 * that the context used here matches the context used for its corresponding {@link panelTabHeader}.
 */
export const panel: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Panel');

export const panelTabHeader: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'PanelTabHeader');
export const pieChart: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'PieChart');
export const pieChartSlice: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'PieChartSlice');
export const pieChartTotal: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'PieChartTotal');
export const popover: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Popover');
export const preview: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Preview');
export const resizer: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Resizer');
export const responsivePresets: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'ResponsivePresets');
export const showStyleEditor: VisualElementBuilder =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'ShowStyleEditor');
export const slider: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Slider');
export const section: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Section');
export const sectionHeader: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'SectionHeader');
export const tableRow: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'TableRow');
export const tableCell: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'TableCell');
export const tableHeader: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'TableHeader');

/**
 * Visual element to denote text input fields. Use the context to differentiate between various
 * inputs fields.
 *
 * For text fields that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the visual elements' context.
 */
export const textField: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'TextField');
export const timeline: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Timeline');

/**
 * Togglable visual elements are checkboxes, radio buttons, or (binary) combo boxes. Use the
 * context to differentiate between different toggles.
 *
 * For toggles that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the toggle context.
 */
export const toggle: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Toggle');
export const toggleSubpane: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'ToggleSubpane');
export const toolbar: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Toolbar');
export const tree: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Tree');
export const treeItem: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'TreeItem');
export const value: VisualElementBuilder = LoggingConfig.makeConfigStringBuilder.bind(null, 'Value');
