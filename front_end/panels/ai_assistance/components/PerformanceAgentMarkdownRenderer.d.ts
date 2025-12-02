import './CollapsibleAssistanceContentWidget.js';
import '../../../models/trace/insights/insights.js';
import '../../../panels/timeline/components/components.js';
import './PerformanceAgentFlameChart.js';
import * as Trace from '../../../models/trace/trace.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
export declare class PerformanceAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    #private;
    private mainFrameId;
    private lookupEvent;
    private parsedTrace;
    constructor(mainFrameId?: string, lookupEvent?: (key: Trace.Types.File.SerializableKey) => Trace.Types.Events.Event | null, parsedTrace?: Trace.TraceModel.ParsedTrace | null);
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
