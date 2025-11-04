import '../../legacy.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
import { type RevealPosition, SourceFrameImpl, type SourceFrameOptions } from './SourceFrame.js';
export declare class ResourceSourceFrame extends SourceFrameImpl {
    #private;
    constructor(resource: TextUtils.ContentProvider.ContentProvider, givenContentType: string, options?: SourceFrameOptions);
    static createSearchableView(resource: TextUtils.ContentProvider.ContentProvider, contentType: string): UI.Widget.Widget;
    protected getContentType(): string;
    get resource(): TextUtils.ContentProvider.ContentProvider;
    protected populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number, columnNumber: number): void;
}
export declare class SearchableContainer extends UI.Widget.VBox {
    private readonly sourceFrame;
    constructor(resource: TextUtils.ContentProvider.ContentProvider, contentType: string, element?: HTMLElement);
    revealPosition(position: RevealPosition): Promise<void>;
}
