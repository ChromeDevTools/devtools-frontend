// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EmulationModule from './emulation.js';

self.Emulation = self.Emulation || {};
Emulation = Emulation || {};

/**
 * @constructor
 */
Emulation.AdvancedApp = EmulationModule.AdvancedApp.AdvancedApp;

/**
 * @constructor
 */
Emulation.AdvancedAppProvider = EmulationModule.AdvancedApp.AdvancedAppProvider;

/**
 * @constructor
 */
Emulation.DeviceModeModel = EmulationModule.DeviceModeModel.DeviceModeModel;

/** @enum {string} */
Emulation.DeviceModeModel.Events = EmulationModule.DeviceModeModel.Events;

/** @enum {string} */
Emulation.DeviceModeModel.Type = EmulationModule.DeviceModeModel.Type;

/** @enum {string} */
Emulation.DeviceModeModel.UA = EmulationModule.DeviceModeModel.UA;

Emulation.DeviceModeModel.MinDeviceSize = EmulationModule.DeviceModeModel.MinDeviceSize;
Emulation.DeviceModeModel.MaxDeviceSize = EmulationModule.DeviceModeModel.MaxDeviceSize;
Emulation.DeviceModeModel.MinDeviceScaleFactor = EmulationModule.DeviceModeModel.MinDeviceScaleFactor;
Emulation.DeviceModeModel.MaxDeviceScaleFactor = EmulationModule.DeviceModeModel.MaxDeviceScaleFactor;
Emulation.DeviceModeModel.MaxDeviceNameLength = EmulationModule.DeviceModeModel.MaxDeviceNameLength;
Emulation.DeviceModeModel.defaultMobileScaleFactor = EmulationModule.DeviceModeModel.defaultMobileScaleFactor;

/**
 * @constructor
 */
Emulation.DeviceModeToolbar = EmulationModule.DeviceModeToolbar.DeviceModeToolbar;

/**
 * @constructor
 */
Emulation.DeviceModeView = EmulationModule.DeviceModeView.DeviceModeView;

/**
 * @constructor
 */
Emulation.DeviceModeView.Ruler = EmulationModule.DeviceModeView.Ruler;

/**
 * @constructor
 */
Emulation.DeviceModeWrapper = EmulationModule.DeviceModeWrapper.DeviceModeWrapper;

/**
 * @constructor
 */
Emulation.DeviceModeWrapper.ActionDelegate = EmulationModule.DeviceModeWrapper.ActionDelegate;

/**
 * @constructor
 */
Emulation.DevicesSettingsTab = EmulationModule.DevicesSettingsTab.DevicesSettingsTab;

/**
 * @constructor
 */
Emulation.EmulatedDevice = EmulationModule.EmulatedDevices.EmulatedDevice;

Emulation.EmulatedDevice.Horizontal = EmulationModule.EmulatedDevices.Horizontal;
Emulation.EmulatedDevice.Vertical = EmulationModule.EmulatedDevices.Vertical;
Emulation.EmulatedDevice.Type = EmulationModule.EmulatedDevices.Type;
Emulation.EmulatedDevice.Capability = EmulationModule.EmulatedDevices.Capability;

/**
 * @constructor
 */
Emulation.EmulatedDevicesList = EmulationModule.EmulatedDevices.EmulatedDevicesList;

/** @enum {symbol} */
Emulation.EmulatedDevicesList.Events = EmulationModule.EmulatedDevices.Events;

/**
 * @constructor
 */
Emulation.GeolocationsSettingsTab = EmulationModule.GeolocationsSettingsTab.GeolocationsSettingsTab;

/**
 * @constructor
 */
Emulation.InspectedPagePlaceholder = EmulationModule.InspectedPagePlaceholder.InspectedPagePlaceholder;

Emulation.InspectedPagePlaceholder.instance = EmulationModule.InspectedPagePlaceholder.instance;

/** @enum {symbol} */
Emulation.InspectedPagePlaceholder.Events = EmulationModule.InspectedPagePlaceholder.Events;

/**
 * @constructor
 */
Emulation.MediaQueryInspector = EmulationModule.MediaQueryInspector.MediaQueryInspector;

/**
 * @enum {number}
 */
Emulation.MediaQueryInspector.Section = EmulationModule.MediaQueryInspector.Section;

/**
 * @constructor
 */
Emulation.MediaQueryInspector.MediaQueryUIModel = EmulationModule.MediaQueryInspector.MediaQueryUIModel;

/**
 * @constructor
 */
Emulation.SensorsView = EmulationModule.SensorsView.SensorsView;

/** @enum {string} */
Emulation.SensorsView.DeviceOrientationModificationSource =
    EmulationModule.SensorsView.DeviceOrientationModificationSource;

/** {string} */
Emulation.SensorsView.NonPresetOptions = EmulationModule.SensorsView.NonPresetOptions;

/** @type {!Array.<{title: string, value: !Array.<{title: string, orientation: string}>}>} */
Emulation.SensorsView.PresetOrientations = EmulationModule.SensorsView.PresetOrientations;

/**
 * @constructor
 */
Emulation.SensorsView.ShowActionDelegate = EmulationModule.SensorsView.ShowActionDelegate;
Emulation.SensorsView.ShiftDragOrientationSpeed = EmulationModule.SensorsView.ShiftDragOrientationSpeed;

/** @typedef {!{title: string, orientation: string, insets: !UI.Insets, image: ?string}} */
Emulation.EmulatedDevice.Mode;

/** @typedef {!{width: number, height: number, outlineInsets: ?UI.Insets, outlineImage: ?string}} */
Emulation.EmulatedDevice.Orientation;

/** @typedef {{title: string, lat: number, long: number}} */
Emulation.GeolocationsSettingsTab.Item;
