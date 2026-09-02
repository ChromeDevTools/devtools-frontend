import type * as SDK from '../../../../core/sdk/sdk.js';
export declare class CustomPreviewSection {
    private readonly sectionElement;
    private readonly object;
    private expanded;
    private cachedContent?;
    private headerJsonML?;
    constructor(object: SDK.RemoteObject.RemoteObject);
    private render;
    element(): Element;
    private renderJSONMLTag;
    private renderElement;
    private layoutObjectTag;
    private onClick;
    private toggleExpand;
    loadBody(): Promise<void>;
}
export declare class CustomPreviewComponent {
    private readonly object;
    private customPreviewSection;
    element: HTMLSpanElement;
    constructor(object: SDK.RemoteObject.RemoteObject);
    expandIfPossible(): void;
    private contextMenuEventFired;
    private disassemble;
}
