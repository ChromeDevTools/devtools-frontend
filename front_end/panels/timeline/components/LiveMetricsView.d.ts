import '../../../ui/components/settings/settings.js';
import '../../../ui/components/icon_button/icon_button.js';
import './FieldSettingsDialog.js';
import './NetworkThrottlingSelector.js';
import '../../../ui/components/menus/menus.js';
import './MetricCard.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class LiveMetricsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    isNode: boolean;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
}
declare class LiveMetricsLogs extends UI.Widget.WidgetElement<UI.Widget.Widget> {
    #private;
    constructor();
    /**
     * Returns `true` if selecting the tab was successful.
     */
    selectTab(tabId: string): boolean;
    createWidget(): UI.Widget.Widget;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-live-metrics-view': LiveMetricsView;
        'devtools-live-metrics-logs': LiveMetricsLogs;
    }
}
export {};
