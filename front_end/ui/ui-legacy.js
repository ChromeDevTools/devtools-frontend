// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UIModule from './ui.js';

self.UI = self.UI || {};
UI = UI || {};

UI.ARIAUtils = UIModule.ARIAUtils;

/** @constructor */
UI.Action = UIModule.Action.Action;

/** @enum {symbol} */
UI.Action.Events = UIModule.Action.Events;

/** @interface */
UI.ActionDelegate = UIModule.ActionDelegate.ActionDelegate;

/** @constructor */
UI.ActionRegistry = UIModule.ActionRegistry.ActionRegistry;

/** @constructor */
UI.Context = UIModule.Context.Context;

/** @type {!UIModule.Context.Context} */
UI.context = new UIModule.Context.Context();

/** @interface */
UI.ContextFlavorListener = UIModule.ContextFlavorListener.ContextFlavorListener;

/** @constructor */
UI.ContextMenu = UIModule.ContextMenu.ContextMenu;

/**
 * @constructor
 */
UI.ContextMenuSection = UIModule.ContextMenu.Section;

/** @constructor */
UI.ContextSubMenu = UIModule.ContextMenu.SubMenu;

/**
 * @interface
 */
UI.ContextMenu.Provider = UIModule.ContextMenu.Provider;

/** @constructor */
UI.Dialog = UIModule.Dialog.Dialog;

/** @enum {symbol} */
UI.Dialog.OutsideTabIndexBehavior = UIModule.Dialog.OutsideTabIndexBehavior;

/** @constructor */
UI.DropTarget = UIModule.DropTarget.DropTarget;

UI.DropTarget.Type = UIModule.DropTarget.Type;

/** @constructor */
UI.EmptyWidget = UIModule.EmptyWidget.EmptyWidget;

/** @constructor */
UI.FilterBar = UIModule.FilterBar.FilterBar;

/** @interface */
UI.FilterUI = UIModule.FilterBar.FilterUI;

/** @constructor */
UI.TextFilterUI = UIModule.FilterBar.TextFilterUI;

/** @constructor */
UI.NamedBitSetFilterUI = UIModule.FilterBar.NamedBitSetFilterUI;

/** @constructor */
UI.CheckboxFilterUI = UIModule.FilterBar.CheckboxFilterUI;

/** @constructor */
UI.FilterSuggestionBuilder = UIModule.FilterSuggestionBuilder.FilterSuggestionBuilder;

/** @constructor */
UI.Fragment = UIModule.Fragment.Fragment;

UI.html = UIModule.Fragment.html;

UI.Geometry = {};

/**
 * @constructor
 */
UI.Geometry.Vector = UIModule.Geometry.Vector;

/**
 * @constructor
 */
UI.Geometry.Point = UIModule.Geometry.Point;

/**
 * @constructor
 */
UI.Geometry.CubicBezier = UIModule.Geometry.CubicBezier;

/**
 * @constructor
 */
UI.Geometry.EulerAngles = UIModule.Geometry.EulerAngles;

/**
 * @param {!UIModule.Geometry.Vector} u
 * @param {!UIModule.Geometry.Vector} v
 * @return {number}
 */
UI.Geometry.scalarProduct = UIModule.Geometry.scalarProduct;

/**
 * @param {!UIModule.Geometry.Vector} u
 * @param {!UIModule.Geometry.Vector} v
 * @return {!UIModule.Geometry.Vector}
 */
UI.Geometry.crossProduct = UIModule.Geometry.crossProduct;

/**
 * @param {!UIModule.Geometry.Vector} u
 * @param {!UIModule.Geometry.Vector} v
 * @return {!UIModule.Geometry.Vector}
 */
UI.Geometry.subtract = UIModule.Geometry.subtract;

/**
 * @param {!UIModule.Geometry.Vector} v
 * @param {!CSSMatrix} m
 * @return {!UIModule.Geometry.Vector}
 */
UI.Geometry.multiplyVectorByMatrixAndNormalize = UIModule.Geometry.multiplyVectorByMatrixAndNormalize;

/**
 * @param {!UIModule.Geometry.Vector} u
 * @param {!UIModule.Geometry.Vector} v
 * @return {number}
 */
UI.Geometry.calculateAngle = UIModule.Geometry.calculateAngle;

/**
 * @param {number} deg
 * @return {number}
 */
UI.Geometry.degreesToRadians = UIModule.Geometry.degreesToRadians;

/**
 * @param {number} rad
 * @return {number}
 */
UI.Geometry.radiansToDegrees = UIModule.Geometry.radiansToDegrees;

/** @constructor */
UI.Size = UIModule.Geometry.Size;

/** @constructor */
UI.Insets = UIModule.Geometry.Insets;

/** @constructor */
UI.Rect = UIModule.Geometry.Rect;

/**
 * @param {!CSSMatrix} matrix
 * @param {!Array.<number>} points
 * @param {{minX: number, maxX: number, minY: number, maxY: number}=} aggregateBounds
 * @return {!{minX: number, maxX: number, minY: number, maxY: number}}
 */
UI.Geometry.boundsForTransformedPoints = UIModule.Geometry.boundsForTransformedPoints;

/** @constructor */
UI.GlassPane = UIModule.GlassPane.GlassPane;

/** @enum {symbol} */
UI.GlassPane.PointerEventsBehavior = UIModule.GlassPane.PointerEventsBehavior;

/** @enum {symbol} */
UI.GlassPane.AnchorBehavior = UIModule.GlassPane.AnchorBehavior;

/** @enum {symbol} */
UI.GlassPane.SizeBehavior = UIModule.GlassPane.SizeBehavior;

/** @enum {symbol} */
UI.GlassPane.MarginBehavior = UIModule.GlassPane.MarginBehavior;

// Exported for layout tests.
UI.GlassPane._panes = UIModule.GlassPane.GlassPanePanes;

/** @constructor */
UI.HistoryInput = UIModule.HistoryInput.HistoryInput;

/** @constructor */
UI.Icon = UIModule.Icon.Icon;

/** @enum {!Icon.Descriptor} */
UI.Icon.Descriptors = UIModule.Icon.Descriptors;

/** @constructor */
UI.Infobar = UIModule.Infobar.Infobar;

/** @enum {string} */
UI.Infobar.Type = UIModule.Infobar.Type;

/** @constructor */
UI.InplaceEditor = UIModule.InplaceEditor.InplaceEditor;

/**
 * @constructor
 */
UI.InplaceEditor.Config = UIModule.InplaceEditor.Config;

/** @constructor */
UI.InspectorView = UIModule.InspectorView.InspectorView;

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
UI.InspectorView.ActionDelegate = UIModule.InspectorView.ActionDelegate;

/** @constructor */
UI.KeyboardShortcut = UIModule.KeyboardShortcut.KeyboardShortcut;

/**
 * Constants for encoding modifier key set as a bit mask.
 * @see #_makeKeyFromCodeAndModifiers
 */
UI.KeyboardShortcut.Modifiers = UIModule.KeyboardShortcut.Modifiers;

/** @type {!Object.<string, !UI.KeyboardShortcut.Key>} */
UI.KeyboardShortcut.Keys = UIModule.KeyboardShortcut.Keys;

/** @constructor */
UI.ListControl = UIModule.ListControl.ListControl;

/** @interface */
UI.ListDelegate = UIModule.ListControl.ListDelegate;

UI.ListMode = UIModule.ListControl.ListMode;

/** @constructor */
UI.ListModel = UIModule.ListModel.ListModel;

/** @enum {symbol} */
UI.ListModel.Events = UIModule.ListModel.Events;

/** @constructor */
UI.ListWidget = UIModule.ListWidget.ListWidget;

/**
 * @template T
 * @interface
 */
UI.ListWidget.Delegate = UIModule.ListWidget.Delegate;

/**
 * @constructor
 */
UI.ListWidget.Editor = UIModule.ListWidget.Editor;

/** @constructor */
UI.Panel = UIModule.Panel.Panel;

/** @constructor */
UI.PanelWithSidebar = UIModule.Panel.PanelWithSidebar;

// For testing.
UI.panels = {};

/** @constructor */
UI.PopoverHelper = UIModule.PopoverHelper.PopoverHelper;

/** @constructor */
UI.ProgressIndicator = UIModule.ProgressIndicator.ProgressIndicator;

/** @constructor */
UI.RemoteDebuggingTerminatedScreen = UIModule.RemoteDebuggingTerminatedScreen.RemoteDebuggingTerminatedScreen;

/** @constructor */
UI.ReportView = UIModule.ReportView.ReportView;

/**
 * @constructor
 */
UI.ReportView.Section = UIModule.ReportView.Section;

/** @constructor */
UI.ResizerWidget = UIModule.ResizerWidget.ResizerWidget;

/** @enum {symbol} */
UI.ResizerWidget.Events = UIModule.ResizerWidget.Events;

/** @constructor */
UI.RootView = UIModule.RootView.RootView;

/** @constructor */
UI.SearchableView = UIModule.SearchableView.SearchableView;

/**
 * @constructor
 */
UI.SearchableView.SearchConfig = UIModule.SearchableView.SearchConfig;

/** @interface */
UI.Searchable = UIModule.SearchableView.Searchable;

/** @interface */
UI.Replaceable = UIModule.SearchableView.Replaceable;

UI.SettingsUI = {};

/**
 * @interface
 */
UI.SettingUI = UIModule.SettingsUI.SettingUI;

/**
 * @param {string} name
 * @param {!Common.Setting} setting
 * @param {boolean=} omitParagraphElement
 * @param {string=} tooltip
 * @return {!Element}
 */
UI.SettingsUI.createSettingCheckbox = UIModule.SettingsUI.createSettingCheckbox;

/**
 * @param {!Element} input
 * @param {!Common.Setting} setting
 */
UI.SettingsUI.bindCheckbox = UIModule.SettingsUI.bindCheckbox;

/**
 * @param {string} name
 * @param {!Element} element
 * @return {!Element}
 */
UI.SettingsUI.createCustomSetting = UIModule.SettingsUI.createCustomSetting;

/**
 * @param {!Common.Setting} setting
 * @param {string=} subtitle
 * @return {?Element}
 */
UI.SettingsUI.createControlForSetting = UIModule.SettingsUI.createControlForSetting;

/** @constructor */
UI.ShortcutRegistry = UIModule.ShortcutRegistry.ShortcutRegistry;

/**
 * @unrestricted
 */
UI.ShortcutRegistry.ForwardedShortcut = UIModule.ShortcutRegistry.ForwardedShortcut;

/** @constructor */
UI.ShortcutsScreen = UIModule.ShortcutsScreen.ShortcutsScreen;

UI.ShortcutsScreen.SourcesPanelShortcuts = UIModule.ShortcutsScreen.SourcesPanelShortcuts;
UI.ShortcutsScreen.LayersPanelShortcuts = UIModule.ShortcutsScreen.LayersPanelShortcuts;

/** @constructor */
UI.SoftContextMenu = UIModule.SoftContextMenu.SoftContextMenu;

/** @constructor */
UI.SoftDropDown = UIModule.SoftDropDown.SoftDropDown;

/**
 * @interface
 * @template T
 */
UI.SoftDropDown.Delegate = UIModule.SoftDropDown.Delegate;

/** @constructor */
UI.SplitWidget = UIModule.SplitWidget.SplitWidget;

UI.SplitWidget.ShowMode = UIModule.SplitWidget.ShowMode;

/** @enum {symbol} */
UI.SplitWidget.Events = UIModule.SplitWidget.Events;

/** @constructor */
UI.SuggestBox = UIModule.SuggestBox.SuggestBox;

/** @interface */
UI.SuggestBoxDelegate = UIModule.SuggestBox.SuggestBoxDelegate;

/** @constructor */
UI.SyntaxHighlighter = UIModule.SyntaxHighlighter.SyntaxHighlighter;

/** @constructor */
UI.TabbedPane = UIModule.TabbedPane.TabbedPane;

/** @enum {symbol} */
UI.TabbedPane.Events = UIModule.TabbedPane.Events;

/** @constructor */
UI.TabbedPaneTab = UIModule.TabbedPane.TabbedPaneTab;

/** @interface */
UI.TabbedPaneTabDelegate = UIModule.TabbedPane.TabbedPaneTabDelegate;

/** @constructor */
UI.TargetCrashedScreen = UIModule.TargetCrashedScreen.TargetCrashedScreen;

/** @interface */
UI.TextEditor = UIModule.TextEditor.TextEditor;

/** @interface */
UI.TextEditorFactory = UIModule.TextEditor.TextEditorFactory;

/** @enum {symbol} */
UI.TextEditor.Events = UIModule.TextEditor.Events;

/** @constructor */
UI.TextPrompt = UIModule.TextPrompt.TextPrompt;

/** @enum {symbol} */
UI.TextPrompt.Events = UIModule.TextPrompt.Events;

/** @constructor */
UI.ThrottledWidget = UIModule.ThrottledWidget.ThrottledWidget;

/** @constructor */
UI.Toolbar = UIModule.Toolbar.Toolbar;

/** @constructor */
UI.ToolbarItem = UIModule.Toolbar.ToolbarItem;

/** @constructor */
UI.ToolbarText = UIModule.Toolbar.ToolbarText;

/** @constructor */
UI.ToolbarButton = UIModule.Toolbar.ToolbarButton;

/** @constructor */
UI.ToolbarInput = UIModule.Toolbar.ToolbarInput;

/** @constructor */
UI.ToolbarToggle = UIModule.Toolbar.ToolbarToggle;

/** @constructor */
UI.ToolbarMenuButton = UIModule.Toolbar.ToolbarMenuButton;

/** @constructor */
UI.ToolbarSettingToggle = UIModule.Toolbar.ToolbarSettingToggle;

/** @constructor */
UI.ToolbarSeparator = UIModule.Toolbar.ToolbarSeparator;

/** @interface */
UI.ToolbarItem.Provider = UIModule.Toolbar.Provider;

/** @interface */
UI.ToolbarItem.ItemsProvider = UIModule.Toolbar.ItemsProvider;

/** @constructor */
UI.ToolbarComboBox = UIModule.Toolbar.ToolbarComboBox;

/** @constructor */
UI.ToolbarSettingComboBox = UIModule.Toolbar.ToolbarSettingComboBox;

/** @constructor */
UI.ToolbarCheckbox = UIModule.Toolbar.ToolbarCheckbox;

/** @constructor */
UI.ToolbarSettingCheckbox = UIModule.Toolbar.ToolbarSettingCheckbox;

/** @constructor */
UI.Tooltip = UIModule.Tooltip.Tooltip;

// Exported for layout tests.
UI.Tooltip._symbol = UIModule.Tooltip.TooltipSymbol;

/** @constructor */
UI.TreeOutline = UIModule.TreeOutline.TreeOutline;

UI.TreeOutline.Events = UIModule.TreeOutline.Events;

/** @constructor */
UI.TreeElement = UIModule.TreeOutline.TreeElement;

/** @constructor */
UI.TreeOutlineInShadow = UIModule.TreeOutline.TreeOutlineInShadow;

UI.markAsFocusedByKeyboard = UIModule.UIUtils.markAsFocusedByKeyboard;

UI.elementIsFocusedByKeyboard = UIModule.UIUtils.elementIsFocusedByKeyboard;

UI.highlightedSearchResultClassName = UIModule.UIUtils.highlightedSearchResultClassName;
UI.highlightedCurrentSearchResultClassName = UIModule.UIUtils.highlightedCurrentSearchResultClassName;
UI.StyleValueDelimiters = UIModule.UIUtils.StyleValueDelimiters;
UI.MaxLengthForDisplayedURLs = UIModule.UIUtils.MaxLengthForDisplayedURLs;

/** @constructor */
UI.ElementFocusRestorer = UIModule.UIUtils.ElementFocusRestorer;

/** @constructor */
UI.LongClickController = UIModule.UIUtils.LongClickController;

/** @constructor */
UI.ThemeSupport = UIModule.UIUtils.ThemeSupport;

/** @constructor */
UI.MessageDialog = UIModule.UIUtils.MessageDialog;

/** @constructor */
UI.ConfirmDialog = UIModule.UIUtils.ConfirmDialog;

/** @constructor */
UI.CheckboxLabel = UIModule.UIUtils.CheckboxLabel;

/** @interface */
UI.Renderer = UIModule.UIUtils.Renderer;

UI.installDragHandle = UIModule.UIUtils.installDragHandle;
UI.isBeingEdited = UIModule.UIUtils.isBeingEdited;
UI.isEditing = UIModule.UIUtils.isEditing;
UI.markBeingEdited = UIModule.UIUtils.markBeingEdited;
UI.createReplacementString = UIModule.UIUtils.createReplacementString;
UI.handleElementValueModifications = UIModule.UIUtils.handleElementValueModifications;
UI.formatLocalized = UIModule.UIUtils.formatLocalized;
UI.openLinkExternallyLabel = UIModule.UIUtils.openLinkExternallyLabel;
UI.copyLinkAddressLabel = UIModule.UIUtils.copyLinkAddressLabel;
UI.anotherProfilerActiveLabel = UIModule.UIUtils.anotherProfilerActiveLabel;
UI.asyncStackTraceLabel = UIModule.UIUtils.asyncStackTraceLabel;
UI.installComponentRootStyles = UIModule.UIUtils.installComponentRootStyles;
UI.highlightSearchResult = UIModule.UIUtils.highlightSearchResult;
UI.highlightSearchResults = UIModule.UIUtils.highlightSearchResults;
UI.runCSSAnimationOnce = UIModule.UIUtils.runCSSAnimationOnce;
UI.highlightRangesWithStyleClass = UIModule.UIUtils.highlightRangesWithStyleClass;
UI.applyDomChanges = UIModule.UIUtils.applyDomChanges;
UI.revertDomChanges = UIModule.UIUtils.revertDomChanges;
UI.measurePreferredSize = UIModule.UIUtils.measurePreferredSize;
UI.startBatchUpdate = UIModule.UIUtils.startBatchUpdate;
UI.endBatchUpdate = UIModule.UIUtils.endBatchUpdate;
UI.invokeOnceAfterBatchUpdate = UIModule.UIUtils.invokeOnceAfterBatchUpdate;
UI.animateFunction = UIModule.UIUtils.animateFunction;
UI.initializeUIUtils = UIModule.UIUtils.initializeUIUtils;
UI.beautifyFunctionName = UIModule.UIUtils.beautifyFunctionName;
UI.createTextButton = UIModule.UIUtils.createTextButton;
UI.createInput = UIModule.UIUtils.createInput;
UI.createLabel = UIModule.UIUtils.createLabel;
UI.createRadioLabel = UIModule.UIUtils.createRadioLabel;
UI.createIconLabel = UIModule.UIUtils.createIconLabel;
UI.createSlider = UIModule.UIUtils.createSlider;
UI.bindInput = UIModule.UIUtils.bindInput;
UI.trimText = UIModule.UIUtils.trimText;
UI.trimTextMiddle = UIModule.UIUtils.trimTextMiddle;
UI.trimTextEnd = UIModule.UIUtils.trimTextEnd;
UI.measureTextWidth = UIModule.UIUtils.measureTextWidth;
UI.createDocumentationLink = UIModule.UIUtils.createDocumentationLink;
UI.loadImage = UIModule.UIUtils.loadImage;
UI.loadImageFromData = UIModule.UIUtils.loadImageFromData;
UI.createFileSelectorElement = UIModule.UIUtils.createFileSelectorElement;
UI.createInlineButton = UIModule.UIUtils.createInlineButton;
UI.formatTimestamp = UIModule.UIUtils.formatTimestamp;

UI.appendStyle = UIModule.Utils.appendStyle;
UI.createShadowRootWithCoreStyles = UIModule.Utils.createShadowRootWithCoreStyles;
UI.registerCustomElement = UIModule.Utils.registerCustomElement;

/** @interface */
UI.View = UIModule.View.View;

/** @public */
UI.View.widgetSymbol = UIModule.View.widgetSymbol;

/** @constructor */
UI.SimpleView = UIModule.View.SimpleView;

/** @interface */
UI.ViewLocation = UIModule.View.ViewLocation;

/** @interface */
UI.ViewLocationResolver = UIModule.View.ViewLocationResolver;

/** @constructor */
UI.ViewManager = UIModule.ViewManager.ViewManager;

/** @constructor */
UI.ViewManager._ContainerWidget = UIModule.ViewManager.ContainerWidget;

/** @constructor */
UI.Widget = UIModule.Widget.Widget;

/** @constructor */
UI.HBox = UIModule.Widget.HBox;

/** @constructor */
UI.VBox = UIModule.Widget.VBox;

/** @constructor */
UI.WidgetFocusRestorer = UIModule.Widget.WidgetFocusRestorer;

/** @constructor */
UI.VBoxWithResizeCallback = UIModule.Widget.VBoxWithResizeCallback;

/** @constructor */
UI.XLink = UIModule.XLink.XLink;

/**
 * @implements {UI.ContextMenu.Provider}
 */
UI.XLink.ContextMenuProvider = UIModule.XLink.ContextMenuProvider;

/** @constructor */
UI.XWidget = UIModule.XWidget.XWidget;

/** @constructor */
UI.ZoomManager = UIModule.ZoomManager.ZoomManager;

/** @enum {symbol} */
UI.ZoomManager.Events = UIModule.ZoomManager.Events;

/** @type {!UI.ActionRegistry} */
UI.actionRegistry;

/** @typedef {{name: string, label: string, title: (string|undefined)}} */
UI.NamedBitSetFilterUI.Item;

/**
 * @typedef {!{
  *   template: !Element,
  *   binds: !Array<!UI.Fragment._Bind>
  * }}
  */
UI.Fragment._Template;

/**
  * @typedef {!{
  *   elementId: (string|undefined),
  *
  *   attr: (!{
  *     index: number,
  *     names: !Array<string>,
  *     values: !Array<string>
  *   }|undefined),
  *
  *   replaceNodeIndex: (number|undefined)
  * }}
  */
UI.Fragment._Bind;

/** @typedef {{position: string, spritesheet: string, isMask: (boolean|undefined), coordinates: ({x: number, y: number}|undefined), invert: (boolean|undefined)}} */
UI.Icon.Descriptor;

/** @typedef {{cellWidth: number, cellHeight: number, padding: number}} */
UI.Icon.SpriteSheet;

/**
 * @typedef {{cancel: function(), commit: function()}}
 */
UI.InplaceEditor.Controller;

/**
 * @type {!UI.InspectorView}
 */
UI.inspectorView;

/** @typedef {!{code: number, name: (string|!Object.<string, string>)}} */
UI.KeyboardShortcut.Key;

/** @typedef {!{key: number, name: string}} */
UI.KeyboardShortcut.Descriptor;

/** @typedef {{valid: boolean, errorMessage: (string|undefined)}} */
UI.ListWidget.ValidatorResult;

/** @typedef {{box: !AnchorBox, show:(function(!UI.GlassPane):!Promise<boolean>), hide:(function()|undefined)}} */
UI.PopoverRequest;

/** @type {!UI.ShortcutRegistry} */
UI.shortcutRegistry;

/**
 * We cannot initialize it here as localized strings are not loaded yet.
 * @type {!UI.ShortcutsScreen}
 */
UI.shortcutsScreen;

/** @typedef {{showMode: string, size: number}} */
UI.SplitWidget.SettingForOrientation;

/**
 * @typedef {{
  *      text: string,
  *      title: (string|undefined),
  *      subtitle: (string|undefined),
  *      iconType: (string|undefined),
  *      priority: (number|undefined),
  *      isSecondary: (boolean|undefined),
  *      subtitleRenderer: (function():!Element|undefined),
  *      selectionRange: ({startColumn: number, endColumn: number}|undefined),
  *      hideGhostText: (boolean|undefined)
  * }}
  */
UI.SuggestBox.Suggestion;

/**
  * @typedef {!Array<!UI.SuggestBox.Suggestion>}
  */
UI.SuggestBox.Suggestions;

/**
 * @typedef {{
  *  bracketMatchingSetting: (!Common.Setting|undefined),
  *  devtoolsAccessibleName: (string|undefined),
  *  lineNumbers: boolean,
  *  lineWrapping: boolean,
  *  mimeType: (string|undefined),
  *  autoHeight: (boolean|undefined),
  *  padBottom: (boolean|undefined),
  *  maxHighlightLength: (number|undefined),
  *  placeholder: (string|undefined)
  * }}
  */
UI.TextEditor.Options;

/**
  * @typedef {{
  *     substituteRangeCallback: ((function(number, number):?TextUtils.TextRange)|undefined),
  *     tooltipCallback: ((function(number, number):!Promise<?Element>)|undefined),
  *     suggestionsCallback: ((function(!TextUtils.TextRange, !TextUtils.TextRange, boolean=):?Promise.<!UI.SuggestBox.Suggestions>)|undefined),
  *     isWordChar: ((function(string):boolean)|undefined),
  *     anchorBehavior: (UI.GlassPane.AnchorBehavior|undefined)
  * }}
  */
UI.AutocompleteConfig;

/** @type {?UI.ThemeSupport} */
UI.themeSupport;

/** @typedef {!{title: (string|!Element|undefined), editable: (boolean|undefined) }} */
UI.Renderer.Options;

/**
 * @type {!UI.ViewManager}
 */
UI.viewManager;

/**
 * @type {!UI.ZoomManager}
 */
UI.zoomManager;
