// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';

function createSettingValue(
    category: Common.Settings.SettingCategory, settingName: string, defaultValue: unknown,
    settingType = Common.Settings.SettingType.BOOLEAN): Common.Settings.SettingRegistration {
  return {category, settingName, defaultValue, settingType};
}

export function stubNoopSettings() {
  sinon.stub(Common.Settings.Settings, 'instance').returns({
    createSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
    moduleSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
    createLocalSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
  } as unknown as Common.Settings.Settings);
}

export const DEFAULT_SETTING_REGISTRATIONS_FOR_TEST = [
  createSettingValue(
      Common.Settings.SettingCategory.ADORNER, 'adorner-settings', [], Common.Settings.SettingType.ARRAY),
  createSettingValue(Common.Settings.SettingCategory.APPEARANCE, 'disable-paused-state-overlay', false),
  createSettingValue(
      Common.Settings.SettingCategory.APPEARANCE, 'sidebar-position', 'auto', Common.Settings.SettingType.ENUM),
  createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'custom-formatters', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-exception-enabled', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-caught-exception', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-uncaught-exception', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'disable-async-stack-traces', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'breakpoints-active', true),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'java-script-disabled', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'skip-content-scripts', true),
  createSettingValue(
      Common.Settings.SettingCategory.DEBUGGER, 'automatically-ignore-list-known-third-party-scripts', true),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'skip-anonymous-scripts', false),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'enable-ignore-listing', true),
  createSettingValue(
      Common.Settings.SettingCategory.DEBUGGER, 'skip-stack-frames-pattern',
      '/node_modules/|^node:', Common.Settings.SettingType.REGEX),
  createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'navigator-group-by-folder', true),
  createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'dom-word-wrap', true),
  createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-detailed-inspect-tooltip', true),
  createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-html-comments', true),
  createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-ua-shadow-dom', false),
  createSettingValue(Common.Settings.SettingCategory.PERFORMANCE, 'annotations-hidden', false),
  createSettingValue(Common.Settings.SettingCategory.NETWORK, 'cache-disabled', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'avif-format-disabled', false),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-color-scheme', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-forced-colors', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-motion', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-contrast', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-data', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-transparency', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-color-gamut', '',
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-vision-deficiency', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulated-os-text-scale', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.RENDERING, 'emulate-auto-dark-mode', '', Common.Settings.SettingType.ENUM),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'local-fonts-disabled', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-paint-rects', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-layout-shift-regions', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-ad-highlights', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-debug-borders', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-fps-counter', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-scroll-bottleneck-rects', false),
  createSettingValue(Common.Settings.SettingCategory.RENDERING, 'webp-format-disabled', false),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'allow-scroll-past-eof', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'css-source-maps-enabled', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'inline-variable-values', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'auto-pretty-print-minified', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'js-source-maps-enabled', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'show-whitespaces-in-editor', 'none'),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'sources.word-wrap', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-autocompletion', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-auto-detect-indent', false),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-bracket-closing', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-bracket-matching', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-code-folding', true),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-indent', '    '),
  createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-tab-moves-focus', false),
  createSettingValue(
      Common.Settings.SettingCategory.EMULATION, 'emulation.touch', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.EMULATION, 'emulation.idle-detection', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.EMULATION, 'emulation.cpu-pressure', '', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.GRID, 'show-grid-line-labels', 'none', Common.Settings.SettingType.ENUM),
  createSettingValue(Common.Settings.SettingCategory.GRID, 'extend-grid-lines', true),
  createSettingValue(Common.Settings.SettingCategory.GRID, 'show-grid-areas', true),
  createSettingValue(Common.Settings.SettingCategory.GRID, 'show-grid-track-sizes', true),
  createSettingValue(Common.Settings.SettingCategory.NONE, 'active-keybind-set', '', Common.Settings.SettingType.ENUM),
  createSettingValue(Common.Settings.SettingCategory.NONE, 'user-shortcuts', [], Common.Settings.SettingType.ARRAY),
  createSettingValue(
      Common.Settings.SettingCategory.APPEARANCE, 'help.show-release-note', true, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(Common.Settings.SettingCategory.NETWORK, 'request-blocking-enabled', false),
  createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'monitoring-xhr-enabled', false),
  createSettingValue(
      Common.Settings.SettingCategory.NONE, 'custom-network-conditions', [], Common.Settings.SettingType.ARRAY),
  createSettingValue(
      Common.Settings.SettingCategory.NONE, 'calibrated-cpu-throttling', [], Common.Settings.SettingType.BOOLEAN),
  createSettingValue(Common.Settings.SettingCategory.NONE, 'gdp.ai-conversation-count', 0),
  createSettingValue(
      Common.Settings.SettingCategory.APPEARANCE, 'ui-theme', 'systemPreferred', Common.Settings.SettingType.ENUM),
  createSettingValue(Common.Settings.SettingCategory.APPEARANCE, 'language', 'en-US', Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.PERSISTENCE, 'persistence-network-overrides-enabled', true,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.NETWORK, 'network-log.preserve-log', true, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.NETWORK, 'network-log.record-log', true, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.SOURCES, 'network.enable-remote-file-loading', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'hide-network-messages', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'selected-context-filter-enabled', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-group-similar', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-shows-cors-errors', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-timestamps-enabled', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-insights-enabled', true, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-insights-onboarding-finished', true,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-history-autocomplete', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-autocomplete-on-enter', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'preserve-console-log', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-eager-eval', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-user-activation-eval', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-trace-expand', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.PERFORMANCE, 'flamechart-selected-navigation', false,
      Common.Settings.SettingType.ENUM),
  createSettingValue(
      Common.Settings.SettingCategory.ELEMENTS, 'show-css-property-documentation-on-hover', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.ACCOUNT, 'sync-preferences', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-assistance-enabled', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-annotations-enabled', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-assistance-history-entries', [], Common.Settings.SettingType.ARRAY),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-assistance-patching-fre-completed', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-code-completion-enabled', false, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.AI, 'ai-code-completion-teaser-dismissed', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.MOBILE, 'emulation.show-device-outline', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.APPEARANCE, 'chrome-theme-colors', true, Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.PERFORMANCE, 'timeline.user-had-shortcuts-dialog-opened-once', false,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.ELEMENTS, 'show-event-listeners-for-ancestors', true,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.ELEMENTS, 'highlight-node-on-hover-in-overlay', true,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'global-ai-button-click-count', 0),
  createSettingValue(Common.Settings.SettingCategory.ACCOUNT, 'receive-gdp-badges', false),
  createSettingValue(Common.Settings.SettingCategory.GLOBAL, 'currentDockState', 'right'),
  createSettingValue(
      Common.Settings.SettingCategory.CONSOLE, 'console-insight-teasers-enabled', true,
      Common.Settings.SettingType.BOOLEAN),
  createSettingValue(
      Common.Settings.SettingCategory.NETWORK, 'device-bound-sessions-preserve-log', false,
      Common.Settings.SettingType.BOOLEAN),
];

export function setupSettings(reset: boolean) {
  // Create the appropriate settings needed to boot.
  Common.Settings.registerSettingsForTest(DEFAULT_SETTING_REGISTRATIONS_FOR_TEST.slice(0), reset);
  // Instantiate the storage.
  const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
  Common.Settings.Settings.instance({
    forceNew: reset,
    syncedStorage: storage,
    globalStorage: storage,
    localStorage: storage,
    settingRegistrations: Common.SettingRegistration.getRegisteredSettings()
  });
}

export function cleanupSettings() {
  Common.Settings.resetSettings();
}

export function setupSettingsHooks() {
  beforeEach(() => setupSettings(true));
  afterEach(cleanupSettings);
}

export function createSettingsForTest(settingRegistrations = DEFAULT_SETTING_REGISTRATIONS_FOR_TEST.slice(0)) {
  const storage = new Common.Settings.SettingsStorage({});
  return new Common.Settings.Settings({
    syncedStorage: storage,
    globalStorage: storage,
    localStorage: storage,
    settingRegistrations,
  });
}
