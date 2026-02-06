import * as Common from '../../../../core/common/common.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import { type LitTemplate } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
import type * as Components from '../utils/utils.js';
interface NodeChildren {
    properties?: ObjectTreeNode[];
    internalProperties?: ObjectTreeNode[];
    arrayRanges?: ArrayGroupTreeNode[];
    accessors?: ObjectTreeNode[];
}
declare abstract class ObjectTreeNodeBase extends Common.ObjectWrapper.ObjectWrapper<ObjectTreeNodeBase.EventTypes> {
    #private;
    readonly parent?: ObjectTreeNodeBase | undefined;
    readonly propertiesMode: ObjectPropertiesMode;
    protected extraProperties: ObjectTreeNode[];
    expanded: boolean;
    constructor(parent?: ObjectTreeNodeBase | undefined, propertiesMode?: ObjectPropertiesMode);
    expandRecursively(maxDepth: number): Promise<void>;
    collapseRecursively(): void;
    abstract get object(): SDK.RemoteObject.RemoteObject | undefined;
    removeChildren(): void;
    removeChild(child: ObjectTreeNodeBase): void;
    protected selfOrParentIfInternal(): ObjectTreeNodeBase;
    get children(): NodeChildren | undefined;
    populateChildrenIfNeeded(): Promise<NodeChildren>;
    get hasChildren(): boolean;
    get arrayLength(): number;
    setPropertyValue(name: string | Protocol.Runtime.CallArgument, value: string): Promise<string | undefined>;
    addExtraProperties(...properties: SDK.RemoteObject.RemoteObjectProperty[]): void;
    static getGettersAndSetters(properties: ObjectTreeNode[]): ObjectTreeNode[];
}
declare namespace ObjectTreeNodeBase {
    const enum Events {
        VALUE_CHANGED = "value-changed",
        CHILDREN_CHANGED = "children-changed"
    }
    interface EventTypes {
        [Events.VALUE_CHANGED]: void;
        [Events.CHILDREN_CHANGED]: void;
    }
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
    populateChildrenIfNeeded(): Promise<NodeChildren>;
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
    setValue(expression: string): Promise<void>;
    invokeGetter(getter: SDK.RemoteObject.RemoteObject): Promise<void>;
}
export declare const getObjectPropertiesSectionFrom: (element: Element) => ObjectPropertiesSection | undefined;
export declare class ObjectPropertiesSection extends UI.TreeOutline.TreeOutlineInShadow {
    #private;
    private readonly root;
    readonly editable: boolean;
    titleElement: Element;
    skipProtoInternal?: boolean;
    constructor(object: SDK.RemoteObject.RemoteObject, title?: string | Element | null, linkifier?: Components.Linkifier.Linkifier, showOverflow?: boolean, editable?: boolean);
    static defaultObjectPresentation(object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean, readOnly?: boolean): Element;
    static defaultObjectPropertiesSection(object: SDK.RemoteObject.RemoteObject, linkifier?: Components.Linkifier.Linkifier, skipProto?: boolean, readOnly?: boolean): ObjectPropertiesSection;
    static compareProperties(propertyA: ObjectTreeNode | SDK.RemoteObject.RemoteObjectProperty, propertyB: ObjectTreeNode | SDK.RemoteObject.RemoteObjectProperty): number;
    static createNameElement(name: string | null, isPrivate?: boolean): Element;
    static valueElementForFunctionDescription(description?: string, includePreview?: boolean, defaultName?: string, className?: string): LitTemplate;
    static createPropertyValueWithCustomSupport(value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean, variableName?: string): HTMLElement;
    static getMemoryIcon(object: SDK.RemoteObject.RemoteObject, expression?: string): LitTemplate;
    static appendMemoryIcon(element: Element, object: SDK.RemoteObject.RemoteObject, expression?: string): void;
    static createPropertyValue(value: SDK.RemoteObject.RemoteObject, wasThrown: boolean, showPreview: boolean, linkifier?: Components.Linkifier.Linkifier, isSyntheticProperty?: boolean, variableName?: string): HTMLElement;
    static formatObjectAsFunction(func: SDK.RemoteObject.RemoteObject, element: Element, linkify: boolean, includePreview?: boolean): Promise<void>;
    static isDisplayableProperty(property: SDK.RemoteObject.RemoteObjectProperty, parentProperty?: SDK.RemoteObject.RemoteObjectProperty): boolean;
    skipProto(): void;
    expand(): void;
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
export interface ObjectPropertyViewInput {
    editable: boolean;
    startEditing(): unknown;
    invokeGetter(getter: SDK.RemoteObject.RemoteObject): unknown;
    onAutoComplete(expression: string, filter: string, force: boolean): unknown;
    linkifier: Components.Linkifier.Linkifier | undefined;
    completions: string[];
    expanded: boolean;
    editing: boolean;
    editingEnded(): unknown;
    editingCommitted(detail: string): unknown;
    node: ObjectTreeNode;
}
interface ObjectPropertyViewOutput {
    valueElement: Element | undefined;
    nameElement: Element | undefined;
}
type ObjectPropertyView = (input: ObjectPropertyViewInput, output: ObjectPropertyViewOutput, target: HTMLElement) => void;
export declare const OBJECT_PROPERTY_DEFAULT_VIEW: ObjectPropertyView;
export declare class ObjectPropertyWidget extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: ObjectPropertyView);
    get property(): ObjectTreeNode | undefined;
    set property(property: ObjectTreeNode);
    get expanded(): boolean;
    set expanded(expanded: boolean);
    get linkifier(): Components.Linkifier.Linkifier | undefined;
    set linkifier(linkifier: Components.Linkifier.Linkifier | undefined);
    get editable(): boolean;
    set editable(val: boolean);
    performUpdate(): void;
    setSearchRegex(regex: RegExp, additionalCssClassName?: string): boolean;
    revertHighlightChanges(): void;
    get editing(): boolean;
    startEditing(): void;
}
export declare class ObjectPropertyTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    property: ObjectTreeNode;
    toggleOnClick: boolean;
    private linkifier;
    private readonly maxNumPropertiesToShow;
    constructor(property: ObjectTreeNode, linkifier?: Components.Linkifier.Linkifier);
    static populate(treeElement: UI.TreeOutline.TreeElement, value: ObjectTreeNodeBase, skipProto: boolean, skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string | null): Promise<void>;
    static populateWithProperties(treeNode: UI.TreeOutline.TreeElement, { properties, internalProperties, accessors }: NodeChildren, skipProto: boolean, skipGettersAndSetters: boolean, linkifier?: Components.Linkifier.Linkifier, emptyPlaceholder?: string | null): void;
    revertHighlightChanges(): void;
    setSearchRegex(regex: RegExp, additionalCssClassName?: string): boolean;
    startEditing(): void;
    get editing(): boolean;
    get editable(): boolean;
    set editable(val: boolean);
    applyExpression(expression: string): Promise<void>;
    private static appendEmptyPlaceholderIfNeeded;
    private showAllPropertiesElementSelected;
    private createShowAllPropertiesButton;
    onpopulate(): Promise<void>;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
    getContextMenu(event: Event): UI.ContextMenu.ContextMenu;
    private contextMenuFired;
    private updateExpandable;
    path(): string;
}
export declare class ArrayGroupingTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    toggleOnClick: boolean;
    private readonly linkifier;
    constructor(child: ArrayGroupTreeNode, linkifier?: Components.Linkifier.Linkifier);
    static populate(treeNode: UI.TreeOutline.TreeElement, children: NodeChildren, linkifier?: Components.Linkifier.Linkifier): Promise<void>;
    onpopulate(): Promise<void>;
    onattach(): void;
    static bucketThreshold: number;
    static sparseIterationThreshold: number;
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
interface ExpandableTextViewInput {
    copyText: () => void;
    expandText: () => void;
    expanded: boolean;
    maxLength: number;
    byteCount: number;
    text: string;
}
type ExpandableTextView = (input: ExpandableTextViewInput, output: object, target: HTMLElement) => void;
export declare const EXPANDABLE_TEXT_DEFAULT_VIEW: ExpandableTextView;
export declare class ExpandableTextPropertyValue extends UI.Widget.Widget {
    #private;
    static readonly MAX_DISPLAYABLE_TEXT_LENGTH = 10000000;
    static readonly EXPANDABLE_MAX_LENGTH = 50;
    constructor(target?: HTMLElement, view?: ExpandableTextView);
    set text(text: string);
    set maxLength(maxLength: number);
    performUpdate(): void;
}
export {};
