import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ReportSelector {
    #private;
    private readonly renderNewLighthouseView;
    private newLighthouseItem;
    private readonly itemByOptionElement;
    constructor(renderNewLighthouseView: () => void);
    private setEmptyState;
    private handleChange;
    private selectedItem;
    hasItems(): boolean;
    comboBox(): UI.Toolbar.ToolbarComboBox;
    prepend(item: Item): void;
    clearAll(): void;
    selectNewReport(): void;
}
export declare class Item {
    private readonly renderReport;
    private readonly showLandingCallback;
    private readonly element;
    constructor(lighthouseResult: LighthouseModel.ReporterTypes.ReportJSON, renderReport: () => void, showLandingCallback: () => void);
    select(): void;
    optionElement(): Element;
    delete(): void;
}
