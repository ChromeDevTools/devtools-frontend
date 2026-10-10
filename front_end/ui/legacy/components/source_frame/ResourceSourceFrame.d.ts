import '../../legacy.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import { type LitTemplate } from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';
import { type RevealPosition, SourceFrameImpl, type SourceFrameOptions } from './SourceFrame.js';
export declare class ResourceSourceFrame extends SourceFrameImpl {
    #private;
    constructor(resource: TextUtils.ContentProvider.ContentProvider, givenContentType: string, options?: SourceFrameOptions, element?: HTMLElement);
    static createSearchableView(resource: TextUtils.ContentProvider.ContentProvider, contentType: string): UI.Widget.Widget;
    protected getContentType(): string;
    get resource(): TextUtils.ContentProvider.ContentProvider;
    protected populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number, columnNumber: number): void;
}
export interface ViewInput {
    sourceFrame: ResourceSourceFrame;
    toolbarItems: LitTemplate;
    placeholder: string;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SearchableContainer extends UI.Widget.VBox {
    #private;
    constructor(resource: TextUtils.ContentProvider.ContentProvider, contentType: string, element?: HTMLElement, view?: View);
    performUpdate(): void;
    revealPosition(position: RevealPosition): Promise<void>;
}
