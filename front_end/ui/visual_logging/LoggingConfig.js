// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import { knownContextValues } from './KnownContextValues.js';
const LOGGING_ATTRIBUTE = 'jslog';
export function needsLogging(element) {
    return element.hasAttribute(LOGGING_ATTRIBUTE);
}
export function getLoggingConfig(element) {
    return parseJsLog(element.getAttribute(LOGGING_ATTRIBUTE) || '');
}
export var VisualElements;
(function (VisualElements) {
    /* eslint-disable @typescript-eslint/naming-convention -- Indexed access. */
    VisualElements[VisualElements["TreeItem"] = 1] = "TreeItem";
    VisualElements[VisualElements["Close"] = 2] = "Close";
    VisualElements[VisualElements["Counter"] = 3] = "Counter";
    VisualElements[VisualElements["Drawer"] = 4] = "Drawer";
    VisualElements[VisualElements["Resizer"] = 5] = "Resizer";
    VisualElements[VisualElements["Toggle"] = 6] = "Toggle";
    VisualElements[VisualElements["Tree"] = 7] = "Tree";
    VisualElements[VisualElements["TextField"] = 8] = "TextField";
    VisualElements[VisualElements["AnimationClip"] = 9] = "AnimationClip";
    VisualElements[VisualElements["Section"] = 10] = "Section";
    VisualElements[VisualElements["SectionHeader"] = 11] = "SectionHeader";
    VisualElements[VisualElements["Timeline"] = 12] = "Timeline";
    VisualElements[VisualElements["CSSRuleHeader"] = 13] = "CSSRuleHeader";
    VisualElements[VisualElements["Expand"] = 14] = "Expand";
    VisualElements[VisualElements["ToggleSubpane"] = 15] = "ToggleSubpane";
    VisualElements[VisualElements["ControlPoint"] = 16] = "ControlPoint";
    VisualElements[VisualElements["Toolbar"] = 17] = "Toolbar";
    VisualElements[VisualElements["Popover"] = 18] = "Popover";
    VisualElements[VisualElements["BreakpointMarker"] = 19] = "BreakpointMarker";
    VisualElements[VisualElements["DropDown"] = 20] = "DropDown";
    VisualElements[VisualElements["Adorner"] = 21] = "Adorner";
    VisualElements[VisualElements["Gutter"] = 22] = "Gutter";
    VisualElements[VisualElements["MetricsBox"] = 23] = "MetricsBox";
    VisualElements[VisualElements["MetricsBoxPart"] = 24] = "MetricsBoxPart";
    VisualElements[VisualElements["Badge"] = 25] = "Badge";
    VisualElements[VisualElements["DOMBreakpoint"] = 26] = "DOMBreakpoint";
    /* 27 used to be ElementPropertiesPane, but free to grab now */
    /* 28 used to be EventListenersPane, but free to grab now */
    VisualElements[VisualElements["Action"] = 29] = "Action";
    VisualElements[VisualElements["FilterDropdown"] = 30] = "FilterDropdown";
    VisualElements[VisualElements["Dialog"] = 31] = "Dialog";
    VisualElements[VisualElements["BezierCurveEditor"] = 32] = "BezierCurveEditor";
    /* 33 used to be BezierEditor, but free to grab now */
    VisualElements[VisualElements["BezierPresetCategory"] = 34] = "BezierPresetCategory";
    VisualElements[VisualElements["Preview"] = 35] = "Preview";
    VisualElements[VisualElements["Canvas"] = 36] = "Canvas";
    VisualElements[VisualElements["ColorEyeDropper"] = 37] = "ColorEyeDropper";
    /* 38 used to be ColorPicker, but free to grab now */
    /* 39 used to be CopyColor, but free to grab now */
    /* 40 used to be CssAngleEditor, but free to grab now */
    /* 41 used to be CssFlexboxEditor, but free to grab now */
    /* 42 used to be CssGridEditor, but free to grab now */
    /* 43 used to be CssShadowEditor, but free to grab now */
    VisualElements[VisualElements["Link"] = 44] = "Link";
    /* 45 used to be Next, but free to grab now */
    VisualElements[VisualElements["Item"] = 46] = "Item";
    VisualElements[VisualElements["PaletteColorShades"] = 47] = "PaletteColorShades";
    VisualElements[VisualElements["Panel"] = 48] = "Panel";
    /* 49 used to be Previous, but free to grab now */
    VisualElements[VisualElements["ShowStyleEditor"] = 50] = "ShowStyleEditor";
    VisualElements[VisualElements["Slider"] = 51] = "Slider";
    VisualElements[VisualElements["CssColorMix"] = 52] = "CssColorMix";
    VisualElements[VisualElements["Value"] = 53] = "Value";
    VisualElements[VisualElements["Key"] = 54] = "Key";
    /* 55 used to be GridSettings, but free to grab now */
    /* 56 used to be FlexboxOverlays, but free to grab now */
    /* 57 used to be GridOverlays, but free to grab now */
    /* 58 used to be JumpToElement, but free to grab now */
    VisualElements[VisualElements["PieChart"] = 59] = "PieChart";
    VisualElements[VisualElements["PieChartSlice"] = 60] = "PieChartSlice";
    VisualElements[VisualElements["PieChartTotal"] = 61] = "PieChartTotal";
    VisualElements[VisualElements["ElementsBreadcrumbs"] = 62] = "ElementsBreadcrumbs";
    /* 63 used to be FullAccessibilityTree, but free to grab now */
    /* 64 used to be ToggleDeviceMode, but free to grab now */
    /* 65 used to be ToggleElementSearch, but free to grab now */
    VisualElements[VisualElements["PanelTabHeader"] = 66] = "PanelTabHeader";
    VisualElements[VisualElements["Menu"] = 67] = "Menu";
    VisualElements[VisualElements["TableRow"] = 68] = "TableRow";
    VisualElements[VisualElements["TableHeader"] = 69] = "TableHeader";
    VisualElements[VisualElements["TableCell"] = 70] = "TableCell";
    /* 71 used to be StylesComputedPane, but free to grab now */
    VisualElements[VisualElements["Pane"] = 72] = "Pane";
    VisualElements[VisualElements["ResponsivePresets"] = 73] = "ResponsivePresets";
    VisualElements[VisualElements["DeviceModeRuler"] = 74] = "DeviceModeRuler";
    VisualElements[VisualElements["MediaInspectorView"] = 75] = "MediaInspectorView";
    /* eslint-enable @typescript-eslint/naming-convention */
})(VisualElements || (VisualElements = {}));
function resolveVe(ve) {
    return VisualElements[ve] ?? 0;
}
const reportedUnknownVeContext = new Set();
function checkContextValue(context) {
    if (typeof context !== 'string' || !context.length || knownContextValues.has(context) ||
        reportedUnknownVeContext.has(context)) {
        return;
    }
    if (Root.Runtime.Runtime.queryParam('debugFrontend') || Host.InspectorFrontendHost.isUnderTest() ||
        localStorage.getItem('veDebugLoggingEnabled') === "Test" /* DebugLoggingFormat.TEST */) {
        const stack = (new Error().stack || '').split('\n').slice(3).join('\n');
        console.error(`Unknown VE context: ${context}${stack}`);
    }
    reportedUnknownVeContext.add(context);
}
export function parseJsLog(jslog) {
    const components = jslog.replace(/ /g, '').split(';');
    const getComponent = (name) => components.find(c => c.startsWith(name))?.substr(name.length);
    const ve = resolveVe(components[0]);
    if (ve === 0) {
        throw new Error('Unkown VE: ' + jslog);
    }
    const config = { ve };
    const context = getComponent('context:');
    if (context?.trim().length) {
        checkContextValue(context);
        config.context = context;
    }
    const parent = getComponent('parent:');
    if (parent) {
        config.parent = parent;
    }
    const trackString = getComponent('track:');
    if (trackString) {
        config.track = {};
        for (const track of trackString.split(',')) {
            if (track.startsWith('keydown:')) {
                config.track.keydown = track.substr('keydown:'.length);
            }
            else {
                config.track[track] = true;
            }
        }
    }
    return config;
}
export function makeConfigStringBuilder(veName, context) {
    const components = [veName];
    if (typeof context === 'string' && context.trim().length) {
        components.push(`context: ${context}`);
        checkContextValue(context);
    }
    return {
        context: function (value) {
            if (typeof value === 'number' || typeof value === 'string' && value.length) {
                components.push(`context: ${value}`);
            }
            checkContextValue(context);
            return this;
        },
        parent: function (value) {
            components.push(`parent: ${value}`);
            return this;
        },
        track: function (options) {
            components.push(`track: ${Object.entries(options).map(([key, value]) => value !== true ? `${key}: ${value}` : key).join(', ')}`);
            return this;
        },
        toString: function () {
            return components.join('; ');
        },
    };
}
//# sourceMappingURL=LoggingConfig.js.map