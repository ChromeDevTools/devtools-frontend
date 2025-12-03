import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import { type LitTemplate } from '../../../lit/lit.js';
export declare class RemoteObjectPreviewFormatter {
    private static objectPropertyComparator;
    renderObjectPreview(preview: Protocol.Runtime.ObjectPreview): LitTemplate;
    private renderObjectProperties;
    private renderArrayProperties;
    private renderEntries;
    renderPropertyPreview(type: string, subtype?: string, className?: string | null, description?: string): LitTemplate;
    renderEvaluationResultPreview(result: SDK.RuntimeModel.EvaluationResult, allowErrors?: boolean): LitTemplate;
    /** @deprecated (crbug.com/457388389) Use lit version instead */
    renderEvaluationResultPreviewFragment(result: SDK.RuntimeModel.EvaluationResult, allowErrors?: boolean): DocumentFragment;
}
export declare function renderNodeTitle(nodeTitle: string): LitTemplate | null;
export declare function renderTrustedType(description: string, className: string): LitTemplate;
