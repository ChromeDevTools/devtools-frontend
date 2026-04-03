// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/settings/settings.js';
import '../../../ui/kit/kit.js';
import './FieldSettingsDialog.js';
import './NetworkThrottlingSelector.js';
import '../../../ui/components/menus/menus.js';
import './MetricCard.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../../common/common.js';
import { CPUThrottlingSelector } from './CPUThrottlingSelector.js';
import { md } from './insights/Helpers.js';
import liveMetricsViewStyles from './liveMetricsView.css.js';
import metricValueStyles from './metricValueStyles.css.js';
import { CLS_THRESHOLDS, INP_THRESHOLDS, renderMetricValue } from './Utils.js';
const { html, nothing, Directives: { live } } = Lit;
const { widget } = UI.Widget;
const DEVICE_OPTION_LIST = ['AUTO', ...CrUXManager.DEVICE_SCOPE_LIST];
const RTT_MINIMUM = 60;
const UIStrings = {
    /**
     * @description Title of a view that shows performance metrics from the local environment and field metrics collected from real users. "field metrics" should be interpreted as "real user metrics".
     */
    localAndFieldMetrics: 'Local and field metrics',
    /**
     * @description Title of a view that shows performance metrics from the local environment.
     */
    localMetrics: 'Local metrics',
    /**
     *@description Text for the link to the historical field data for the specific URL or origin that is shown. This link text appears in parenthesis after the collection period information in the field data dialog. The link opens the CrUX Vis viewer (https://cruxvis.withgoogle.com).
     */
    fieldDataHistoryLink: 'View history',
    /**
     *@description Tooltip for the CrUX Vis viewer link which shows the history of the field data for the specific URL or origin.
     */
    fieldDataHistoryTooltip: 'View field data history in CrUX Vis',
    /**
     * @description Accessible label for a section that logs user interactions and layout shifts. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user.
     */
    eventLogs: 'Interaction and layout shift logs section',
    /**
     * @description Title of a section that lists user interactions.
     */
    interactions: 'Interactions',
    /**
     * @description Title of a section that lists layout shifts. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user.
     */
    layoutShifts: 'Layout shifts',
    /**
     * @description Title of a sidebar section that shows options for the user to take after using the main view.
     */
    nextSteps: 'Next steps',
    /**
     * @description Title of a section that shows options for how real user data in the field should be fetched. This should be interpreted as "Real user data".
     */
    fieldMetricsTitle: 'Field metrics',
    /**
     * @description Title of a section that shows settings to control the developers local testing environment.
     */
    environmentSettings: 'Environment settings',
    /**
     * @description Label for an select box that selects which device type field metrics be shown for (e.g. desktop/mobile/all devices/etc). "field metrics" should be interpreted as "real user data".
     * @example {Mobile} PH1
     */
    showFieldDataForDevice: 'Show field metrics for device type: {PH1}',
    /**
     * @description Text indicating that there is not enough data to report real user statistics.
     */
    notEnoughData: 'Not enough data',
    /**
     * @description Label for a text block that describes the network connections of real users.
     * @example {75th percentile is similar to Slow 4G throttling} PH1
     */
    network: 'Network: {PH1}',
    /**
     * @description Label for an select box that selects which device type real user data should be shown for (e.g. desktop/mobile/all devices/etc).
     * @example {Mobile} PH1
     */
    device: 'Device: {PH1}',
    /**
     * @description Label for an option to select all device form factors.
     */
    allDevices: 'All devices',
    /**
     * @description Label for an option to select the desktop form factor.
     */
    desktop: 'Desktop',
    /**
     * @description Label for an option to select the mobile form factor.
     */
    mobile: 'Mobile',
    /**
     * @description Label for an option to select the tablet form factor.
     */
    tablet: 'Tablet',
    /**
     * @description Label for an option to to automatically select the form factor. The automatic selection will be displayed in PH1.
     * @example {Desktop} PH1
     */
    auto: 'Auto ({PH1})',
    /**
     * @description Label for an option that is loading.
     * @example {Desktop} PH1
     */
    loadingOption: '{PH1} - Loading…',
    /**
     * @description Label for an option that does not have enough data and the user should ignore.
     * @example {Desktop} PH1
     */
    needsDataOption: '{PH1} - No data',
    /**
     * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
     */
    urlOption: 'URL',
    /**
     * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
     */
    originOption: 'Origin',
    /**
     * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
     * @example {https://example.com/} PH1
     */
    urlOptionWithKey: 'URL: {PH1}',
    /**
     * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
     * @example {https://example.com} PH1
     */
    originOptionWithKey: 'Origin: {PH1}',
    /**
     * @description Label for an combo-box that indicates if field metrics should be taken from the page's URL or it's origin/domain. "field metrics" should be interpreted as "real user data".
     * @example {Origin: https://example.com} PH1
     */
    showFieldDataForPage: 'Show field metrics for {PH1}',
    /**
     * @description Tooltip text explaining that real user connections are similar to a test environment with no throttling. "throttling" is when the network is intentionally slowed down to simulate a slower connection.
     */
    tryDisablingThrottling: '75th percentile is too fast to simulate with throttling',
    /**
     * @description Tooltip text explaining that real user connections are similar to a specif network throttling setup. "throttling" is when the network is intentionally slowed down to simulate a slower connection.
     * @example {Slow 4G} PH1
     */
    tryUsingThrottling: '75th percentile is similar to {PH1} throttling',
    /**
     * @description Text block listing what percentage of real users are on different device form factors.
     * @example {60%} PH1
     * @example {30%} PH2
     */
    percentDevices: '{PH1}% mobile, {PH2}% desktop',
    /**
     * @description Text block explaining how to simulate different mobile and desktop devices.
     */
    useDeviceToolbar: 'Use the [device toolbar](https://developer.chrome.com/docs/devtools/device-mode) and configure throttling to simulate real user environments and identify more performance issues.',
    /**
     * @description Text label for a checkbox that controls if the network cache is disabled.
     */
    disableNetworkCache: 'Disable network cache',
    /**
     * @description Text label for a link to the Largest Contentful Paint (LCP) related page element. This element represents the largest content on the page. "LCP" should not be translated.
     */
    lcpElement: 'LCP element',
    /**
     * @description Text label for a button that reveals the user interaction associated with the Interaction to Next Paint (INP) performance metric. "INP" should not be translated.
     */
    inpInteractionLink: 'INP interaction',
    /**
     * @description Text label for a button that reveals the cluster of layout shift events that affected the page content the most. A cluster is a group of layout shift events that occur in quick succession.
     */
    worstCluster: 'Worst cluster',
    /**
     * @description [ICU Syntax] Text content of a button that reveals the cluster of layout shift events that affected the page content the most. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user. This text will indicate how many shifts were in the cluster.
     * @example {3} shiftCount
     */
    numShifts: `{shiftCount, plural,
    =1 {{shiftCount} shift}
    other {{shiftCount} shifts}
  }`,
    /**
     * @description Label for a a range of dates that represents the period of time a set of field metrics is collected from.
     * @example {Oct 1, 2024 - Nov 1, 2024} PH1
     */
    collectionPeriod: 'Collection period: {PH1}',
    /**
     * @description Text showing a range of dates meant to represent a period of time.
     * @example {Oct 1, 2024} PH1
     * @example {Nov 1, 2024} PH2
     */
    dateRange: '{PH1} - {PH2}',
    /**
     * @description Text block telling the user to see how performance metrics measured on their local computer compare to data collected from real users. PH1 will be a link to more information about the Chrome UX Report and the link text will be untranslated because it is a product name.
     * @example {Chrome UX Report} PH1
     */
    seeHowYourLocalMetricsCompare: 'See how your local metrics compare to real user data in the {PH1}.',
    /**
     * @description Text for a link that goes to more documentation about local and field metrics. "Local" refers to performance metrics measured in the developers local environment. "field metrics" should be interpreted as "real user data".
     */
    localFieldLearnMoreLink: 'Learn more about local and field metrics',
    /**
     * @description Tooltip text for a link that goes to documentation explaining the difference between local and field metrics. "Local metrics" are performance metrics measured in the developers local environment. "field metrics" should be interpreted as "real user data".
     */
    localFieldLearnMoreTooltip: 'Local metrics are captured from the current page using your network connection and device. field metrics is measured by real users using many different network connections and devices.',
    /**
     * @description Tooltip text explaining that this user interaction was ignored when calculating the Interaction to Next Paint (INP) metric because the interaction delay fell beyond the 98th percentile of interaction delays on this page. "INP" is an acronym and should not be translated.
     */
    interactionExcluded: 'INP is calculated using the 98th percentile of interaction delays, so some interaction delays may be larger than the INP value.',
    /**
     * @description Tooltip for a button that will remove everything from the currently selected log.
     */
    clearCurrentLog: 'Clear the current log',
    /**
     * @description Title for a page load phase that measures the time between when the page load starts and the time when the first byte of the initial document is downloaded.
     */
    timeToFirstByte: 'Time to first byte',
    /**
     * @description Title for a page load phase that measures the time between when the first byte of the initial document is downloaded and when the request for the largest image content starts.
     */
    resourceLoadDelay: 'Resource load delay',
    /**
     * @description Title for a page load phase that measures the time between when the request for the largest image content starts and when it finishes.
     */
    resourceLoadDuration: 'Resource load duration',
    /**
     * @description Title for a page load phase that measures the time between when the request for the largest image content finishes and when the largest image element is rendered on the page.
     */
    elementRenderDelay: 'Element render delay',
    /**
     * @description Title for a phase during a user interaction that measures the time between when the interaction starts and when the browser starts running interaction handlers.
     */
    inputDelay: 'Input delay',
    /**
     * @description Title for a phase during a user interaction that measures the time between when the browser starts running interaction handlers and when the browser finishes running interaction handlers.
     */
    processingDuration: 'Processing duration',
    /**
     * @description Title for a phase during a user interaction that measures the time between when the browser finishes running interaction handlers and when the browser renders the next visual frame that shows the result of the interaction.
     */
    presentationDelay: 'Presentation delay',
    /**
     * @description Tooltip text for a status chip in a list of user interactions that indicates if the associated interaction is the interaction used in the Interaction to Next Paint (INP) performance metric because it's interaction delay is at the 98th percentile.
     */
    inpInteraction: 'The INP interaction is at the 98th percentile of interaction delays.',
    /**
     * @description Tooltip text for a button that reveals the user interaction associated with the Interaction to Next Paint (INP) performance metric.
     */
    showInpInteraction: 'Go to the INP interaction.',
    /**
     * @description Tooltip text for a button that reveals the cluster of layout shift events that affected the page content the most. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user. A cluster is a group of layout shift events that occur in quick succession.
     */
    showClsCluster: 'Go to worst layout shift cluster.',
    /**
     * @description Column header for table cell values representing the phase/component/stage/section of a larger duration.
     */
    phase: 'Phase',
    /**
     * @description Column header for table cell values representing a phase duration (in milliseconds) that was measured in the developers local environment.
     */
    duration: 'Local duration (ms)',
    /**
     * @description Tooltip text for a button that will open the Chrome DevTools console to and log additional details about a user interaction.
     */
    logToConsole: 'Log additional interaction data to the console',
    /**
     * @description Title of a view that can be used to analyze the performance of a Node process as a timeline. "Node" is a product name and should not be translated.
     */
    nodePerformanceTimeline: 'Node performance',
    /**
     * @description Description of a view that can be used to analyze the performance of a Node process as a timeline. "Node" is a product name and should not be translated.
     */
    nodeClickToRecord: 'Record a performance timeline of the connected Node process.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LiveMetricsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function getLcpFieldPhases(cruxManager) {
    const ttfb = cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_time_to_first_byte')?.percentiles?.p75;
    const loadDelay = cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_resource_load_delay')?.percentiles?.p75;
    const loadDuration = cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_resource_load_duration')?.percentiles?.p75;
    const renderDelay = cruxManager.getSelectedFieldMetricData('largest_contentful_paint_image_element_render_delay')?.percentiles?.p75;
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
function getNetworkRecTitle(cruxManager) {
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
    return i18nString(UIStrings.tryUsingThrottling, { PH1: title });
}
function getDeviceRec(cruxManager) {
    // `form_factors` metric is only populated if CrUX data is fetched for all devices.
    const fractions = cruxManager.getFieldResponse(cruxManager.fieldPageScope, 'ALL')?.record.metrics.form_factors?.fractions;
    if (!fractions) {
        return null;
    }
    return i18nString(UIStrings.percentDevices, {
        PH1: Math.round(fractions.phone * 100),
        PH2: Math.round(fractions.desktop * 100),
    });
}
function getPageScopeLabel(cruxManager, pageScope) {
    const key = cruxManager.pageResult?.[`${pageScope}-ALL`]?.record.key[pageScope];
    if (key) {
        return pageScope === 'url' ? i18nString(UIStrings.urlOptionWithKey, { PH1: key }) :
            i18nString(UIStrings.originOptionWithKey, { PH1: key });
    }
    const baseLabel = pageScope === 'url' ? i18nString(UIStrings.urlOption) : i18nString(UIStrings.originOption);
    return i18nString(UIStrings.needsDataOption, { PH1: baseLabel });
}
function getDeviceScopeDisplayName(deviceScope) {
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
function getLabelForDeviceOption(cruxManager, deviceOption) {
    let baseLabel;
    if (deviceOption === 'AUTO') {
        const deviceScope = cruxManager.resolveDeviceOptionToScope(deviceOption);
        const deviceScopeLabel = getDeviceScopeDisplayName(deviceScope);
        baseLabel = i18nString(UIStrings.auto, { PH1: deviceScopeLabel });
    }
    else {
        baseLabel = getDeviceScopeDisplayName(deviceOption);
    }
    if (!cruxManager.pageResult) {
        return i18nString(UIStrings.loadingOption, { PH1: baseLabel });
    }
    const result = cruxManager.getSelectedFieldResponse();
    if (!result) {
        return i18nString(UIStrings.needsDataOption, { PH1: baseLabel });
    }
    return baseLabel;
}
function getCollectionPeriodRange(cruxManager) {
    const selectedResponse = cruxManager.getSelectedFieldResponse();
    if (!selectedResponse) {
        return null;
    }
    const { firstDate, lastDate } = selectedResponse.record.collectionPeriod;
    const formattedFirstDate = new Date(firstDate.year, 
    // CrUX month is 1-indexed but `Date` month is 0-indexed
    firstDate.month - 1, firstDate.day);
    const formattedLastDate = new Date(lastDate.year, 
    // CrUX month is 1-indexed but `Date` month is 0-indexed
    lastDate.month - 1, lastDate.day);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return i18nString(UIStrings.dateRange, {
        PH1: formattedFirstDate.toLocaleDateString(undefined, options),
        PH2: formattedLastDate.toLocaleDateString(undefined, options),
    });
}
function createMetricCardRef(cardData) {
    return Lit.Directives.ref(el => {
        if (el instanceof HTMLElement) {
            el.data = {
                ...cardData,
                tooltipContainer: el.closest('.metric-cards') || undefined,
            };
        }
    });
}
function renderLcpCard(input) {
    const fieldData = input.cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
    const nodeLink = input.lcpValue?.nodeRef && PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(input.lcpValue?.nodeRef);
    const phases = input.lcpValue?.phases;
    const fieldPhases = getLcpFieldPhases(input.cruxManager);
    // clang-format off
    return html `
    <devtools-metric-card ${createMetricCardRef({
        metric: 'LCP',
        localValue: input.lcpValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        warnings: input.lcpValue?.warnings,
        phases: phases && [
            [i18nString(UIStrings.timeToFirstByte), phases.timeToFirstByte, fieldPhases?.timeToFirstByte],
            [i18nString(UIStrings.resourceLoadDelay), phases.resourceLoadDelay, fieldPhases?.resourceLoadDelay],
            [i18nString(UIStrings.resourceLoadDuration), phases.resourceLoadTime, fieldPhases?.resourceLoadTime],
            [i18nString(UIStrings.elementRenderDelay), phases.elementRenderDelay, fieldPhases?.elementRenderDelay],
        ],
    })}>
      ${nodeLink ? html `
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${i18nString(UIStrings.lcpElement)}</span>
            <span class="related-info-link">
             ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: input.lcpValue?.nodeRef })}
            </span>
          </div>
        `
        : nothing}
    </devtools-metric-card>
  `;
    // clang-format on
}
function renderClsCard(input) {
    const fieldData = input.cruxManager.getSelectedFieldMetricData('cumulative_layout_shift');
    const clusterIds = new Set(input.clsValue?.clusterShiftIds || []);
    const clusterIsVisible = clusterIds.size > 0 && input.layoutShifts.some(layoutShift => clusterIds.has(layoutShift.uniqueLayoutShiftId));
    // clang-format off
    return html `
    <devtools-metric-card ${createMetricCardRef({
        metric: 'CLS',
        localValue: input.clsValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        warnings: input.clsValue?.warnings,
    })}>
      ${clusterIsVisible ? html `
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString(UIStrings.worstCluster)}</span>
          <button
            class="link-to-log"
            title=${i18nString(UIStrings.showClsCluster)}
            @click=${() => input.revealLayoutShiftCluster(clusterIds)}
            jslog=${VisualLogging.action('timeline.landing.show-cls-cluster').track({ click: true })}
          >${i18nString(UIStrings.numShifts, { shiftCount: clusterIds.size })}</button>
        </div>
      ` : nothing}
    </devtools-metric-card>
  `;
    // clang-format on
}
function renderInpCard(input) {
    const fieldData = input.cruxManager.getSelectedFieldMetricData('interaction_to_next_paint');
    const phases = input.inpValue?.phases;
    const interaction = input.inpValue && input.interactions.get(input.inpValue.interactionId);
    // clang-format off
    return html `
    <devtools-metric-card ${createMetricCardRef({
        metric: 'INP',
        localValue: input.inpValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        warnings: input.inpValue?.warnings,
        phases: phases && [
            [i18nString(UIStrings.inputDelay), phases.inputDelay],
            [i18nString(UIStrings.processingDuration), phases.processingDuration],
            [i18nString(UIStrings.presentationDelay), phases.presentationDelay],
        ],
    })}>
      ${interaction ? html `
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString(UIStrings.inpInteractionLink)}</span>
          <button
            class="link-to-log"
            title=${i18nString(UIStrings.showInpInteraction)}
            @click=${() => input.revealInteraction(interaction)}
            jslog=${VisualLogging.action('timeline.landing.show-inp-interaction').track({ click: true })}
          >${interaction.interactionType}</button>
        </div>
      ` : nothing}
    </devtools-metric-card>
  `;
    // clang-format on
}
function renderRecordAction(action) {
    function onClick() {
        void action.execute();
    }
    // clang-format off
    return html `
    <div class="record-action">
      <devtools-button @click=${onClick} .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        iconName: action.icon(),
        title: action.title(),
        jslogContext: action.id(),
    }}>
        ${action.title()}
      </devtools-button>
      <span class="shortcut-label">${UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action.id())}</span>
    </div>
  `;
    // clang-format on
}
function renderRecordingSettings(input) {
    const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;
    const deviceRec = getDeviceRec(input.cruxManager) || i18nString(UIStrings.notEnoughData);
    const networkRec = getNetworkRecTitle(input.cruxManager) || i18nString(UIStrings.notEnoughData);
    const recs = PanelsCommon.ThrottlingUtils.getThrottlingRecommendations();
    // clang-format off
    return html `
    <h3 class="card-title">${i18nString(UIStrings.environmentSettings)}</h3>
    <div class="device-toolbar-description">${md(i18nString(UIStrings.useDeviceToolbar))}</div>
    ${fieldEnabled ? html `
      <ul class="environment-recs-list">
        <li>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.device, { PH1: html `<span class="environment-rec">${deviceRec}</span>` })}</li>
        <li>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.network, { PH1: html `<span class="environment-rec">${networkRec}</span>` })}</li>
      </ul>
    ` : nothing}
    <div class="environment-option">
      ${widget(CPUThrottlingSelector, { recommendedOption: recs.cpuOption })}
    </div>
    <div class="environment-option">
      <devtools-network-throttling-selector .recommendedConditions=${recs.networkConditions}></devtools-network-throttling-selector>
    </div>
    <div class="environment-option">
      <setting-checkbox
        class="network-cache-setting"
        .data=${{
        setting: Common.Settings.Settings.instance().moduleSetting('cache-disabled'),
        textOverride: i18nString(UIStrings.disableNetworkCache),
    }}
      ></setting-checkbox>
    </div>
  `;
    // clang-format on
}
function renderPageScopeSetting(input) {
    if (!input.cruxManager.getConfigSetting().get().enabled) {
        return Lit.nothing;
    }
    const urlLabel = getPageScopeLabel(input.cruxManager, 'url');
    const originLabel = getPageScopeLabel(input.cruxManager, 'origin');
    const buttonTitle = input.cruxManager.fieldPageScope === 'url' ? urlLabel : originLabel;
    const accessibleTitle = i18nString(UIStrings.showFieldDataForPage, { PH1: buttonTitle });
    // If there is no data at all we should force users to switch pages or reconfigure CrUX.
    const shouldDisable = !input.cruxManager.pageResult?.['url-ALL'] && !input.cruxManager.pageResult?.['origin-ALL'];
    /* eslint-disable @devtools/no-deprecated-component-usages */
    return html `
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
function renderDeviceScopeSetting(input) {
    if (!input.cruxManager.getConfigSetting().get().enabled) {
        return Lit.nothing;
    }
    // If there is no data at all we should force users to try adjusting the page scope
    // before coming back to this option.
    const shouldDisable = !input.cruxManager.getFieldResponse(input.cruxManager.fieldPageScope, 'ALL');
    const currentDeviceLabel = getLabelForDeviceOption(input.cruxManager, input.cruxManager.fieldDeviceOption);
    // clang-format off
    /* eslint-disable @devtools/no-deprecated-component-usages */
    return html `
    <devtools-select-menu
      id="device-scope-select"
      class="field-data-option"
      @selectmenuselected=${input.handleDeviceOptionSelected}
      .showDivider=${true}
      .showArrow=${true}
      .sideButton=${false}
      .showSelectedItem=${true}
      .buttonTitle=${i18nString(UIStrings.device, { PH1: currentDeviceLabel })}
      .disabled=${shouldDisable}
      title=${i18nString(UIStrings.showFieldDataForDevice, { PH1: currentDeviceLabel })}
    >
      ${DEVICE_OPTION_LIST.map(deviceOption => {
        return html `
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
function renderFieldDataHistoryLink(cruxManager) {
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
    return html `
      (<devtools-link href=${cruxVis}
               class="local-field-link"
               title=${i18nString(UIStrings.fieldDataHistoryTooltip)}
      >${i18nString(UIStrings.fieldDataHistoryLink)}</devtools-link>)
    `;
}
function renderCollectionPeriod(cruxManager) {
    const range = getCollectionPeriodRange(cruxManager);
    const dateText = range || i18nString(UIStrings.notEnoughData);
    const fieldDataHistoryLink = range ? renderFieldDataHistoryLink(cruxManager) : Lit.nothing;
    const warnings = cruxManager.pageResult?.warnings || [];
    return html `
    <div class="field-data-message">
      <div>${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.collectionPeriod, {
        PH1: html `<span class="collection-period-range">${dateText}</span>`,
    })} ${fieldDataHistoryLink}</div>
      ${warnings.map(warning => html `
        <div class="field-data-warning">${warning}</div>
      `)}
    </div>
  `;
}
function renderFieldDataMessage(cruxManager) {
    if (cruxManager.getConfigSetting().get().enabled) {
        return renderCollectionPeriod(cruxManager);
    }
    // clang-format off
    return html `
    <div class="field-data-message">
      ${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.seeHowYourLocalMetricsCompare, { PH1: html `<devtools-link href="https://developer.chrome.com/docs/crux">${i18n.i18n.lockedString('Chrome UX Report')}</devtools-link>` })}
    </div>
  `;
    // clang-format on
}
const listIsScrolling = new WeakMap();
function shouldKeepScrolledToBottom(listEl) {
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
function keepScrolledToBottom(listEl) {
    requestAnimationFrame(() => {
        listIsScrolling.set(listEl, true);
        listEl.addEventListener('scrollend', () => {
            listIsScrolling.set(listEl, false);
        }, { once: true });
        listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
    });
}
function renderInteractionsLog(input, output) {
    if (!input.interactions.size) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
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
        const metricValue = renderMetricValue('timeline.landing.interaction-event-timing', interaction.duration, INP_THRESHOLDS, v => i18n.TimeUtilities.preciseMillisToString(v), { dim: true });
        const isP98Excluded = input.inpValue && input.inpValue.value < interaction.duration;
        const isInp = input.inpValue?.interactionId === interaction.interactionId;
        return html `
          <li id=${interaction.interactionId} class="log-item interaction" tabindex="-1">
            <details>
              <summary>
                <span class="interaction-type">
                  ${interaction.interactionType} ${isInp ?
            html `<span class="interaction-inp-chip" title=${i18nString(UIStrings.inpInteraction)}>INP</span>`
            : nothing}
                </span>
                <span class="interaction-node">
                  ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: interaction.nodeRef })}
                </span>
                ${isP98Excluded ? html `<devtools-icon
                  class="interaction-info"
                  name="info"
                  title=${i18nString(UIStrings.interactionExcluded)}
                ></devtools-icon>` : nothing}
                <span class="interaction-duration">${metricValue}</span>
              </summary>
              <div class="phase-table" role="table">
                <div class="phase-table-row phase-table-header-row" role="row">
                  <div role="columnheader">${i18nString(UIStrings.phase)}</div>
                  <div role="columnheader">
                    ${interaction.longAnimationFrameTimings.length ? html `
                      <button
                        class="log-extra-details-button"
                        title=${i18nString(UIStrings.logToConsole)}
                        @click=${() => input.logExtraInteractionDetails(interaction)}
                      >${i18nString(UIStrings.duration)}</button>
                    ` : i18nString(UIStrings.duration)}
                  </div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.inputDelay)}</div>
                  <div role="cell">${Math.round(interaction.phases.inputDelay)}</div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.processingDuration)}</div>
                  <div role="cell">${Math.round(interaction.phases.processingDuration)}</div>
                </div>
                <div class="phase-table-row" role="row">
                  <div role="cell">${i18nString(UIStrings.presentationDelay)}</div>
                  <div role="cell">${Math.round(interaction.phases.presentationDelay)}</div>
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
function renderLayoutShiftsLog(input, output) {
    if (!input.layoutShifts.length) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
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
        const metricValue = renderMetricValue('timeline.landing.layout-shift-event-score', layoutShift.score, CLS_THRESHOLDS, 
        // CLS value is 2 decimal places, but individual shift scores tend to be much smaller
        // so we expand the precision here.
        v => v.toFixed(4), { dim: true });
        return html `
          <li id=${layoutShift.uniqueLayoutShiftId} class="log-item layout-shift" tabindex="-1">
            <div class="layout-shift-score">Layout shift score: ${metricValue}</div>
            <div class="layout-shift-nodes">
              ${layoutShift.affectedNodeRefs.map(node => html `
                <div class="layout-shift-node">
                  ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, { node })}
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
function renderLogSection(input, output) {
    // clang-format off
    return html `
    <section
      class="logs-section"
      aria-label=${i18nString(UIStrings.eventLogs)}
    >
      <devtools-widget ${widget(LiveMetricsLogs, {
        selectedTab: input.highlightedInteractionId ? 'interactions'
            : input.highlightedLayoutShiftClusterIds?.size ? 'layout-shifts'
                : undefined
    })}>
        ${renderInteractionsLog(input, output)}
        ${renderLayoutShiftsLog(input, output)}
      </devtools-widget>
    </section>
  `;
    // clang-format on
}
function renderNodeView(input) {
    return html `
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
export const DEFAULT_VIEW = (input, output, target) => {
    if (input.isNode) {
        Lit.render(renderNodeView(input), target);
        return;
    }
    const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;
    const liveMetricsTitle = fieldEnabled ? i18nString(UIStrings.localAndFieldMetrics) : i18nString(UIStrings.localMetrics);
    const helpLink = 'https://web.dev/articles/lab-and-field-data-differences#lab_data_versus_field_data';
    // clang-format off
    const outputTemplate = html `
    <style>${liveMetricsViewStyles}</style>
    <style>${metricValueStyles}</style>
    <div class="container">
      <div class="live-metrics-view">
        <main class="live-metrics">
          <h2 class="section-title">${liveMetricsTitle}</h2>
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
        const interactionEl = target.querySelector('#' + CSS.escape(input.highlightedInteractionId));
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
        const layoutShiftEls = [];
        for (const shiftId of input.highlightedLayoutShiftClusterIds) {
            const layoutShiftEl = target.querySelector('#' + CSS.escape(shiftId));
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
    isNode = Root.Runtime.Runtime.isNode();
    #lcpValue;
    #clsValue;
    #inpValue;
    #interactions = new Map();
    #layoutShifts = [];
    #highlightedInteractionId = '';
    #highlightedLayoutShiftClusterIds = new Set();
    #cruxManager = CrUXManager.CrUXManager.instance();
    #toggleRecordAction;
    #recordReloadAction;
    #view;
    #viewOutput = {};
    #deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.#toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.toggle-recording');
        this.#recordReloadAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.record-reload');
    }
    async #onMetricStatus(event) {
        this.#lcpValue = event.data.lcp;
        this.#clsValue = event.data.cls;
        this.#inpValue = event.data.inp;
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
    #onFieldDataChanged() {
        this.requestUpdate();
    }
    #onEmulationChanged() {
        this.requestUpdate();
    }
    async #refreshFieldDataForCurrentPage() {
        if (!this.isNode) {
            await this.#cruxManager.refresh();
        }
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        const liveMetrics = LiveMetrics.LiveMetrics.instance();
        liveMetrics.addEventListener("status" /* LiveMetrics.Events.STATUS */, this.#onMetricStatus, this);
        const cruxManager = CrUXManager.CrUXManager.instance();
        cruxManager.addEventListener("field-data-changed" /* CrUXManager.Events.FIELD_DATA_CHANGED */, this.#onFieldDataChanged, this);
        this.#deviceModeModel?.addEventListener("Updated" /* EmulationModel.DeviceModeModel.Events.UPDATED */, this.#onEmulationChanged, this);
        if (cruxManager.getConfigSetting().get().enabled) {
            void this.#refreshFieldDataForCurrentPage();
        }
        this.#lcpValue = liveMetrics.lcpValue;
        this.#clsValue = liveMetrics.clsValue;
        this.#inpValue = liveMetrics.inpValue;
        this.#interactions = liveMetrics.interactions;
        this.#layoutShifts = liveMetrics.layoutShifts;
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        LiveMetrics.LiveMetrics.instance().removeEventListener("status" /* LiveMetrics.Events.STATUS */, this.#onMetricStatus, this);
        const cruxManager = CrUXManager.CrUXManager.instance();
        cruxManager.removeEventListener("field-data-changed" /* CrUXManager.Events.FIELD_DATA_CHANGED */, this.#onFieldDataChanged, this);
        this.#deviceModeModel?.removeEventListener("Updated" /* EmulationModel.DeviceModeModel.Events.UPDATED */, this.#onEmulationChanged, this);
    }
    #onPageScopeMenuItemSelected(event) {
        if (event.itemValue === 'url') {
            this.#cruxManager.fieldPageScope = 'url';
        }
        else {
            this.#cruxManager.fieldPageScope = 'origin';
        }
        this.requestUpdate();
    }
    #onDeviceOptionMenuItemSelected(event) {
        this.#cruxManager.fieldDeviceOption = event.itemValue;
        this.requestUpdate();
    }
    async #revealInteraction(interaction) {
        this.#highlightedInteractionId = interaction.interactionId;
        this.requestUpdate();
        await this.updateComplete;
        this.#highlightedInteractionId = '';
    }
    async #logExtraInteractionDetails(interaction) {
        const success = await LiveMetrics.LiveMetrics.instance().logInteractionScripts(interaction);
        if (success) {
            await Common.Console.Console.instance().showPromise();
        }
    }
    async #revealLayoutShiftCluster(clusterIds) {
        this.#highlightedLayoutShiftClusterIds = clusterIds;
        this.requestUpdate();
        await this.updateComplete;
        this.#highlightedLayoutShiftClusterIds = new Set();
    }
    performUpdate() {
        const viewInput = {
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
        };
        this.#view(viewInput, this.#viewOutput, this.contentElement);
    }
}
const LIVE_METRICS_LOGS_VIEW = (input, output, target) => {
    // clang-format off
    Lit.render(html `
    <style>
      /* Any children of the root element will be matched to the slots defined within the container
         widget's shadow DOM. */
      :host,
      .widget {
        display: contents;
      }
    </style>
    <devtools-tabbed-pane @select=${(event) => input.onTabSelected(event.detail.tabId)}>
      <devtools-toolbar slot="right">
        <devtools-button .iconName=${'clear'} .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
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
    #view;
    #selectedTab = 'interactions';
    set selectedTab(tabId) {
        if (!tabId || this.#selectedTab === tabId) {
            return;
        }
        this.#selectedTab = tabId;
        this.requestUpdate();
    }
    #clearCurrentLog() {
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
    constructor(element, view = LIVE_METRICS_LOGS_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            onClear: this.#clearCurrentLog.bind(this),
            selectedTab: this.#selectedTab,
            onTabSelected: (tabId) => {
                this.selectedTab = tabId;
            },
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=LiveMetricsView.js.map