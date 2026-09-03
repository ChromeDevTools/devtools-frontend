// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/settings/settings.js';
import '../../../ui/kit/kit.js';
import './FieldSettingsDialog.js';
import '../../../ui/components/menus/menus.js';
import './MetricCard.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import type * as Spec from '../../../models/live-metrics/web-vitals-injected/spec/spec.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import type * as Settings from '../../../ui/components/settings/settings.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../../common/common.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import * as Insights from './insights/insights.js';
import liveMetricsViewStyles from './liveMetricsView.css.js';
import type {MetricCardData} from './MetricCard.js';
import metricValueStyles from './metricValueStyles.css.js';
import {CLS_THRESHOLDS, INP_THRESHOLDS, renderMetricValue} from './Utils.js';

const {html, nothing, Directives: {live}} = Lit;
const {widget} = UI.Widget;

type DeviceOption = CrUXManager.DeviceScope|'AUTO';

const DEVICE_OPTION_LIST: DeviceOption[] = ['AUTO', ...CrUXManager.DEVICE_SCOPE_LIST];

const RTT_MINIMUM = 60;

const UIStrings = {
  /**
   * @description Badge label indicating that the metrics are for a soft navigation in the Performance panel.
   */
  softNavigationPillText: 'SOFT NAV',
  /**
   * @description Title of a view that shows performance metrics from the local environment and field metrics collected from real users in the Performance panel.
   */
  localAndFieldMetrics: 'Local and field metrics',
  /**
   * @description Title of a view that shows performance metrics from the local environment in the Performance panel.
   */
  localMetrics: 'Local metrics',
  /**
   * @description Link text to historical field data in the Performance panel.
   */
  fieldDataHistoryLink: 'View history',
  /**
   * @description Tooltip for the link to historical field data in the Performance panel.
   */
  fieldDataHistoryTooltip: 'View field data history in CrUX Vis',
  /**
   * @description Accessible label for the section that logs user interactions and layout shifts in the Performance panel.
   */
  eventLogs: 'Interaction and layout shift logs section',
  /**
   * @description Section title for user interactions in the live metrics view of the Performance panel.
   */
  interactions: 'Interactions',
  /**
   * @description Section title for layout shifts in the live metrics view of the Performance panel.
   */
  layoutShifts: 'Layout shifts',
  /**
   * @description Title of a sidebar section that shows next step options in the Performance panel.
   */
  nextSteps: 'Next steps',
  /**
   * @description Section title for field metrics in the live metrics view of the Performance panel.
   */
  fieldMetricsTitle: 'Field metrics',
  /**
   * @description Section title for local environment settings in the live metrics view of the Performance panel.
   */
  environmentSettings: 'Environment settings',
  /**
   * @description Label for a select dropdown to choose the device type for field metrics in the Performance panel.
   * @example {Mobile} PH1
   */
  showFieldDataForDevice: 'Show field metrics for device type: {PH1}',
  /**
   * @description Text indicating that there is not enough data to report real user statistics in the Performance panel.
   */
  notEnoughData: 'Not enough data',
  /**
   * @description Label for real user network conditions in the live metrics view of the Performance panel.
   * @example {75th percentile is similar to Slow 4G throttling} PH1
   */
  network: 'Network: {PH1}',
  /**
   * @description Label for a select dropdown to choose the device form factor in the Performance panel.
   * @example {Mobile} PH1
   */
  device: 'Device: {PH1}',
  /**
   * @description Label for an option to select all device form factors in the Performance panel.
   */
  allDevices: 'All devices',
  /**
   * @description Label for an option to select the desktop form factor in the Performance panel.
   */
  desktop: 'Desktop',
  /**
   * @description Label for an option to select the mobile form factor in the Performance panel.
   */
  mobile: 'Mobile',
  /**
   * @description Label for an option to select the tablet form factor in the Performance panel.
   */
  tablet: 'Tablet',
  /**
   * @description Label for an option to automatically select the form factor in the Performance panel.
   * @example {Desktop} PH1
   */
  auto: 'Auto ({PH1})',
  /**
   * @description Label for an option that is currently loading in the Performance panel.
   * @example {Desktop} PH1
   */
  loadingOption: '{PH1} - Loading…',
  /**
   * @description Label for an option that lacks enough data in the Performance panel.
   * @example {Desktop} PH1
   */
  needsDataOption: '{PH1} - No data',
  /**
   * @description Label for an option that selects the page specific URL in the Performance panel.
   */
  urlOption: 'URL',
  /**
   * @description Label for an option that selects the entire origin in the Performance panel.
   */
  originOption: 'Origin',
  /**
   * @description Label for an option that selects the specific URL with the URL displayed in the Performance panel.
   * @example {https://example.com/} PH1
   */
  urlOptionWithKey: 'URL: {PH1}',
  /**
   * @description Label for an option that selects the entire origin with the origin displayed in the Performance panel.
   * @example {https://example.com} PH1
   */
  originOptionWithKey: 'Origin: {PH1}',
  /**
   * @description Label for a dropdown indicating whether field metrics are shown for the URL or origin in the Performance panel.
   * @example {Origin: https://example.com} PH1
   */
  showFieldDataForPage: 'Show field metrics for {PH1}',
  /**
   * @description Tooltip text explaining that real user connections are too fast to simulate with network throttling in the Performance panel.
   */
  tryDisablingThrottling: '75th percentile is too fast to simulate with throttling',
  /**
   * @description Tooltip text explaining that real user connections are similar to a specific network throttling preset in the Performance panel.
   * @example {Slow 4G} PH1
   */
  tryUsingThrottling: '75th percentile is similar to {PH1} throttling',
  /**
   * @description Text block listing the distribution of real users across device form factors in the Performance panel.
   * @example {60%} PH1
   * @example {30%} PH2
   */
  percentDevices: '{PH1}% mobile, {PH2}% desktop',
  /**
   * @description Text block explaining how to simulate different mobile and desktop devices in the Performance panel.
   */
  useDeviceToolbar:
      'Use the [device toolbar](https://developer.chrome.com/docs/devtools/device-mode) and configure throttling to simulate real user environments and identify more performance issues.',
  /**
   * @description Checkbox label that controls if the network cache is disabled in the Performance panel.
   */
  disableNetworkCache: 'Disable network cache',
  /**
   * @description Label for the CPU throttling dropdown in the live metrics view of the Performance panel.
   */
  cpuThrottling: 'CPU:',
  /**
   * @description Link label to the Largest Contentful Paint (LCP) page element in the live metrics view of the Performance panel.
   */
  lcpElement: 'LCP element',
  /**
   * @description Button label to reveal the user interaction associated with INP in the live metrics view of the Performance panel.
   */
  inpInteractionLink: 'INP interaction',
  /**
   * @description Button label to reveal the worst layout shift cluster in the live metrics view of the Performance panel.
   */
  worstCluster: 'Worst cluster',
  /**
   * @description [ICU Syntax] Button label indicating the number of shifts in the worst layout shift cluster in the live metrics view of the Performance panel.
   * @example {3} shiftCount
   */
  numShifts: `{shiftCount, plural,
    =1 {{shiftCount} shift}
    other {{shiftCount} shifts}
  }`,
  /**
   * @description Label for the date range representing the collection period for field metrics in the Performance panel.
   * @example {Oct 1, 2024 - Nov 1, 2024} PH1
   */
  collectionPeriod: 'Collection period: {PH1}',
  /**
   * @description Date range format string in the live metrics view of the Performance panel.
   * @example {Oct 1, 2024} PH1
   * @example {Nov 1, 2024} PH2
   */
  dateRange: '{PH1} - {PH2}',
  /**
   * @description Text banner explaining how to compare local metrics to real user data in the Performance panel.
   * @example {Chrome UX Report} PH1
   */
  seeHowYourLocalMetricsCompare: 'See how your local metrics compare to real user data in the {PH1}.',
  /**
   * @description Link text for documentation about local and field metrics in the Performance panel.
   */
  localFieldLearnMoreLink: 'Learn more about local and field metrics',
  /**
   * @description Tooltip text explaining the difference between local and field metrics in the Performance panel.
   */
  localFieldLearnMoreTooltip:
      'Local metrics are captured from the current page using your network connection and device. Field metrics are measured by real users using many different network connections and devices.',
  /**
   * @description Tooltip text explaining why an interaction was excluded from the INP calculation in the Performance panel.
   */
  interactionExcluded:
      'INP is calculated using the 98th percentile of interaction delays, so some interaction delays may be larger than the INP value.',
  /**
   * @description Tooltip for the button to clear the currently selected log in the live metrics view of the Performance panel.
   */
  clearCurrentLog: 'Clear current log',
  /**
   * @description Label for the time to first byte subpart in the live metrics view of the Performance panel.
   */
  timeToFirstByte: 'Time to first byte',
  /**
   * @description Label for the resource load delay subpart in the live metrics view of the Performance panel.
   */
  resourceLoadDelay: 'Resource load delay',
  /**
   * @description Label for the resource load duration subpart in the live metrics view of the Performance panel.
   */
  resourceLoadDuration: 'Resource load duration',
  /**
   * @description Label for the element render delay subpart in the live metrics view of the Performance panel.
   */
  elementRenderDelay: 'Element render delay',
  /**
   * @description Label for the input delay subpart of an interaction in the live metrics view of the Performance panel.
   */
  inputDelay: 'Input delay',
  /**
   * @description Label for the processing duration subpart of an interaction in the live metrics view of the Performance panel.
   */
  processingDuration: 'Processing duration',
  /**
   * @description Label for the presentation delay subpart of an interaction in the live metrics view of the Performance panel.
   */
  presentationDelay: 'Presentation delay',
  /**
   * @description Tooltip text for an interaction status chip indicating that it represents the 98th percentile INP interaction in the Performance panel.
   */
  inpInteraction: 'The INP interaction is at the 98th percentile of interaction delays.',
  /**
   * @description Tooltip text for the button to reveal the INP interaction in the live metrics view of the Performance panel.
   */
  showInpInteraction: 'Go to the INP interaction.',
  /**
   * @description Tooltip text for the button to reveal the worst layout shift cluster in the live metrics view of the Performance panel.
   */
  showClsCluster: 'Go to worst layout shift cluster.',
  /**
   * @description Table column header for subpart stage names in the live metrics view of the Performance panel.
   */
  subpart: 'Subpart',
  /**
   * @description Table column header for local duration values in milliseconds in the live metrics view of the Performance panel.
   */
  duration: 'Local duration (ms)',
  /**
   * @description Tooltip text for the button to log interaction details to the console in the live metrics view of the Performance panel.
   */
  logToConsole: 'Log more interaction data to the console',
  /**
   * @description Section title for Node process performance in the Performance panel.
   */
  nodePerformanceTimeline: 'Node performance',
  /**
   * @description Description text for recording a performance timeline of a connected Node process in the Performance panel.
   */
  nodeClickToRecord: 'Record a performance timeline of the connected Node process.',
  /**
   * @description Label for the network throttling dropdown in the live metrics view of the Performance panel.
   */
  networkThrottling: 'Network:',
  /**
   * @description Tooltip text explaining why the user should adjust throttling settings in the Performance panel.
   */
  recommendedThrottlingReason: 'Consider changing setting to simulate real user environments',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LiveMetricsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  isNode: boolean;
  lcpValue?: LiveMetrics.LcpValue;
  clsValue?: LiveMetrics.ClsValue;
  inpValue?: LiveMetrics.InpValue;
  interactions: LiveMetrics.InteractionMap;
  layoutShifts: LiveMetrics.LayoutShift[];
  toggleRecordAction: UI.ActionRegistration.Action;
  recordReloadAction: UI.ActionRegistration.Action;
  cruxManager: CrUXManager.CrUXManager;
  handlePageScopeSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
  handleDeviceOptionSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
  revealLayoutShiftCluster: (clusterIds: Set<LiveMetrics.LayoutShift['uniqueLayoutShiftId']>) => void;
  revealInteraction: (interaction: LiveMetrics.Interaction) => void;
  logExtraInteractionDetails: (interaction: LiveMetrics.Interaction) => void;
  highlightedInteractionId?: string;
  highlightedLayoutShiftClusterIds?: Set<string>;
  navigationType?: Spec.NavigationType;
}

export interface ViewOutput {
  shouldKeepInteractionsScrolledToBottom?: () => boolean;
  keepInteractionsScrolledToBottom?: () => void;
  shouldKeepLayoutShiftsScrolledToBottom?: () => boolean;
  keepLayoutShiftsScrolledToBottom?: () => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement|DocumentFragment) => void;

function getLcpFieldSubparts(cruxManager: CrUXManager.CrUXManager): LiveMetrics.LcpValue['subparts']|null {
  const ttfb =
      cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_time_to_first_byte')?.percentiles?.p75;
  const loadDelay =
      cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_resource_load_delay')?.percentiles?.p75;
  const loadDuration =
      cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_resource_load_duration')?.percentiles?.p75;
  const renderDelay =
      cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_element_render_delay')?.percentiles?.p75;

  if (typeof ttfb !== 'number' || typeof loadDelay !== 'number' || typeof loadDuration !== 'number' ||
      typeof renderDelay !== 'number') {
    return null;
  }

  return {
    timeToFirstByte: Trace.Types.Timing.Milli(ttfb),
    resourceLoadDelay: Trace.Types.Timing.Milli(loadDelay),
    resourceLoadTime: Trace.Types.Timing.Milli(loadDuration),
    elementRenderDelay: Trace.Types.Timing.Milli(renderDelay),
  };
}

function getNetworkRecTitle(cruxManager: CrUXManager.CrUXManager): string|null {
  const response = cruxManager.getSelectedFieldMetricData('round_trip_time');
  if (!response?.percentiles) {
    return null;
  }

  const rtt = Number(response.percentiles.p75);
  if (!Number.isFinite(rtt)) {
    return null;
  }

  if (rtt < RTT_MINIMUM) {
    return i18nString(UIStrings.tryDisablingThrottling);
  }

  const conditions = SDK.NetworkManager.getRecommendedNetworkPreset(rtt);
  if (!conditions) {
    return null;
  }

  const title = typeof conditions.title === 'function' ? conditions.title() : conditions.title;
  return i18nString(UIStrings.tryUsingThrottling, {PH1: title});
}

function getDeviceRec(cruxManager: CrUXManager.CrUXManager): string|null {
  // `form_factors` metric is only populated if CrUX data is fetched for all devices.
  const fractions =
      cruxManager.getFieldResponse(cruxManager.fieldPageScope, 'ALL')?.record.metrics.form_factors?.fractions;
  if (!fractions) {
    return null;
  }

  return i18nString(UIStrings.percentDevices, {
    PH1: Math.round(fractions.phone * 100),
    PH2: Math.round(fractions.desktop * 100),
  });
}

function getPageScopeLabel(cruxManager: CrUXManager.CrUXManager, pageScope: CrUXManager.PageScope): string {
  const key = cruxManager.pageResult?.[`${pageScope}-ALL` as const]?.record.key[pageScope];
  if (key) {
    return pageScope === 'url' ? i18nString(UIStrings.urlOptionWithKey, {PH1: key}) :
                                 i18nString(UIStrings.originOptionWithKey, {PH1: key});
  }

  const baseLabel = pageScope === 'url' ? i18nString(UIStrings.urlOption) : i18nString(UIStrings.originOption);
  return i18nString(UIStrings.needsDataOption, {PH1: baseLabel});
}

function getDeviceScopeDisplayName(deviceScope: CrUXManager.DeviceScope): string {
  switch (deviceScope) {
    case 'ALL':
      return i18nString(UIStrings.allDevices);
    case 'DESKTOP':
      return i18nString(UIStrings.desktop);
    case 'PHONE':
      return i18nString(UIStrings.mobile);
    case 'TABLET':
      return i18nString(UIStrings.tablet);
  }
}

function getLabelForDeviceOption(cruxManager: CrUXManager.CrUXManager, deviceOption: DeviceOption): string {
  let baseLabel;
  if (deviceOption === 'AUTO') {
    const deviceScope = cruxManager.resolveDeviceOptionToScope(deviceOption);
    const deviceScopeLabel = getDeviceScopeDisplayName(deviceScope);
    baseLabel = i18nString(UIStrings.auto, {PH1: deviceScopeLabel});
  } else {
    baseLabel = getDeviceScopeDisplayName(deviceOption);
  }

  if (!cruxManager.pageResult) {
    return i18nString(UIStrings.loadingOption, {PH1: baseLabel});
  }

  const result = cruxManager.getSelectedFieldResponse();
  if (!result) {
    return i18nString(UIStrings.needsDataOption, {PH1: baseLabel});
  }

  return baseLabel;
}

function getCollectionPeriodRange(cruxManager: CrUXManager.CrUXManager): string|null {
  const selectedResponse = cruxManager.getSelectedFieldResponse();
  if (!selectedResponse) {
    return null;
  }

  const {firstDate, lastDate} = selectedResponse.record.collectionPeriod;

  const formattedFirstDate = new Date(
      firstDate.year,
      // CrUX month is 1-indexed but `Date` month is 0-indexed
      firstDate.month - 1,
      firstDate.day,
  );
  const formattedLastDate = new Date(
      lastDate.year,
      // CrUX month is 1-indexed but `Date` month is 0-indexed
      lastDate.month - 1,
      lastDate.day,
  );

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return i18nString(UIStrings.dateRange, {
    PH1: formattedFirstDate.toLocaleDateString(undefined, options),
    PH2: formattedLastDate.toLocaleDateString(undefined, options),
  });
}

function createMetricCardRef(cardData: Omit<MetricCardData, 'tooltipContainer'>):
    ReturnType<typeof Lit.Directives.ref> {
  return Lit.Directives.ref(el => {
    if (el instanceof HTMLElement) {
      (el as HTMLElement & {data: MetricCardData}).data = {
        ...cardData,
        tooltipContainer: (el.closest('.metric-cards') as HTMLElement) || undefined,
      };
    }
  });
}

function renderLcpCard(input: ViewInput): Lit.LitTemplate {
  const fieldData = input.cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
  const nodeLink =
      input.lcpValue?.nodeRef && PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(input.lcpValue?.nodeRef);
  const subparts = input.lcpValue?.subparts;

  const fieldSubparts = getLcpFieldSubparts(input.cruxManager);

  // clang-format off
  return html`
    <devtools-metric-card ${createMetricCardRef({
      metric: 'LCP',
      localValue: input.lcpValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      warnings: input.lcpValue?.warnings,
      subparts: subparts && [
        [i18nString(UIStrings.timeToFirstByte), subparts.timeToFirstByte, fieldSubparts?.timeToFirstByte],
        [i18nString(UIStrings.resourceLoadDelay), subparts.resourceLoadDelay, fieldSubparts?.resourceLoadDelay],
        [i18nString(UIStrings.resourceLoadDuration), subparts.resourceLoadTime, fieldSubparts?.resourceLoadTime],
        [i18nString(UIStrings.elementRenderDelay), subparts.elementRenderDelay, fieldSubparts?.elementRenderDelay],
      ],
    })}>
      ${nodeLink ? html`
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${i18nString(UIStrings.lcpElement)}</span>
            <span class="related-info-link">
             ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {node: input.lcpValue?.nodeRef})}
            </span>
          </div>
        `
        : nothing}
    </devtools-metric-card>
  `;
  // clang-format on
}

function renderClsCard(input: ViewInput): Lit.LitTemplate {
  const fieldData = input.cruxManager.getSelectedFieldMetricData('cumulative_layout_shift');

  const clusterIds = new Set(input.clsValue?.clusterShiftIds || []);
  const clusterIsVisible =
      clusterIds.size > 0 && input.layoutShifts.some(layoutShift => clusterIds.has(layoutShift.uniqueLayoutShiftId));

  // clang-format off
  return html`
    <devtools-metric-card ${createMetricCardRef({
      metric: 'CLS',
      localValue: input.clsValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      warnings: input.clsValue?.warnings,
    })}>
      ${clusterIsVisible ? html`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString(UIStrings.worstCluster)}</span>
          <button
            class="link-to-log"
            title=${i18nString(UIStrings.showClsCluster)}
            @click=${() => input.revealLayoutShiftCluster(clusterIds)}
            jslog=${VisualLogging.action('timeline.landing.show-cls-cluster').track({click: true})}
          >${i18nString(UIStrings.numShifts, {shiftCount: clusterIds.size})}</button>
        </div>
      ` : nothing}
    </devtools-metric-card>
  `;
  // clang-format on
}

function renderInpCard(input: ViewInput): Lit.LitTemplate {
  const fieldData = input.cruxManager.getSelectedFieldMetricData('interaction_to_next_paint');
  const subparts = input.inpValue?.subparts;
  const interaction = input.inpValue?.interactionId ? input.interactions.get(input.inpValue.interactionId) : undefined;

  // clang-format off
  return html`
    <devtools-metric-card ${createMetricCardRef({
      metric: 'INP',
      localValue: input.inpValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      warnings: input.inpValue?.warnings,
      subparts: subparts && [
        [i18nString(UIStrings.inputDelay), subparts.inputDelay],
        [i18nString(UIStrings.processingDuration), subparts.processingDuration],
        [i18nString(UIStrings.presentationDelay), subparts.presentationDelay],
      ],
    })}>
      ${interaction ? html`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString(UIStrings.inpInteractionLink)}</span>
          <button
            class="link-to-log"
            title=${i18nString(UIStrings.showInpInteraction)}
            @click=${() => input.revealInteraction(interaction)}
            jslog=${VisualLogging.action('timeline.landing.show-inp-interaction').track({click: true})}
          >${interaction.interactionType}</button>
        </div>
      ` : nothing}
    </devtools-metric-card>
  `;
  // clang-format on
}

function renderRecordAction(action: UI.ActionRegistration.Action): Lit.LitTemplate {
  function onClick(): void {
    void action.execute();
  }

  // clang-format off
  return html`
    <div class="record-action">
      <devtools-button @click=${onClick} .data=${{
          variant: Buttons.Button.Variant.TEXT,
          size: Buttons.Button.Size.REGULAR,
          iconName: action.icon(),
          title: action.title(),
          jslogContext: action.id(),
      } as Buttons.Button.ButtonData}>
        ${action.title()}
      </devtools-button>
      <span class="shortcut-label">${UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action.id())}</span>
    </div>
  `;
  // clang-format on
}

function renderRecordingSettings(input: ViewInput): Lit.LitTemplate {
  const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;

  const deviceRec = getDeviceRec(input.cruxManager) || i18nString(UIStrings.notEnoughData);
  const networkRec = getNetworkRecTitle(input.cruxManager) || i18nString(UIStrings.notEnoughData);

  // clang-format off
  return html`
    <h3 class="card-title">${i18nString(UIStrings.environmentSettings)}</h3>
    <div class="device-toolbar-description">${Insights.Helpers.md(i18nString(UIStrings.useDeviceToolbar))}</div>
    ${fieldEnabled ? html`
      <ul class="environment-recs-list">
        <li>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.device, {PH1: html`<span class="environment-rec">${deviceRec}</span>`})}</li>
        <li>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.network, {PH1: html`<span class="environment-rec">${networkRec}</span>`})}</li>
      </ul>
    ` : nothing}
    <div class="environment-option">
      <label class="environment-option-label">
        ${i18nString(UIStrings.cpuThrottling)}
        <select ${widget(MobileThrottling.CPUThrottlingSelector.CPUThrottlingSelector)}></select>
      </label>
      <devtools-icon title=${i18nString(UIStrings.recommendedThrottlingReason)} name="info"></devtools-icon>
    </div>
    <div class="environment-option">
      <label class="environment-option-label">
        ${i18nString(UIStrings.networkThrottling)}
        <select
          ${widget(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
            bindToGlobalConditions: true,
          })}
        ></select>
      </label>
      <devtools-icon title=${i18nString(UIStrings.recommendedThrottlingReason)} name="info"></devtools-icon>
    </div>
    <div class="environment-option">
      <setting-checkbox
        class="network-cache-setting"
        .data=${{
          setting: Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor),
          textOverride: i18nString(UIStrings.disableNetworkCache),
        } as Settings.SettingCheckbox.SettingCheckboxData}
      ></setting-checkbox>
    </div>
  `;
  // clang-format on
}

function renderPageScopeSetting(input: ViewInput): Lit.LitTemplate {
  if (!input.cruxManager.getConfigSetting().get().enabled) {
    return Lit.nothing;
  }

  const urlLabel = getPageScopeLabel(input.cruxManager, 'url');
  const originLabel = getPageScopeLabel(input.cruxManager, 'origin');

  const buttonTitle = input.cruxManager.fieldPageScope === 'url' ? urlLabel : originLabel;
  const accessibleTitle = i18nString(UIStrings.showFieldDataForPage, {PH1: buttonTitle});

  // If there is no data at all we should force users to switch pages or reconfigure CrUX.
  const shouldDisable = !input.cruxManager.pageResult?.['url-ALL'] && !input.cruxManager.pageResult?.['origin-ALL'];

  /* eslint-disable @devtools/no-deprecated-component-usages */
  return html`
    <devtools-select-menu
      id="page-scope-select"
      class="field-data-option"
      @selectmenuselected=${input.handlePageScopeSelected}
      .showDivider=${true}
      .showArrow=${true}
      .sideButton=${false}
      .showSelectedItem=${true}
      .buttonTitle=${buttonTitle}
      .disabled=${shouldDisable}
      title=${accessibleTitle}
    >
      <devtools-menu-item
        .value=${'url'}
        .selected=${input.cruxManager.fieldPageScope === 'url'}
      >
        ${urlLabel}
      </devtools-menu-item>
      <devtools-menu-item
        .value=${'origin'}
        .selected=${input.cruxManager.fieldPageScope === 'origin'}
      >
        ${originLabel}
      </devtools-menu-item>
    </devtools-select-menu>
  `;
  /* eslint-enable @devtools/no-deprecated-component-usages */
}

function renderDeviceScopeSetting(input: ViewInput): Lit.LitTemplate {
  if (!input.cruxManager.getConfigSetting().get().enabled) {
    return Lit.nothing;
  }

  // If there is no data at all we should force users to try adjusting the page scope
  // before coming back to this option.
  const shouldDisable = !input.cruxManager.getFieldResponse(input.cruxManager.fieldPageScope, 'ALL');

  const currentDeviceLabel = getLabelForDeviceOption(input.cruxManager, input.cruxManager.fieldDeviceOption);

  // clang-format off
  /* eslint-disable @devtools/no-deprecated-component-usages */
  return html`
    <devtools-select-menu
      id="device-scope-select"
      class="field-data-option"
      @selectmenuselected=${input.handleDeviceOptionSelected}
      .showDivider=${true}
      .showArrow=${true}
      .sideButton=${false}
      .showSelectedItem=${true}
      .buttonTitle=${i18nString(UIStrings.device, {PH1: currentDeviceLabel})}
      .disabled=${shouldDisable}
      title=${i18nString(UIStrings.showFieldDataForDevice, {PH1: currentDeviceLabel})}
    >
      ${DEVICE_OPTION_LIST.map(deviceOption => {
        return html`
          <devtools-menu-item
            .value=${deviceOption}
            .selected=${input.cruxManager.fieldDeviceOption === deviceOption}
          >
            ${getLabelForDeviceOption(input.cruxManager, deviceOption)}
          </devtools-menu-item>
        `;
      })}
    </devtools-select-menu>
  `;
  /* eslint-enable @devtools/no-deprecated-component-usages */
  // clang-format on
}

function renderFieldDataHistoryLink(cruxManager: CrUXManager.CrUXManager): Lit.LitTemplate {
  if (!cruxManager.getConfigSetting().get().enabled) {
    return Lit.nothing;
  }
  const normalizedUrl = cruxManager.pageResult?.normalizedUrl;
  if (!normalizedUrl) {
    return Lit.nothing;
  }
  const tmp = new URL('https://cruxvis.withgoogle.com/');
  tmp.searchParams.set('view', 'cwvsummary');
  tmp.searchParams.set('url', normalizedUrl);
  // identifier must be 'origin' or 'url'.
  const identifier = cruxManager.fieldPageScope;
  tmp.searchParams.set('identifier', identifier);
  // device must be one 'PHONE', 'DESKTOP', 'TABLET', or 'ALL'.
  const device = cruxManager.getSelectedDeviceScope();
  tmp.searchParams.set('device', device);
  const cruxVis = `${tmp.origin}/#/${tmp.search}`;
  return html`
      (<devtools-link href=${cruxVis}
               class="local-field-link"
               title=${i18nString(UIStrings.fieldDataHistoryTooltip)}
      >${i18nString(UIStrings.fieldDataHistoryLink)}</devtools-link>)
    `;
}

function renderCollectionPeriod(cruxManager: CrUXManager.CrUXManager): Lit.LitTemplate {
  const range = getCollectionPeriodRange(cruxManager);

  const dateText = range || i18nString(UIStrings.notEnoughData);

  const fieldDataHistoryLink = range ? renderFieldDataHistoryLink(cruxManager) : Lit.nothing;

  const warnings = cruxManager.pageResult?.warnings || [];

  return html`
    <div class="field-data-message">
      <div>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.collectionPeriod, {
    PH1: html`<span class="collection-period-range">${dateText}</span>`,
  })} ${fieldDataHistoryLink}</div>
      ${warnings.map(warning => html`
        <div class="field-data-warning">${warning}</div>
      `)}
    </div>
  `;
}

function renderFieldDataMessage(cruxManager: CrUXManager.CrUXManager): Lit.LitTemplate {
  if (cruxManager.getConfigSetting().get().enabled) {
    return renderCollectionPeriod(cruxManager);
  }

  // clang-format off
  return html`
    <div class="field-data-message">
      ${uiI18n.getFormatLocalizedStringTemplate(
        str_,
        UIStrings.seeHowYourLocalMetricsCompare,
        { PH1: html`<devtools-link href="https://developer.chrome.com/docs/crux">${i18n.i18n.lockedString('Chrome UX Report')}</devtools-link>` },
      )}
    </div>
  `;
  // clang-format on
}

const listIsScrolling = new WeakMap<HTMLElement, boolean>();

function shouldKeepScrolledToBottom(listEl: HTMLElement): boolean {
  if (!listEl.checkVisibility()) {
    return false;
  }

  const isAtBottom = Math.abs(listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop) <= 1;

  // We shouldn't scroll to the bottom if the list wasn't already at the bottom.
  // However, if a new item appears while the animation for a previous item is still going,
  // then we should "finish" the scroll by sending another scroll command even if the scroll position
  // the element hasn't scrolled all the way to the bottom yet.
  return isAtBottom || Boolean(listIsScrolling.get(listEl));
}

function keepScrolledToBottom(listEl: HTMLElement): void {
  requestAnimationFrame(() => {
    listIsScrolling.set(listEl, true);
    listEl.addEventListener('scrollend', () => {
      listIsScrolling.set(listEl, false);
    }, {once: true});
    listEl.scrollTo({top: listEl.scrollHeight, behavior: 'smooth'});
  });
}

function renderInteractionsLog(input: ViewInput, output: ViewOutput): Lit.LitTemplate {
  if (!input.interactions.size) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <ol class="log"
      slot="interactions-log-content"
      ${Lit.Directives.ref(el => {
        if (el instanceof HTMLElement) {
          output.shouldKeepInteractionsScrolledToBottom = () => {
            return shouldKeepScrolledToBottom(el);
          };
          output.keepInteractionsScrolledToBottom = () => {
            keepScrolledToBottom(el);
          };
        }
      })}
    >
      ${input.interactions.values().map(interaction => {
        const metricValue = renderMetricValue(
          'timeline.landing.interaction-event-timing',
          interaction.duration,
          INP_THRESHOLDS,
          v => i18n.TimeUtilities.preciseMillisToString(v),
          {dim: true},
        );

        const isP98Excluded = input.inpValue && input.inpValue.value < interaction.duration;
        const isInp = input.inpValue?.interactionId === interaction.interactionId;

        return html`
          <li id=${interaction.interactionId} class="log-item interaction" tabindex="-1">
            <details>
              <summary>
                <span class="interaction-type">
                  ${interaction.interactionType} ${isInp ?
                    html`<span class="interaction-inp-chip" title=${i18nString(UIStrings.inpInteraction)}>INP</span>`
                  : nothing}
                </span>
                <span class="interaction-node">
                  ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {node: interaction.nodeRef})}
                </span>
                ${isP98Excluded ? html`<devtools-icon
                  class="interaction-info"
                  name="info"
                  title=${i18nString(UIStrings.interactionExcluded)}
                ></devtools-icon>` : nothing}
                <span class="interaction-duration">${metricValue}</span>
              </summary>
              <div class="subpart-table" role="table">
                <div class="subpart-table-row subpart-table-header-row" role="row">
                  <div role="columnheader">${i18nString(UIStrings.subpart)}</div>
                  <div role="columnheader">
                    ${interaction.longAnimationFrameTimings.length ? html`
                       <button
                         class="log-extra-details-button"
                         title=${i18nString(UIStrings.logToConsole)}
                         @click=${() => input.logExtraInteractionDetails(interaction)}
                       >${i18nString(UIStrings.duration)}</button>
                     ` : i18nString(UIStrings.duration)}
                  </div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.inputDelay)}</div>
                  <div role="cell">${Math.round(interaction.subparts.inputDelay)}</div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.processingDuration)}</div>
                  <div role="cell">${Math.round(interaction.subparts.processingDuration)}</div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.presentationDelay)}</div>
                  <div role="cell">${Math.round(interaction.subparts.presentationDelay)}</div>
                </div>
              </div>
            </details>
          </li>
        `;
      })}
    </ol>
  `;
  // clang-format on
}

function renderLayoutShiftsLog(input: ViewInput, output: ViewOutput): Lit.LitTemplate {
  if (!input.layoutShifts.length) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <ol class="log"
      slot="layout-shifts-log-content"
      ${Lit.Directives.ref(el => {
        if (el instanceof HTMLElement) {
          output.shouldKeepLayoutShiftsScrolledToBottom = () => {
            return shouldKeepScrolledToBottom(el);
          };
          output.keepLayoutShiftsScrolledToBottom = () => {
            keepScrolledToBottom(el);
          };
        }
      })}
    >
      ${input.layoutShifts.map(layoutShift => {
        const metricValue = renderMetricValue(
          'timeline.landing.layout-shift-event-score',
          layoutShift.score,
          CLS_THRESHOLDS,
          // CLS value is 2 decimal places, but individual shift scores tend to be much smaller
          // so we expand the precision here.
          v => v.toFixed(4),
          {dim: true},
        );

        return html`
          <li id=${layoutShift.uniqueLayoutShiftId} class="log-item layout-shift" tabindex="-1">
            <div class="layout-shift-score">Layout shift score: ${metricValue}</div>
            <div class="layout-shift-nodes">
              ${layoutShift.affectedNodeRefs.map(node => html`
                <div class="layout-shift-node">
                  ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {node})}
                </div>
              `)}
            </div>
          </li>
        `;
      })}
    </ol>
  `;
  // clang-format on
}

function renderLogSection(input: ViewInput, output: ViewOutput): Lit.LitTemplate {
  // clang-format off
  return html`
    <section
      class="logs-section"
      aria-label=${i18nString(UIStrings.eventLogs)}
    >
      <devtools-widget ${widget(LiveMetricsLogs, {
        selectedTab: input.highlightedInteractionId               ? 'interactions'
                   : input.highlightedLayoutShiftClusterIds?.size ? 'layout-shifts'
                   : undefined})}>
        ${renderInteractionsLog(input, output)}
        ${renderLayoutShiftsLog(input, output)}
      </devtools-widget>
    </section>
  `;
  // clang-format on
}

function renderNodeView(input: ViewInput): Lit.LitTemplate {
  return html`
    <style>${liveMetricsViewStyles}</style>
    <style>${metricValueStyles}</style>
    <div class="node-view">
      <main>
        <h2 class="section-title">${i18nString(UIStrings.nodePerformanceTimeline)}</h2>
        <div class="node-description">${i18nString(UIStrings.nodeClickToRecord)}</div>
        <div class="record-action-card">${renderRecordAction(input.toggleRecordAction)}</div>
      </main>
    </div>
  `;
}

export const DEFAULT_VIEW: View = (input, output, target) => {
  if (input.isNode) {
    Lit.render(renderNodeView(input), target);
    return;
  }

  const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;
  const liveMetricsTitle =
      fieldEnabled ? i18nString(UIStrings.localAndFieldMetrics) : i18nString(UIStrings.localMetrics);

  const helpLink = 'https://web.dev/articles/lab-and-field-data-differences#lab_data_versus_field_data' as
      Platform.DevToolsPath.UrlString;

  // clang-format off
  const outputTemplate = html`
    <style>${liveMetricsViewStyles}</style>
    <style>${metricValueStyles}</style>
    <div class="container">
      <div class="live-metrics-view">
        <main class="live-metrics">
          <div class="section-header">
            <h2 class="section-title">${liveMetricsTitle}</h2>
            ${input.navigationType === 'soft-navigation' ? html`<span class="badge">${i18nString(UIStrings.softNavigationPillText)}</span>` : nothing}
          </div>
          <div class="metric-cards">
            <div id="lcp">
              ${renderLcpCard(input)}
            </div>
            <div id="cls">
              ${renderClsCard(input)}
            </div>
            <div id="inp">
              ${renderInpCard(input)}
            </div>
          </div>
          <devtools-link
            href=${helpLink}
            class="local-field-link"
            title=${i18nString(UIStrings.localFieldLearnMoreTooltip)}
          >${i18nString(UIStrings.localFieldLearnMoreLink)}</devtools-link>
          ${renderLogSection(input, output)}
        </main>
        <aside class="next-steps" aria-labelledby="next-steps-section-title">
          <h2 id="next-steps-section-title" class="section-title">${i18nString(UIStrings.nextSteps)}</h2>
          <div id="field-setup" class="settings-card">
            <h3 class="card-title">${i18nString(UIStrings.fieldMetricsTitle)}</h3>
            ${renderFieldDataMessage(input.cruxManager)}
            ${renderPageScopeSetting(input)}
            ${renderDeviceScopeSetting(input)}
            <div class="field-setup-buttons">
              <devtools-field-settings-dialog></devtools-field-settings-dialog>
            </div>
          </div>
          <div id="recording-settings" class="settings-card">
            ${renderRecordingSettings(input)}
          </div>
          <div id="record" class="record-action-card">
            ${renderRecordAction(input.toggleRecordAction)}
          </div>
          <div id="record-page-load" class="record-action-card">
            ${renderRecordAction(input.recordReloadAction)}
          </div>
        </aside>
      </div>
    </div>
  `;
  // clang-format on
  Lit.render(outputTemplate, target);

  if (input.highlightedInteractionId) {
    const interactionEl = target.querySelector<HTMLElement>('#' + CSS.escape(input.highlightedInteractionId));
    if (interactionEl) {
      requestAnimationFrame(() => {
        interactionEl.scrollIntoView({
          block: 'center',
        });
        interactionEl.focus();
        UI.UIUtils.runCSSAnimationOnce(interactionEl, 'highlight');
      });
    }
  }

  if (input.highlightedLayoutShiftClusterIds?.size) {
    const layoutShiftEls: HTMLElement[] = [];
    for (const shiftId of input.highlightedLayoutShiftClusterIds) {
      const layoutShiftEl = target.querySelector<HTMLElement>('#' + CSS.escape(shiftId));
      if (layoutShiftEl) {
        layoutShiftEls.push(layoutShiftEl);
      }
    }

    if (layoutShiftEls.length) {
      requestAnimationFrame(() => {
        layoutShiftEls[0].scrollIntoView({
          block: 'start',
        });
        layoutShiftEls[0].focus();
        for (const layoutShiftEl of layoutShiftEls) {
          UI.UIUtils.runCSSAnimationOnce(layoutShiftEl, 'highlight');
        }
      });
    }
  }
};

export class LiveMetricsView extends UI.Widget.Widget {
  isNode: boolean = Root.Runtime.Runtime.isNode();

  #lcpValue?: LiveMetrics.LcpValue;
  #clsValue?: LiveMetrics.ClsValue;
  #inpValue?: LiveMetrics.InpValue;
  #navigationType?: Spec.NavigationType;
  #interactions: LiveMetrics.InteractionMap = new Map();
  #layoutShifts: LiveMetrics.LayoutShift[] = [];

  #highlightedInteractionId = '';
  #highlightedLayoutShiftClusterIds = new Set<string>();

  #cruxManager = CrUXManager.CrUXManager.instance();

  #toggleRecordAction: UI.ActionRegistration.Action;
  #recordReloadAction: UI.ActionRegistration.Action;

  #view: View;
  #viewOutput: ViewOutput = {};
  #deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;

    this.#toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.toggle-recording');
    this.#recordReloadAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.record-reload');
  }

  async #onMetricStatus(event: {data: LiveMetrics.StatusEvent}): Promise<void> {
    this.#lcpValue = event.data.lcp;
    this.#clsValue = event.data.cls;
    this.#inpValue = event.data.inp;
    this.#navigationType = event.data.navigationType;

    const hasNewLS = this.#layoutShifts.length < event.data.layoutShifts.length;
    this.#layoutShifts = [...event.data.layoutShifts];

    const hasNewInteraction = this.#interactions.size < event.data.interactions.size;
    this.#interactions = new Map(event.data.interactions);

    const shouldScrollInteractions = hasNewInteraction && this.#viewOutput.shouldKeepInteractionsScrolledToBottom?.();
    const shouldScrollLS = hasNewLS && this.#viewOutput.shouldKeepLayoutShiftsScrolledToBottom?.();

    this.requestUpdate();
    await this.updateComplete;

    if (shouldScrollInteractions) {
      this.#viewOutput.keepInteractionsScrolledToBottom?.();
    }

    if (shouldScrollLS) {
      this.#viewOutput.keepLayoutShiftsScrolledToBottom?.();
    }
  }

  #onFieldDataChanged(): void {
    this.requestUpdate();
  }

  #onEmulationChanged(): void {
    this.requestUpdate();
  }

  async #refreshFieldDataForCurrentPage(): Promise<void> {
    if (!this.isNode) {
      await this.#cruxManager.refresh();
    }
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener(LiveMetrics.Events.STATUS, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);

    this.#deviceModeModel?.addEventListener(
        EmulationModel.DeviceModeModel.Events.UPDATED, this.#onEmulationChanged, this);

    if (cruxManager.getConfigSetting().get().enabled) {
      void this.#refreshFieldDataForCurrentPage();
    }

    this.#lcpValue = liveMetrics.lcpValue;
    this.#clsValue = liveMetrics.clsValue;
    this.#inpValue = liveMetrics.inpValue;
    this.#interactions = liveMetrics.interactions;
    this.#layoutShifts = liveMetrics.layoutShifts;
    this.#navigationType = liveMetrics.navigationType;
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    LiveMetrics.LiveMetrics.instance().removeEventListener(LiveMetrics.Events.STATUS, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.removeEventListener(CrUXManager.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);

    this.#deviceModeModel?.removeEventListener(
        EmulationModel.DeviceModeModel.Events.UPDATED, this.#onEmulationChanged, this);
  }

  #onPageScopeMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    if (event.itemValue === 'url') {
      this.#cruxManager.fieldPageScope = 'url';
    } else {
      this.#cruxManager.fieldPageScope = 'origin';
    }
    this.requestUpdate();
  }

  #onDeviceOptionMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.#cruxManager.fieldDeviceOption = event.itemValue as DeviceOption;
    this.requestUpdate();
  }

  async #revealInteraction(interaction: LiveMetrics.Interaction): Promise<void> {
    this.#highlightedInteractionId = interaction.interactionId;
    this.requestUpdate();
    await this.updateComplete;
    this.#highlightedInteractionId = '';
  }

  async #logExtraInteractionDetails(interaction: LiveMetrics.Interaction): Promise<void> {
    const success = await LiveMetrics.LiveMetrics.instance().logInteractionScripts(interaction);
    if (success) {
      await Common.Console.Console.instance().showPromise();
    }
  }

  async #revealLayoutShiftCluster(clusterIds: Set<LiveMetrics.LayoutShift['uniqueLayoutShiftId']>): Promise<void> {
    this.#highlightedLayoutShiftClusterIds = clusterIds;
    this.requestUpdate();
    await this.updateComplete;
    this.#highlightedLayoutShiftClusterIds = new Set();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      isNode: this.isNode,
      lcpValue: this.#lcpValue,
      clsValue: this.#clsValue,
      inpValue: this.#inpValue,
      interactions: this.#interactions,
      layoutShifts: this.#layoutShifts,
      toggleRecordAction: this.#toggleRecordAction,
      recordReloadAction: this.#recordReloadAction,
      cruxManager: this.#cruxManager,
      handlePageScopeSelected: this.#onPageScopeMenuItemSelected.bind(this),
      handleDeviceOptionSelected: this.#onDeviceOptionMenuItemSelected.bind(this),
      revealLayoutShiftCluster: this.#revealLayoutShiftCluster.bind(this),
      revealInteraction: this.#revealInteraction.bind(this),
      logExtraInteractionDetails: this.#logExtraInteractionDetails.bind(this),
      highlightedInteractionId: this.#highlightedInteractionId,
      highlightedLayoutShiftClusterIds: this.#highlightedLayoutShiftClusterIds,
      navigationType: this.#navigationType,
    };

    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }
}

interface LiveMetricsLogsViewInput {
  onClear: () => void;
  selectedTab?: string;
  onTabSelected: (tabId: string) => void;
}

type LiveMetricsLogsView = (input: LiveMetricsLogsViewInput, output: undefined, target: HTMLElement) => void;

const LIVE_METRICS_LOGS_VIEW: LiveMetricsLogsView = (input, output, target) => {
  // clang-format off
  Lit.render(html`
    <style>
      /* Any children of the root element will be matched to the slots defined within the container
         widget's shadow DOM. */
      :host,
      .widget {
        display: contents;
      }
    </style>
    <devtools-tabbed-pane @select=${(event: Event) => input.onTabSelected((event as CustomEvent).detail.tabId)}>
      <devtools-toolbar slot="right">
        <devtools-button .iconName=${'clear'} .variant=${Buttons.Button.Variant.TOOLBAR}
                         title=${i18nString(UIStrings.clearCurrentLog)} @click=${input.onClear}
                         .jslogContext=${'timeline.landing.clear-log'}>
        </devtools-button>
      </devtools-toolbar>
      <!-- Taking advantage of web component slots allows us to render updates in the lit templates defined in the
      main component. This should be more performant and doesn't require us to inject live metrics styles twice. -->
      <slot name="interactions-log-content" id="interactions" ?selected=${live(input.selectedTab === 'interactions')}
            title=${i18nString(UIStrings.interactions)} jslogcontext="timeline.landing.interactions-log">
      </slot>
      <slot name="layout-shifts-log-content" id="layout-shifts" ?selected=${live(input.selectedTab === 'layout-shifts')}
            title=${i18nString(UIStrings.layoutShifts)} jslogcontext="timeline.landing.layout-shifts-log">
      </slot>
    </devtools-tabbed-pane>
  `, target);
  // clang-format on
};

class LiveMetricsLogs extends UI.Widget.Widget {
  #view: LiveMetricsLogsView;
  #selectedTab = 'interactions';

  set selectedTab(tabId: string|undefined) {
    if (!tabId || this.#selectedTab === tabId) {
      return;
    }
    this.#selectedTab = tabId;
    this.requestUpdate();
  }

  #clearCurrentLog(): void {
    const liveMetrics = LiveMetrics.LiveMetrics.instance();

    switch (this.#selectedTab) {
      case 'interactions':
        liveMetrics.clearInteractions();
        break;
      case 'layout-shifts':
        liveMetrics.clearLayoutShifts();
        break;
    }
  }
  constructor(element: HTMLElement, view: LiveMetricsLogsView = LIVE_METRICS_LOGS_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;

    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: LiveMetricsLogsViewInput = {
      onClear: this.#clearCurrentLog.bind(this),
      selectedTab: this.#selectedTab,
      onTabSelected: (tabId: string) => {
        this.selectedTab = tabId;
      },
    };

    this.#view(viewInput, undefined, this.contentElement);
  }
}
