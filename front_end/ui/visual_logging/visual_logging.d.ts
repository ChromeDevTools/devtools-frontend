import type * as LoggableModule from './Loggable.js';
import * as LoggingConfig from './LoggingConfig.js';
export type Loggable = LoggableModule.Loggable;
export { DebugLoggingFormat, setVeDebuggingEnabled, setVeDebugLoggingEnabled } from './Debugging.js';
export { elementKey, getLoggingConfig, getVePath, type LoggingConfig, needsLogging, parseJsLog, VisualElements, } from './LoggingConfig.js';
export { addDocument, startLogging, stopLogging } from './LoggingDriver.js';
export { logImpressions, logSettingAccess, logFunctionCall } from './LoggingEvents.js';
export declare const logClick: (loggable: Loggable, event: Event, options?: {
    doubleClick?: boolean;
}) => void;
export declare const logResize: (l: Loggable, s: DOMRect) => void;
export declare const logKeyDown: (l: Loggable | null, e: Event, context?: string) => Promise<void>;
export { registerParentProvider, setMappedParent } from './LoggingState.js';
export declare function registerLoggable(loggable: Loggable, config: string, parent: Loggable | null, size: DOMRect): void;
export declare function isUnderInspection(origin?: string): Promise<boolean>;
export declare function setHighlightedVe(veKey: string | null): void;
export type VisualElementBuilder = (context?: string) => LoggingConfig.ConfigStringBuilder;
/**
 * Action visual elements are either buttons or menu items that trigger a given action. Use the
 * context to differentiate between different actions, and make sure that buttons and menu items
 * that have the same effect use the same context.
 *
 * Ideally the `action`s context should match the ID of an `UI.ActionRegistration.Action`.
 */
export declare const action: VisualElementBuilder;
export declare const adorner: VisualElementBuilder;
export declare const animationClip: VisualElementBuilder;
export declare const badge: VisualElementBuilder;
export declare const bezierCurveEditor: VisualElementBuilder;
export declare const bezierPresetCategory: VisualElementBuilder;
export declare const breakpointMarker: VisualElementBuilder;
export declare const canvas: VisualElementBuilder;
export declare const close: VisualElementBuilder;
export declare const colorEyeDropper: VisualElementBuilder;
export declare const counter: VisualElementBuilder;
/**
 * Visual element to denote a moveable control point such as the ones exist in BezierEditor
 * for bezier control points or keyframes in AnimationUI.
 */
export declare const controlPoint: VisualElementBuilder;
export declare const cssColorMix: VisualElementBuilder;
export declare const cssRuleHeader: VisualElementBuilder;
export declare const deviceModeRuler: VisualElementBuilder;
export declare const dialog: VisualElementBuilder;
export declare const domBreakpoint: VisualElementBuilder;
export declare const drawer: VisualElementBuilder;
export declare const dropDown: VisualElementBuilder;
export declare const elementsBreadcrumbs: VisualElementBuilder;
export declare const expand: VisualElementBuilder;
export declare const filterDropdown: VisualElementBuilder;
export declare const gutter: VisualElementBuilder;
export declare const item: VisualElementBuilder;
export declare const key: VisualElementBuilder;
/**
 * Visual element to denote a hyper link. Use the context to differentiate between various types
 * of hyperlinks.
 */
export declare const link: VisualElementBuilder;
export declare const mediaInspectorView: VisualElementBuilder;
export declare const menu: VisualElementBuilder;
export declare const metricsBox: VisualElementBuilder;
export declare const paletteColorShades: VisualElementBuilder;
export declare const pane: VisualElementBuilder;
/**
 * Visual element to denote a top level panel, no matter if that panel is shown in the main
 * view or in the drawer. Use the context to differentiate between different panels, but ensure
 * that the context used here matches the context used for its corresponding {@link panelTabHeader}.
 */
export declare const panel: VisualElementBuilder;
export declare const panelTabHeader: VisualElementBuilder;
export declare const pieChart: VisualElementBuilder;
export declare const pieChartSlice: VisualElementBuilder;
export declare const pieChartTotal: VisualElementBuilder;
export declare const popover: VisualElementBuilder;
export declare const preview: VisualElementBuilder;
export declare const resizer: VisualElementBuilder;
export declare const responsivePresets: VisualElementBuilder;
export declare const showStyleEditor: VisualElementBuilder;
export declare const slider: VisualElementBuilder;
export declare const section: VisualElementBuilder;
export declare const sectionHeader: VisualElementBuilder;
export declare const tableRow: VisualElementBuilder;
export declare const tableCell: VisualElementBuilder;
export declare const tableHeader: VisualElementBuilder;
/**
 * Visual element to denote text input fields. Use the context to differentiate between various
 * inputs fields.
 *
 * For text fields that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the visual elements' context.
 */
export declare const textField: VisualElementBuilder;
export declare const timeline: VisualElementBuilder;
/**
 * Togglable visual elements are checkboxes, radio buttons, or (binary) combo boxes. Use the
 * context to differentiate between different toggles.
 *
 * For toggles that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the toggle context.
 */
export declare const toggle: VisualElementBuilder;
export declare const toggleSubpane: VisualElementBuilder;
export declare const toolbar: VisualElementBuilder;
export declare const tree: VisualElementBuilder;
export declare const treeItem: VisualElementBuilder;
export declare const value: VisualElementBuilder;
