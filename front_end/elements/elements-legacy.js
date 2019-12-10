// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsModule from './elements.js';

self.Elements = self.Elements || {};
Elements = Elements || {};

/** @constructor */
Elements.ClassesPaneWidget = ElementsModule.ClassesPaneWidget.ClassesPaneWidget;

/** @constructor */
Elements.ClassesPaneWidget.ButtonProvider = ElementsModule.ClassesPaneWidget.ButtonProvider;

/** @constructor */
Elements.ClassesPaneWidget.ClassNamePrompt = ElementsModule.ClassesPaneWidget.ClassNamePrompt;

/** @constructor */
Elements.ColorSwatchPopoverIcon = ElementsModule.ColorSwatchPopoverIcon.ColorSwatchPopoverIcon;

/** @constructor */
Elements.BezierPopoverIcon = ElementsModule.ColorSwatchPopoverIcon.BezierPopoverIcon;

/** @constructor */
Elements.ShadowSwatchPopoverHelper = ElementsModule.ColorSwatchPopoverIcon.ShadowSwatchPopoverHelper;

/** @constructor */
Elements.ComputedStyleModel = ElementsModule.ComputedStyleModel.ComputedStyleModel;

/** @enum {symbol} */
Elements.ComputedStyleModel.Events = ElementsModule.ComputedStyleModel.Events;

/** @constructor */
Elements.ComputedStyleModel.ComputedStyle = ElementsModule.ComputedStyleModel.ComputedStyle;

/** @constructor */
Elements.ComputedStyleWidget = ElementsModule.ComputedStyleWidget.ComputedStyleWidget;

Elements.DOMLinkifier = {};

Elements.DOMLinkifier.decorateNodeLabel = ElementsModule.DOMLinkifier.decorateNodeLabel;
Elements.DOMLinkifier.linkifyNodeReference = ElementsModule.DOMLinkifier.linkifyNodeReference;
Elements.DOMLinkifier.linkifyDeferredNodeReference = ElementsModule.DOMLinkifier.linkifyDeferredNodeReference;

/** @constructor */
Elements.DOMLinkifier.Linkifier = ElementsModule.DOMLinkifier.Linkifier;

Elements.DOMPath = {};

Elements.DOMPath.fullQualifiedSelector = ElementsModule.DOMPath.fullQualifiedSelector;
Elements.DOMPath.cssPath = ElementsModule.DOMPath.cssPath;
Elements.DOMPath.canGetJSPath = ElementsModule.DOMPath.canGetJSPath;
Elements.DOMPath.jsPath = ElementsModule.DOMPath.jsPath;
Elements.DOMPath.xPath = ElementsModule.DOMPath.xPath;

/** @constructor */
Elements.DOMPath.Step = ElementsModule.DOMPath.Step;

/** @constructor */
Elements.ElementStatePaneWidget = ElementsModule.ElementStatePaneWidget.ElementStatePaneWidget;

/** @constructor */
Elements.ElementStatePaneWidget.ButtonProvider = ElementsModule.ElementStatePaneWidget.ButtonProvider;

/** @constructor */
Elements.ElementsBreadcrumbs = ElementsModule.ElementsBreadcrumbs.ElementsBreadcrumbs;

/** @enum {symbol} */
Elements.ElementsBreadcrumbs.Events = ElementsModule.ElementsBreadcrumbs.Events;

/** @constructor */
Elements.ElementsPanel = ElementsModule.ElementsPanel.ElementsPanel;

// Sniffed in tests.
Elements.ElementsPanel._firstInspectElementCompletedForTest = function() {};

/** @constructor */
Elements.ElementsPanel.ContextMenuProvider = ElementsModule.ElementsPanel.ContextMenuProvider;

/** @constructor */
Elements.ElementsPanel.DOMNodeRevealer = ElementsModule.ElementsPanel.DOMNodeRevealer;

/** @constructor */
Elements.ElementsPanel.CSSPropertyRevealer = ElementsModule.ElementsPanel.CSSPropertyRevealer;

/** @constructor */
Elements.ElementsActionDelegate = ElementsModule.ElementsPanel.ElementsActionDelegate;

/** @constructor */
Elements.ElementsPanel.PseudoStateMarkerDecorator = ElementsModule.ElementsPanel.PseudoStateMarkerDecorator;

/** @constructor */
Elements.ElementsSidebarPane = ElementsModule.ElementsSidebarPane.ElementsSidebarPane;

/** @constructor */
Elements.ElementsTreeElement = ElementsModule.ElementsTreeElement.ElementsTreeElement;

Elements.ElementsTreeElement.HrefSymbol = ElementsModule.ElementsTreeElement.HrefSymbol;
Elements.ElementsTreeElement.InitialChildrenLimit = ElementsModule.ElementsTreeElement.InitialChildrenLimit;
Elements.ElementsTreeElement.ForbiddenClosingTagElements =
    ElementsModule.ElementsTreeElement.ForbiddenClosingTagElements;
Elements.ElementsTreeElement.EditTagBlacklist = ElementsModule.ElementsTreeElement.EditTagBlacklist;

/** @constructor */
Elements.ElementsTreeElementHighlighter = ElementsModule.ElementsTreeElementHighlighter.ElementsTreeElementHighlighter;

/** @constructor */
Elements.ElementsTreeOutline = ElementsModule.ElementsTreeOutline.ElementsTreeOutline;

Elements.ElementsTreeOutline.MappedCharToEntity = ElementsModule.ElementsTreeOutline.MappedCharToEntity;

/** @constructor */
Elements.ElementsTreeOutline.UpdateRecord = ElementsModule.ElementsTreeOutline.UpdateRecord;

/** @constructor */
Elements.ElementsTreeOutline.Renderer = ElementsModule.ElementsTreeOutline.Renderer;

/** @constructor */
Elements.ElementsTreeOutline.ShortcutTreeElement = ElementsModule.ElementsTreeOutline.ShortcutTreeElement;

/** @constructor */
Elements.EventListenersWidget = ElementsModule.EventListenersWidget.EventListenersWidget;

Elements.EventListenersWidget.DispatchFilterBy = ElementsModule.EventListenersWidget.DispatchFilterBy;

/** @constructor */
Elements.InspectElementModeController = ElementsModule.InspectElementModeController.InspectElementModeController;

/** @constructor */
Elements.InspectElementModeController.ToggleSearchActionDelegate =
    ElementsModule.InspectElementModeController.ToggleSearchActionDelegate;

Elements.inspectElementModeController = ElementsModule.InspectElementModeController.inspectElementModeController;

/** @interface */
Elements.MarkerDecorator = ElementsModule.MarkerDecorator.MarkerDecorator;

Elements.GenericDecorator = ElementsModule.MarkerDecorator.GenericDecorator;

/** @constructor */
Elements.MetricsSidebarPane = ElementsModule.MetricsSidebarPane.MetricsSidebarPane;

/** @constructor */
Elements.NodeStackTraceWidget = ElementsModule.NodeStackTraceWidget.NodeStackTraceWidget;

Elements.NodeStackTraceWidget.MaxLengthForLinks = ElementsModule.NodeStackTraceWidget.MaxLengthForLinks;

/** @constructor */
Elements.PlatformFontsWidget = ElementsModule.PlatformFontsWidget.PlatformFontsWidget;

/** @constructor */
Elements.PropertiesWidget = ElementsModule.PropertiesWidget.PropertiesWidget;

/** @constructor */
Elements.StylePropertyHighlighter = ElementsModule.StylePropertyHighlighter.StylePropertyHighlighter;

/** @constructor */
Elements.StylePropertyTreeElement = ElementsModule.StylePropertyTreeElement.StylePropertyTreeElement;

Elements.StylePropertyTreeElement.ActiveSymbol = ElementsModule.StylePropertyTreeElement.ActiveSymbol;

/** @constructor */
Elements.StylesSidebarPane = ElementsModule.StylesSidebarPane.StylesSidebarPane;

/** @constructor */
Elements.StylesSidebarPane.CSSPropertyPrompt = ElementsModule.StylesSidebarPane.CSSPropertyPrompt;

/** @constructor */
Elements.StylesSidebarPane.ButtonProvider = ElementsModule.StylesSidebarPane.ButtonProvider;

/** @constructor */
Elements.SectionBlock = ElementsModule.StylesSidebarPane.SectionBlock;

/** @constructor */
Elements.StylePropertiesSection = ElementsModule.StylesSidebarPane.StylePropertiesSection;

/** @constructor */
Elements.BlankStylePropertiesSection = ElementsModule.StylesSidebarPane.BlankStylePropertiesSection;

/** @constructor */
Elements.KeyframePropertiesSection = ElementsModule.StylesSidebarPane.KeyframePropertiesSection;

/** @constructor */
Elements.StylesSidebarPropertyRenderer = ElementsModule.StylesSidebarPane.StylesSidebarPropertyRenderer;

/** @typedef {{cancel: function(), commit: function(), resize: function(), editor:!UI.TextEditor}} */
Elements.MultilineEditorController;

/** @typedef {{node: !SDK.DOMNode, isCut: boolean}} */
Elements.ElementsTreeOutline.ClipboardData;

/** @typedef {{
 *    expanded: boolean,
 *    hasChildren: boolean,
 *    isEditingName: boolean,
 *    originalProperty: (!SDK.CSSProperty|undefined),
 *    originalName: (string|undefined),
 *    originalValue: (string|undefined),
 *    previousContent: string
 *  }}
 */
Elements.StylePropertyTreeElement.Context;
