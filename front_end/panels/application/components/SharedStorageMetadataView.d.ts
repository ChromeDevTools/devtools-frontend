import '../../../ui/kit/kit.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Lit from '../../../ui/lit/lit.js';
import { StorageMetadataView } from './StorageMetadataView.js';
interface SharedStorageMetadataGetter {
    getMetadata: () => Promise<Protocol.Storage.SharedStorageMetadata | null>;
    resetBudget: () => Promise<void>;
}
export declare class SharedStorageMetadataView extends StorageMetadataView {
    #private;
    constructor(sharedStorageMetadataGetter: SharedStorageMetadataGetter, owner: string);
    getTitle(): string;
    renderReportContent(): Promise<Lit.LitTemplate>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-shared-storage-metadata-view': SharedStorageMetadataView;
    }
}
export {};
