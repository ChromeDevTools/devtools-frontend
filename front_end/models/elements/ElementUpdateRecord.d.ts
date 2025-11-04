import type * as SDK from '../../core/sdk/sdk.js';
export declare class ElementUpdateRecord {
    #private;
    private modifiedAttributes?;
    private removedAttributes?;
    attributeModified(attrName: string): void;
    attributeRemoved(attrName: string): void;
    nodeInserted(_node: SDK.DOMModel.DOMNode): void;
    nodeRemoved(_node: SDK.DOMModel.DOMNode): void;
    charDataModified(): void;
    childrenModified(): void;
    isAttributeModified(attributeName: string): boolean;
    hasRemovedAttributes(): boolean;
    isCharDataModified(): boolean;
    hasChangedChildren(): boolean;
    hasRemovedChildren(): boolean;
}
