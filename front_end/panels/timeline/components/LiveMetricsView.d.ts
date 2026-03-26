import '../../../ui/components/settings/settings.js';
import '../../../ui/kit/kit.js';
import './FieldSettingsDialog.js';
import './NetworkThrottlingSelector.js';
import '../../../ui/components/menus/menus.js';
import './MetricCard.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class LiveMetricsView extends UI.Widget.Widget {
    #private;
    isNode: boolean;
    constructor(element?: HTMLElement);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
