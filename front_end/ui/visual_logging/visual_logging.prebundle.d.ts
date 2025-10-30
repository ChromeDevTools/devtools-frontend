import type * as LoggableModule from './Loggable.js';
import * as LoggingConfig from './LoggingConfig.js';
export type Loggable = LoggableModule.Loggable;
export { DebugLoggingFormat, setVeDebuggingEnabled, setVeDebugLoggingEnabled } from './Debugging.js';
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
/**
 * Action visual elements are either buttons or menu items that trigger a given action. Use the
 * context to differentiate between different actions, and make sure that buttons and menu items
 * that have the same effect use the same context.
 *
 * Ideally the `action`s context should match the ID of an `UI.ActionRegistration.Action`.
 */
export declare const action: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const adorner: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const animationClip: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const badge: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const bezierCurveEditor: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const bezierPresetCategory: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const breakpointMarker: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const canvas: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const close: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const colorEyeDropper: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const counter: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
/**
 * Visual element to denote a moveable control point such as the ones exist in BezierEditor
 * for bezier control points or keyframes in AnimationUI.
 */
export declare const controlPoint: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const cssColorMix: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const cssRuleHeader: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const deviceModeRuler: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const domBreakpoint: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const drawer: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const dropDown: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const elementsBreadcrumbs: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const expand: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const filterDropdown: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const gutter: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const dialog: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const item: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const key: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
/**
 * Visual element to denote a hyper link. Use the context to differentiate between various types
 * of hyperlinks.
 */
export declare const link: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const mediaInspectorView: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const menu: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const metricsBox: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const paletteColorShades: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const pane: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
/**
 * Visual element to denote a top level panel, no matter if that panel is shown in the main
 * view or in the drawer. Use the context to differentiate between different panels, but ensure
 * that the context used here matches the context used for its corresponding {@link panelTabHeader}.
 */
export declare const panel: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const panelTabHeader: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const pieChart: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const pieChartSlice: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const pieChartTotal: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const popover: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const preview: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const resizer: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const responsivePresets: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const showStyleEditor: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const slider: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const section: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const sectionHeader: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const tableRow: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const tableCell: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const tableHeader: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
/**
 * Visual element to denote text input fields. Use the context to differentiate between various
 * inputs fields.
 *
 * For text fields that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the visual elements' context.
 */
export declare const textField: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const timeline: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
/**
 * Togglable visual elements are checkboxes, radio buttons, or (binary) combo boxes. Use the
 * context to differentiate between different toggles.
 *
 * For toggles that control `Common.Settings.Setting`s, make sure to use the name of the
 * setting as the toggle context.
 */
export declare const toggle: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const toolbar: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const toggleSubpane: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const tree: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const treeItem: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
export declare const value: (context?: string | undefined) => LoggingConfig.ConfigStringBuilder;
