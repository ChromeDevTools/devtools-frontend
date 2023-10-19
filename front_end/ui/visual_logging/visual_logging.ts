// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LoggingConfig from './LoggingConfig.js';
import * as LoggingDriver from './LoggingDriver.js';
import * as LoggingState from './LoggingState.js';

const {startLogging, stopLogging} = LoggingDriver;
const {registerContextProvider, registerParentProvider} = LoggingState;

const accessibilityComputedProperties =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilityComputedProperties');
const accessibilityPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilityPane');
const accessibilitySourceOrder = LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilitySourceOrder');
const addElementClassPrompt = LoggingConfig.makeConfigStringBuilder.bind(null, 'AddElementClassPrompt');
const addStylesRule = LoggingConfig.makeConfigStringBuilder.bind(null, 'AddStylesRule');
const ariaAttributes = LoggingConfig.makeConfigStringBuilder.bind(null, 'AriaAttributes');
const cssLayersPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'CssLayersPane');
const domBreakpoint = LoggingConfig.makeConfigStringBuilder.bind(null, 'DOMBreakpoint');
const domBreakpointsPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'DOMBreakpointsPane');
const dropDownButton = LoggingConfig.makeConfigStringBuilder.bind(null, 'DropDownButton');
const elementClassesPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'ElementClassesPane');
const elementPropertiesPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'ElementPropertiesPane');
const elementStatesPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'ElementStatesPan');
const eventListenersPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'EventListenersPane');
const filterDropdown = LoggingConfig.makeConfigStringBuilder.bind(null, 'FilterDropdown');
const filterTextField = LoggingConfig.makeConfigStringBuilder.bind(null, 'FilterTextField');
const jumpToSource = LoggingConfig.makeConfigStringBuilder.bind(null, 'JumpToSource');
const metricsBox = LoggingConfig.makeConfigStringBuilder.bind(null, 'MetricsBox');
const metricsBoxPart = LoggingConfig.makeConfigStringBuilder.bind(null, 'MetricsBoxPart');
const refresh = LoggingConfig.makeConfigStringBuilder.bind(null, 'Refresh');
const showAllStyleProperties = LoggingConfig.makeConfigStringBuilder.bind(null, 'ShowAllStyleProperties');
const stylePropertiesSection = LoggingConfig.makeConfigStringBuilder.bind(null, 'StylePropertiesSection');
const stylePropertiesSectionSeparator =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'StylePropertiesSectionSeparator');
const stylesMetricsPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'StylesMetricsPane');
const stylesPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'StylesPane');
const stylesSelector = LoggingConfig.makeConfigStringBuilder.bind(null, 'StylesSelector');
const toggle = LoggingConfig.makeConfigStringBuilder.bind(null, 'Toggle');
const toggleSubpane = LoggingConfig.makeConfigStringBuilder.bind(null, 'ToggleSubpane');
const treeItem = LoggingConfig.makeConfigStringBuilder.bind(null, 'TreeItem');
const treeItemExpand = LoggingConfig.makeConfigStringBuilder.bind(null, 'TreeItemExpand');

export {
  startLogging,
  stopLogging,
  registerContextProvider,
  registerParentProvider,

  accessibilityComputedProperties,
  accessibilityPane,
  accessibilitySourceOrder,
  addElementClassPrompt,
  addStylesRule,
  ariaAttributes,
  cssLayersPane,
  domBreakpoint,
  domBreakpointsPane,
  dropDownButton,
  elementClassesPane,
  elementPropertiesPane,
  elementStatesPane,
  eventListenersPane,
  filterDropdown,
  filterTextField,
  jumpToSource,
  metricsBox,
  metricsBoxPart,
  refresh,
  showAllStyleProperties,
  stylePropertiesSection,
  stylePropertiesSectionSeparator,
  stylesMetricsPane,
  stylesPane,
  stylesSelector,
  toggle,
  toggleSubpane,
  treeItem,
  treeItemExpand,
};
