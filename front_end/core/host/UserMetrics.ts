// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import {EnumeratedHistogram} from './InspectorFrontendHostAPI.js';
import * as Enums from './UserMetricsEnums.js';

export class UserMetrics {
  sourcesPanelFileDebugged(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.SourcesPanelFileDebugged, code,
                                                            MediaTypes.MAX_VALUE);
  }

  sourcesPanelFileOpened(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.SourcesPanelFileOpened, code,
                                                            MediaTypes.MAX_VALUE);
  }

  networkPanelResponsePreviewOpened(mediaType: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.NetworkPanelResponsePreviewOpened, code,
                                                            MediaTypes.MAX_VALUE);
  }

  actionTaken(action: Action): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, Action.MAX_VALUE);
  }

  resendRequest(resourceType: ResendRequestType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ResendRequest, resourceType,
                                                            ResendRequestType.MAX_VALUE);
  }

  editResendRequest(type: ResendRequestType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.EditResendRequest, type,
                                                            ResendRequestType.MAX_VALUE);
  }

  keybindSetSettingChanged(keybindSet: string): void {
    const value = KeybindSetSettings[keybindSet as keyof typeof KeybindSetSettings] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeybindSetSettingChanged, value,
                                                            KeybindSetSettings.MAX_VALUE);
  }

  keyboardShortcutFired(actionId: string): void {
    const action =
        KeyboardShortcutAction[actionId as keyof typeof KeyboardShortcutAction] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeyboardShortcutFired, action,
                                                            KeyboardShortcutAction.MAX_VALUE);
  }

  issuesPanelOpenedFrom(issueOpener: IssueOpener): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssuesPanelOpenedFrom, issueOpener,
                                                            IssueOpener.MAX_VALUE);
  }

  issuesPanelIssueExpanded(issueExpandedCategory?: string): void {
    if (issueExpandedCategory === undefined) {
      return;
    }

    const issueExpanded = IssueExpanded[issueExpandedCategory as keyof typeof IssueExpanded];

    if (issueExpanded === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssuesPanelIssueExpanded, issueExpanded,
                                                            IssueExpanded.MAX_VALUE);
  }

  issuesPanelResourceOpened(issueCategory: string, type: string): void {
    const key = issueCategory + type;
    const value = IssueResourceOpened[key as keyof typeof IssueResourceOpened];

    if (value === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssuesPanelResourceOpened, value,
                                                            IssueResourceOpened.MAX_VALUE);
  }

  issueCreated(code: string): void {
    const issueCreated = IssueCreated[code as keyof typeof IssueCreated];
    if (issueCreated === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssueCreated, issueCreated,
                                                            IssueCreated.MAX_VALUE);
  }

  experimentEnabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ExperimentEnabledAtLaunch, experiment,
                                                            DevtoolsExperiments.MAX_VALUE);
  }

  navigationSettingAtFirstTimelineLoad(state: TimelineNavigationSetting): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.TimelineNavigationSettingState, state,
                                                            TimelineNavigationSetting.MAX_VALUE);
  }

  experimentDisabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ExperimentDisabledAtLaunch, experiment,
                                                            DevtoolsExperiments.MAX_VALUE);
  }

  experimentChanged(experimentId: string, isEnabled: boolean): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    const actionName = isEnabled ? EnumeratedHistogram.ExperimentEnabled : EnumeratedHistogram.ExperimentDisabled;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments.MAX_VALUE);
  }

  developerResourceLoaded(developerResourceLoaded: DeveloperResourceLoaded): void {
    if (developerResourceLoaded >= DeveloperResourceLoaded.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.DeveloperResourceLoaded,
                                                            developerResourceLoaded, DeveloperResourceLoaded.MAX_VALUE);
  }

  developerResourceScheme(developerResourceScheme: DeveloperResourceScheme): void {
    if (developerResourceScheme >= DeveloperResourceScheme.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.DeveloperResourceScheme,
                                                            developerResourceScheme, DeveloperResourceScheme.MAX_VALUE);
  }

  language(language: Intl.UnicodeBCP47LocaleIdentifier): void {
    const languageCode = Language[language as keyof typeof Language];
    if (languageCode === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.Language, languageCode,
                                                            Language.MAX_VALUE);
  }

  syncSetting(devtoolsSyncSettingEnabled: boolean): void {
    InspectorFrontendHostInstance.getSyncInformation(syncInfo => {
      let settingValue = SyncSetting.CHROME_SYNC_DISABLED;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = SyncSetting.CHROME_SYNC_SETTINGS_DISABLED;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? SyncSetting.DEVTOOLS_SYNC_SETTING_ENABLED :
                                                    SyncSetting.DEVTOOLS_SYNC_SETTING_DISABLED;
      }

      InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.SyncSetting, settingValue,
                                                              SyncSetting.MAX_VALUE);
    });
  }

  recordingToggled(value: RecordingToggled): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.RecordingToggled, value,
                                                            RecordingToggled.MAX_VALUE);
  }

  recordingReplayFinished(value: RecordingReplayFinished): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.RecordingReplayFinished, value,
                                                            RecordingReplayFinished.MAX_VALUE);
  }

  recordingReplayStarted(value: RecordingReplayStarted): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.RecordingReplayStarted, value,
                                                            RecordingReplayStarted.MAX_VALUE);
  }

  lighthouseModeRun(type: LighthouseModeRun): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.LighthouseModeRun, type,
                                                            LighthouseModeRun.MAX_VALUE);
  }

  lighthouseCategoryUsed(type: LighthouseCategoryUsed): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.LighthouseCategoryUsed, type,
                                                            LighthouseCategoryUsed.MAX_VALUE);
  }

  swatchActivated(swatch: SwatchType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.SwatchActivated, swatch,
                                                            SwatchType.MAX_VALUE);
  }

  workspacesPopulated(wallClockTimeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Workspaces.PopulateWallClocktime',
                                                             wallClockTimeInMilliseconds);
  }

  visualLoggingProcessingDone(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.VisualLogging.ProcessingTime',
                                                             timeInMilliseconds);
  }

  freestylerQueryLength(numberOfCharacters: number): void {
    InspectorFrontendHostInstance.recordCountHistogram('DevTools.Freestyler.QueryLength', numberOfCharacters, 0,
                                                       100_000, 100);
  }

  freestylerEvalResponseSize(bytes: number): void {
    InspectorFrontendHostInstance.recordCountHistogram('DevTools.Freestyler.EvalResponseSize', bytes, 0, 100_000, 100);
  }

  builtInAiAvailability(availability: BuiltInAiAvailability): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.BuiltInAiAvailability, availability,
                                                            BuiltInAiAvailability.MAX_VALUE);
  }

  consoleInsightTeaserGenerated(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserGenerationTime',
                                                             timeInMilliseconds);
  }

  consoleInsightTeaserGeneratedMedium(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium('DevTools.Insights.TeaserGenerationTimeMedium',
                                                                   timeInMilliseconds);
  }

  consoleInsightTeaserFirstChunkGenerated(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserFirstChunkGenerationTime',
                                                             timeInMilliseconds);
  }

  consoleInsightTeaserFirstChunkGeneratedMedium(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium(
        'DevTools.Insights.TeaserFirstChunkGenerationTimeMedium', timeInMilliseconds);
  }

  consoleInsightTeaserChunkToEndMedium(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium('DevTools.Insights.TeaserChunkToEndMedium',
                                                                   timeInMilliseconds);
  }

  consoleInsightTeaserAbortedAfterFirstCharacter(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserAfterFirstCharacterAbortionTime',
                                                             timeInMilliseconds);
  }

  consoleInsightTeaserAbortedBeforeFirstCharacter(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserBeforeFirstCharacterAbortionTime',
                                                             timeInMilliseconds);
  }

  consoleInsightLongTeaserGenerated(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.LongTeaserGenerationTime',
                                                             timeInMilliseconds);
  }

  consoleInsightShortTeaserGenerated(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.ShortTeaserGenerationTime',
                                                             timeInMilliseconds);
  }
}

/**
 * Creates a proxy that delays the resolution of UMA enum values until runtime.
 * We do this to decouple the UMA metrics from the TypeScript compilation.
 * This ensures that when DevTools is used with remote debugging or as a
 * custom frontend, the enum boundary values exactly match what the host
 * Chrome binary expects (which is provided via devtools_compatibility.js).
 */
function createDynamicEnumProxy<T extends object>(enumName: string, fallbackEnum: T): T {
  return new Proxy(fallbackEnum, {
           get(_target, prop) {
             if (typeof prop === 'symbol') {
               return Reflect.get(fallbackEnum, prop);
             }

             const metrics =
                 // eslint-disable-next-line @typescript-eslint/naming-convention
                 (globalThis as {DevToolsMetrics?: Record<string, Record<string, number|string>>}).DevToolsMetrics;
             const enumObj = metrics && metrics[enumName];

             if (enumObj && prop in enumObj) {
               return enumObj[prop as keyof typeof enumObj];
             }

             // Support reverse lookups for numeric values.
             if (typeof prop === 'string' && /^\d+$/.test(prop)) {
               const value = Number(prop);
               for (const [key, val] of Object.entries(enumObj || {})) {
                 if (val === value) {
                   return key as keyof T;
                 }
               }
             }

             // Fallback to the compile-time TypeScript enum if DevToolsMetrics is missing
             return Reflect.get(fallbackEnum, prop);
           },

           has(_target, prop) {
             const metrics =
                 // eslint-disable-next-line @typescript-eslint/naming-convention
                 (globalThis as {DevToolsMetrics?: Record<string, Record<string, number|string>>}).DevToolsMetrics;
             const enumObj = metrics && metrics[enumName];
             if (enumObj && prop in enumObj) {
               return true;
             }
             if (typeof prop === 'string' && /^\d+$/.test(prop)) {
               return Object.values(enumObj || {}).includes(Number(prop));
             }
             return Reflect.has(fallbackEnum, prop);
           },

           ownKeys(_target) {
             const metrics =
                 // eslint-disable-next-line @typescript-eslint/naming-convention
                 (globalThis as {DevToolsMetrics?: Record<string, Record<string, number|string>>}).DevToolsMetrics;
             const enumObj = metrics && metrics[enumName];
             return enumObj ? Reflect.ownKeys(enumObj) : Reflect.ownKeys(fallbackEnum);
           },

           getOwnPropertyDescriptor(_target, prop) {
             const metrics =
                 // eslint-disable-next-line @typescript-eslint/naming-convention
                 (globalThis as {DevToolsMetrics?: Record<string, Record<string, number|string>>}).DevToolsMetrics;
             const enumObj = metrics && metrics[enumName];
             if (!enumObj) {
               return Reflect.getOwnPropertyDescriptor(fallbackEnum, prop);
             }
             return Reflect.getOwnPropertyDescriptor(enumObj, prop);
           },
         }) as T;
}

export type Action = Enums.Action;
export const Action: typeof Enums.Action = createDynamicEnumProxy<typeof Enums.Action>('Action', Enums.Action);

export type PanelCodes = Enums.PanelCodes;
export const PanelCodes: typeof Enums.PanelCodes =
    createDynamicEnumProxy<typeof Enums.PanelCodes>('PanelCodes', Enums.PanelCodes);

export type MediaTypes = Enums.MediaTypes;
export const MediaTypes: typeof Enums.MediaTypes =
    createDynamicEnumProxy<typeof Enums.MediaTypes>('MediaTypes', Enums.MediaTypes);

export type KeybindSetSettings = Enums.KeybindSetSettings;
export const KeybindSetSettings: typeof Enums.KeybindSetSettings =
    createDynamicEnumProxy<typeof Enums.KeybindSetSettings>('KeybindSetSettings', Enums.KeybindSetSettings);

export type KeyboardShortcutAction = Enums.KeyboardShortcutAction;
export const KeyboardShortcutAction: typeof Enums.KeyboardShortcutAction =
    createDynamicEnumProxy<typeof Enums.KeyboardShortcutAction>('KeyboardShortcutAction', Enums.KeyboardShortcutAction);

export type IssueOpener = Enums.IssueOpener;
export const IssueOpener: typeof Enums.IssueOpener =
    createDynamicEnumProxy<typeof Enums.IssueOpener>('IssueOpener', Enums.IssueOpener);

export type DevtoolsExperiments = Enums.DevtoolsExperiments;
export const DevtoolsExperiments: typeof Enums.DevtoolsExperiments =
    createDynamicEnumProxy<typeof Enums.DevtoolsExperiments>('DevtoolsExperiments', Enums.DevtoolsExperiments);

export type IssueExpanded = Enums.IssueExpanded;
export const IssueExpanded: typeof Enums.IssueExpanded =
    createDynamicEnumProxy<typeof Enums.IssueExpanded>('IssueExpanded', Enums.IssueExpanded);

export type IssueResourceOpened = Enums.IssueResourceOpened;
export const IssueResourceOpened: typeof Enums.IssueResourceOpened =
    createDynamicEnumProxy<typeof Enums.IssueResourceOpened>('IssueResourceOpened', Enums.IssueResourceOpened);

export type IssueCreated = Enums.IssueCreated;
export const IssueCreated: typeof Enums.IssueCreated =
    createDynamicEnumProxy<typeof Enums.IssueCreated>('IssueCreated', Enums.IssueCreated);

export type DeveloperResourceLoaded = Enums.DeveloperResourceLoaded;
export const DeveloperResourceLoaded: typeof Enums.DeveloperResourceLoaded =
    createDynamicEnumProxy<typeof Enums.DeveloperResourceLoaded>('DeveloperResourceLoaded',
                                                                 Enums.DeveloperResourceLoaded);

export type DeveloperResourceScheme = Enums.DeveloperResourceScheme;
export const DeveloperResourceScheme: typeof Enums.DeveloperResourceScheme =
    createDynamicEnumProxy<typeof Enums.DeveloperResourceScheme>('DeveloperResourceScheme',
                                                                 Enums.DeveloperResourceScheme);

export type Language = Enums.Language;
export const Language: typeof Enums.Language =
    createDynamicEnumProxy<typeof Enums.Language>('Language', Enums.Language);

export type SyncSetting = Enums.SyncSetting;
export const SyncSetting: typeof Enums.SyncSetting =
    createDynamicEnumProxy<typeof Enums.SyncSetting>('SyncSetting', Enums.SyncSetting);

export type RecordingToggled = Enums.RecordingToggled;
export const RecordingToggled: typeof Enums.RecordingToggled =
    createDynamicEnumProxy<typeof Enums.RecordingToggled>('RecordingToggled', Enums.RecordingToggled);

export type RecordingAssertion = Enums.RecordingAssertion;
export const RecordingAssertion: typeof Enums.RecordingAssertion =
    createDynamicEnumProxy<typeof Enums.RecordingAssertion>('RecordingAssertion', Enums.RecordingAssertion);

export type RecordingReplayFinished = Enums.RecordingReplayFinished;
export const RecordingReplayFinished: typeof Enums.RecordingReplayFinished =
    createDynamicEnumProxy<typeof Enums.RecordingReplayFinished>('RecordingReplayFinished',
                                                                 Enums.RecordingReplayFinished);

export type RecordingReplaySpeed = Enums.RecordingReplaySpeed;
export const RecordingReplaySpeed: typeof Enums.RecordingReplaySpeed =
    createDynamicEnumProxy<typeof Enums.RecordingReplaySpeed>('RecordingReplaySpeed', Enums.RecordingReplaySpeed);

export type RecordingReplayStarted = Enums.RecordingReplayStarted;
export const RecordingReplayStarted: typeof Enums.RecordingReplayStarted =
    createDynamicEnumProxy<typeof Enums.RecordingReplayStarted>('RecordingReplayStarted', Enums.RecordingReplayStarted);

export type RecordingEdited = Enums.RecordingEdited;
export const RecordingEdited: typeof Enums.RecordingEdited =
    createDynamicEnumProxy<typeof Enums.RecordingEdited>('RecordingEdited', Enums.RecordingEdited);

export type RecordingExported = Enums.RecordingExported;
export const RecordingExported: typeof Enums.RecordingExported =
    createDynamicEnumProxy<typeof Enums.RecordingExported>('RecordingExported', Enums.RecordingExported);

export type RecordingCodeToggled = Enums.RecordingCodeToggled;
export const RecordingCodeToggled: typeof Enums.RecordingCodeToggled =
    createDynamicEnumProxy<typeof Enums.RecordingCodeToggled>('RecordingCodeToggled', Enums.RecordingCodeToggled);

export type RecordingCopiedToClipboard = Enums.RecordingCopiedToClipboard;
export const RecordingCopiedToClipboard: typeof Enums.RecordingCopiedToClipboard =
    createDynamicEnumProxy<typeof Enums.RecordingCopiedToClipboard>('RecordingCopiedToClipboard',
                                                                    Enums.RecordingCopiedToClipboard);

export type ManifestSectionCodes = Enums.ManifestSectionCodes;
export const ManifestSectionCodes: typeof Enums.ManifestSectionCodes =
    createDynamicEnumProxy<typeof Enums.ManifestSectionCodes>('ManifestSectionCodes', Enums.ManifestSectionCodes);

export type LighthouseModeRun = Enums.LighthouseModeRun;
export const LighthouseModeRun: typeof Enums.LighthouseModeRun =
    createDynamicEnumProxy<typeof Enums.LighthouseModeRun>('LighthouseModeRun', Enums.LighthouseModeRun);

export type LighthouseCategoryUsed = Enums.LighthouseCategoryUsed;
export const LighthouseCategoryUsed: typeof Enums.LighthouseCategoryUsed =
    createDynamicEnumProxy<typeof Enums.LighthouseCategoryUsed>('LighthouseCategoryUsed', Enums.LighthouseCategoryUsed);

export type SwatchType = Enums.SwatchType;
export const SwatchType: typeof Enums.SwatchType =
    createDynamicEnumProxy<typeof Enums.SwatchType>('SwatchType', Enums.SwatchType);

export type BadgeType = Enums.BadgeType;
export const BadgeType: typeof Enums.BadgeType =
    createDynamicEnumProxy<typeof Enums.BadgeType>('BadgeType', Enums.BadgeType);

export type AnimationsPlaybackRate = Enums.AnimationsPlaybackRate;
export const AnimationsPlaybackRate: typeof Enums.AnimationsPlaybackRate =
    createDynamicEnumProxy<typeof Enums.AnimationsPlaybackRate>('AnimationsPlaybackRate', Enums.AnimationsPlaybackRate);

export type TimelineNavigationSetting = Enums.TimelineNavigationSetting;
export const TimelineNavigationSetting: typeof Enums.TimelineNavigationSetting =
    createDynamicEnumProxy<typeof Enums.TimelineNavigationSetting>('TimelineNavigationSetting',
                                                                   Enums.TimelineNavigationSetting);

export type BuiltInAiAvailability = Enums.BuiltInAiAvailability;
export const BuiltInAiAvailability: typeof Enums.BuiltInAiAvailability =
    createDynamicEnumProxy<typeof Enums.BuiltInAiAvailability>('BuiltInAiAvailability', Enums.BuiltInAiAvailability);

export type ResendRequestType = Enums.ResendRequestType;
export const ResendRequestType: typeof Enums.ResendRequestType =
    createDynamicEnumProxy<typeof Enums.ResendRequestType>('ResendRequestType', Enums.ResendRequestType);

const resendRequestTypeMap = new Map<Common.ResourceType.ResourceType, keyof typeof Enums.ResendRequestType>([
  [Common.ResourceType.resourceTypes.XHR, 'XHR'],
  [Common.ResourceType.resourceTypes.Fetch, 'FETCH'],
  [Common.ResourceType.resourceTypes.Script, 'SCRIPT'],
  [Common.ResourceType.resourceTypes.Stylesheet, 'STYLESHEET'],
  [Common.ResourceType.resourceTypes.Image, 'IMAGE'],
  [Common.ResourceType.resourceTypes.Media, 'MEDIA'],
  [Common.ResourceType.resourceTypes.Font, 'FONT'],
  [Common.ResourceType.resourceTypes.Wasm, 'WASM'],
  [Common.ResourceType.resourceTypes.Manifest, 'MANIFEST'],
  [Common.ResourceType.resourceTypes.TextTrack, 'TEXT_TRACK'],
  [Common.ResourceType.resourceTypes.SourceMapScript, 'SOURCE_MAP_SCRIPT'],
  [Common.ResourceType.resourceTypes.SourceMapStyleSheet, 'SOURCE_MAP_STYLE_SHEET'],
  [Common.ResourceType.resourceTypes.Document, 'DOCUMENT'],
  [Common.ResourceType.resourceTypes.Prefetch, 'PREFETCH'],
  [Common.ResourceType.resourceTypes.Ping, 'PING'],
]);

export function resendRequestType(resourceType: Common.ResourceType.ResourceType): ResendRequestType {
  const key = resendRequestTypeMap.get(resourceType);
  return (key ? ResendRequestType[key] : undefined) ?? ResendRequestType.OTHER;
}
