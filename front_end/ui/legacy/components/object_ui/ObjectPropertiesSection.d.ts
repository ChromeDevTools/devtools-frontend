import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../legacy.js';
import type * as Components from '../utils/utils.js';
interface NodeChildren {
    properties?: ObjectTreeNode[];
    internalProperties?: ObjectTreeNode[];
    arrayRanges?: ArrayGroupTreeNode[];
}
declare abstract class ObjectTreeNodeBase {
    #private;
    readonly parent?: ObjectTreeNodeBase | undefined;
    readonly propertiesMode: ObjectPropertiesMode;
    protected extraProperties: ObjectTreeNode[];
    constructor(parent?: ObjectTreeNodeBase | undefined, propertiesMode?: ObjectPropertiesMode);
    abstract get object(): SDK.RemoteObject.RemoteObject | undefined;
    removeChildren(): void;
    removeChild(child: ObjectTreeNodeBase): void;
    protected selfOrParentIfInternal(): ObjectTreeNodeBase;
    children(): Promise<NodeChildren>;
    protected populateChildren(): Promise<NodeChildren>;
    get hasChildren(): boolean;
    get arrayLength(): number;
    setPropertyValue(name: string | Protocol.Runtime.CallArgument, value: string): Promise<string | undefined>;
    addExtraProperties(...properties: SDK.RemoteObject.RemoteObjectProperty[]): void;
}
export declare class ObjectTree extends ObjectTreeNodeBase {
    #private;
    constructor(object: SDK.RemoteObject.RemoteObject, propertiesMode?: ObjectPropertiesMode);
    get object(): SDK.RemoteObject.RemoteObject;
}
declare class ArrayGroupTreeNode extends ObjectTreeNodeBase {
    #private;
    constructor(object: SDK.RemoteObject.RemoteObject, range: {
        fromIndex: number;
        toIndex: number;
        count: number;
    }, parent?: ObjectTreeNodeBase, propertiesMode?: ObjectPropertiesMode);
    protected populateChildren(): Promise<NodeChildren>;
    get singular(): boolean;
    get range(): {
        fromIndex: number;
        toIndex: number;
        count: number;
    };
    get object(): SDK.RemoteObject.RemoteObject;
}
export declare class ObjectTreeNode extends ObjectTreeNodeBase {
    #private;
    readonly property: SDK.RemoteObject.RemoteObjectProperty;
    readonly nonSyntheticParent?: SDK.RemoteObject.RemoteObject | undefined;
    constructor(property: SDK.RemoteObject.RemoteObjectProperty, propertiesMode?: ObjectPropertiesMode, parent?: ObjectTreeNodeBase, nonSyntheticParent?: SDK.RemoteObject.RemoteObject | undefined);
    get object(): SDK.RemoteObject.RemoteObject | undefined;
    get name(): string;
    get path(): string;
    selfOrParentIfInternal(): ObjectTreeNodeBase;
}
export declare const getObjectPropertiesSectionFrom: (element: Element) => ObjectPropertiesSection | undefined;
export declare class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
    #private;
    private readonly root;
    editable: boolean;
    titleElement: Element;
    skipProtoInternal?: boolean;
    constructor(object: SDK.RemoteObject.RemoteObject, title?: string | Element | null, linkifier?: Components.Linkifier.Linkifier, showOverflow?: boolean);
    static defaultObjectPresentation(object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean, readOnly?: boolean): Element;
    static defaultObjectPropertiesSection(object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean, readOnly?: boolean): ObjectPropertiesSection;
    static compareProperties(propertyA: ObjectTreeNode | SDK.RemoteObject.RemoteObjectProperty, propertyB: ObjectTreeNode | SDK.RemoteObject.RemoteObjectProperty): number;
    static createNameElement(name: string | null, isPrivate?: boolean): Element;
    static valueElementForFunctionDescription(description?: string, includePreview?: boolean, defaultName?: string): HTMLElement;
    static createPropertyValueWithCustomSupport(value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean, variableName?: string): HTMLElement;
    static appendMemoryIcon(element: Element, object: SDK.RemoteObject.RemoteObject, expression?: string): void;
    static createPropertyValue(value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean, variableName?: string): HTMLElement;
    static formatObjectAsFunction(func: SDK.RemoteObject.RemoteObject, element: Element, linkify: boolean, includePreview?: boolean): Promise<void>;
    static isDisplayableProperty(property: SDK.RemoteObject.RemoteObjectProperty, parentProperty?: SDK.RemoteObject.RemoteObjectProperty): boolean;
    skipProto(): void;
    expand(): void;
    setEditable(value: boolean): void;
    objectTreeElement(): UI.TreeOutline.TreeElement;
    enableContextMenu(): void;
    private contextMenuEventFired;
    titleLessMode(): void;
}
export interface TreeOutlineOptions {
    readOnly?: boolean;
}
export declare class ObjectPropertiesSectionsTreeOutline extends UI.TreeOutline.TreeOutlineInShadow {
    readonly editable: boolean;
    constructor(options?: TreeOutlineOptions | null);
}
export declare const enum ObjectPropertiesMode {
    ALL = 0,// All properties, including prototype properties
    OWN_AND_INTERNAL_AND_INHERITED = 1
}
export declare class RootElement extends UI.TreeOutline.TreeElement {
    private readonly object;
    private readonly linkifier;
    private readonly emptyPlaceholder;
    toggleOnClick: boolean;
    constructor(object: ObjectTree, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string | null);
    invalidateChildren(): void;
    onexpand(): void;
    oncollapse(): void;
    ondblclick(_e: Event): boolean;
    private onContextMenu;
    onpopulate(): Promise<void>;
}
/**
 * Number of initially visible children in an ObjectPropertyTreeElement.
 * Remaining children are shown as soon as requested via a show more properties button.
 **/
export declare const InitialVisibleChildrenLimit = 200;
export declare class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
    property: ObjectTreeNode;
    toggleOnClick: boolean;
    private highlightChanges;
    private linkifier;
    private readonly maxNumPropertiesToShow;
    nameElement: HTMLElement;
    valueElement: HTMLElement;
    private rowContainer;
    readOnly: boolean;
    private prompt;
    private editableDiv;
    propertyValue?: HTMLElement;
    expandedValueElement?: Element | null;
    constructor(property: ObjectTreeNode, linkifier?: Components.Linkifier.Linkifier);
    static populate(treeElement: UI.TreeOutline.TreeElement, value: ObjectTreeNodeBase, skipProto: boolean, skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string | null): Promise<void>;
    static populateWithProperties(treeNode: UI.TreeOutline.TreeElement, { properties, internalProperties }: NodeChildren, skipProto: boolean, skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string | null): void;
    private static appendEmptyPlaceholderIfNeeded;
    static createRemoteObjectAccessorPropertySpan(object: SDK.RemoteObject.RemoteObject | null, propertyPath: string[], callback: (arg0: SDK.RemoteObject.CallFunctionResult) => void): HTMLElement;
    setSearchRegex(regex: RegExp, additionalCssClassName?: string): boolean;
    private applySearch;
    private showAllPropertiesElementSelected;
    private createShowAllPropertiesButton;
    revertHighlightChanges(): void;
    onpopulate(): Promise<void>;
    ondblclick(event: Event): boolean;
    onenter(): boolean;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
    private showExpandedValueElement;
    private createExpandedValueElement;
    update(): void;
    getContextMenu(event: Event): UI.ContextMenu.ContextMenu;
    private contextMenuFired;
    private startEditing;
    private editingEnded;
    private editingCancelled;
    private editingCommitted;
    private promptKeyDown;
    private applyExpression;
    invalidateChildren(): void;
    private onInvokeGetterClick;
    private updateExpandable;
    path(): string;
}
export declare class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    toggleOnClick: boolean;
    private readonly linkifier;
    constructor(child: ArrayGroupTreeNode, linkifier?: Components.Linkifier.Linkifier);
    static populate(treeNode: UI.TreeOutline.TreeElement, children: NodeChildren, linkifier?: Components.Linkifier.Linkifier): Promise<void>;
    invalidateChildren(): void;
    onpopulate(): Promise<void>;
    onattach(): void;
    static bucketThreshold: number;
    static sparseIterationThreshold: number;
}
export declare class ObjectPropertyPrompt extends UI.TextPrompt.TextPrompt {
    constructor();
}
export declare class ObjectPropertiesSectionsTreeExpandController {
    #private;
    constructor(treeOutline: UI.TreeOutline.TreeOutline);
    watchSection(id: string, section: RootElement): void;
    stopWatchSectionsWithId(id: string): void;
}
export declare class Renderer implements UI.UIUtils.Renderer {
    static instance(opts?: {
        forceNew: boolean;
    }): Renderer;
    render(object: Object, options?: UI.UIUtils.Options): Promise<UI.UIUtils.RenderedObject | null>;
}
export declare class ExpandableTextPropertyValue {
    #private;
    private readonly text;
    private readonly maxLength;
    private readonly maxDisplayableTextLength;
    constructor(element: HTMLElement, text: string, maxLength: number);
    get element(): HTMLElement;
    private expandText;
    private copyText;
}
export {};
