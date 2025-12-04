import './Table.js';
import type { FontDisplayInsightModel } from '../../../../models/trace/insights/FontDisplay.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare class FontDisplay extends BaseInsightComponent<FontDisplayInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    protected createOverlays(): Trace.Types.Overlays.Overlay[];
    mapToRow(font: Trace.Insights.Models.FontDisplay.RemoteFont): TableDataRow;
    createAggregatedTableRow(remaining: Trace.Insights.Models.FontDisplay.RemoteFont[]): TableDataRow;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
