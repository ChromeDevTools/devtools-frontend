// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ObjectUIModule from './object_ui.js';

self.ObjectUI = self.ObjectUI || {};
ObjectUI = ObjectUI || {};

/** @constructor */
ObjectUI.CustomPreviewComponent = ObjectUIModule.CustomPreviewComponent.CustomPreviewComponent;

/** @constructor */
ObjectUI.JavaScriptAutocomplete = ObjectUIModule.JavaScriptAutocomplete.JavaScriptAutocomplete;

/** @constructor */
ObjectUI.JavaScriptAutocompleteConfig = ObjectUIModule.JavaScriptAutocomplete.JavaScriptAutocompleteConfig;

ObjectUI.javaScriptAutocomplete = ObjectUIModule.javaScriptAutocomplete;

/** @constructor */
ObjectUI.JavaScriptREPL = ObjectUIModule.JavaScriptREPL.JavaScriptREPL;

ObjectUI.JavaScriptREPL._MaxLengthForEvaluation = ObjectUIModule.JavaScriptREPL.MaxLengthForEvaluation;

/** @constructor */
ObjectUI.ObjectPopoverHelper = ObjectUIModule.ObjectPopoverHelper.ObjectPopoverHelper;

ObjectUI.ArrayGroupingTreeElement = ObjectUIModule.ObjectPropertiesSection.ArrayGroupingTreeElement;

/** @constructor */
ObjectUI.ExpandableTextPropertyValue = ObjectUIModule.ObjectPropertiesSection.ExpandableTextPropertyValue;

/** @constructor */
ObjectUI.ObjectPropertiesSection = ObjectUIModule.ObjectPropertiesSection.ObjectPropertiesSection;

ObjectUI.ObjectPropertiesSection._maxRenderableStringLength =
    ObjectUIModule.ObjectPropertiesSection.maxRenderableStringLength;

/** @constructor */
ObjectUI.ObjectPropertiesSectionsTreeOutline =
    ObjectUIModule.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;

/**
 * @constructor
 */
ObjectUI.ObjectPropertiesSection.RootElement = ObjectUIModule.ObjectPropertiesSection.RootElement;

/**
 * @constructor
 */
ObjectUI.ObjectPropertiesSection.Renderer = ObjectUIModule.ObjectPropertiesSection.Renderer;

/** @constructor */
ObjectUI.ObjectPropertyTreeElement = ObjectUIModule.ObjectPropertiesSection.ObjectPropertyTreeElement;

/** @constructor */
ObjectUI.ObjectPropertyPrompt = ObjectUIModule.ObjectPropertiesSection.ObjectPropertyPrompt;

/** @constructor */
ObjectUI.ObjectPropertiesSectionsTreeExpandController =
    ObjectUIModule.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;

/** @constructor */
ObjectUI.RemoteObjectPreviewFormatter = ObjectUIModule.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;
