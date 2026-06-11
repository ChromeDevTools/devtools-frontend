import type * as Lit from '../../ui/lit/lit.js';
import type * as Toolbar from './Toolbar.js';
import type { View } from './View.js';
import { type AnyWidget, VBox } from './Widget.js';
type CreateToolbarFn = (toolbarItems: Toolbar.ToolbarItem[] | Lit.TemplateResult) => Element | null;
type SetWidgetForViewFn = (view: View, widget: AnyWidget) => void;
export declare class ExpandableContainerWidget extends VBox {
    private readonly createToolbar;
    private readonly setWidgetForView;
    private readonly onVisibilityChanged?;
    private titleElement;
    private readonly titleExpandIcon;
    private readonly view;
    private widget?;
    private materializePromise?;
    constructor(view: View, createToolbar: CreateToolbarFn, setWidgetForView: SetWidgetForViewFn, onVisibilityChanged?: ((isExpanded: boolean) => void) | undefined);
    isExpanded(): boolean;
    wasShown(): void;
    private materialize;
    expand(): Promise<void>;
    private collapse;
    private toggleExpanded;
    private onTitleKeyDown;
}
export declare class StackedPane extends VBox {
    private readonly createToolbar;
    private readonly setWidgetForView;
    private readonly onViewVisibilityChanged?;
    readonly expandableContainers: Map<string, ExpandableContainerWidget>;
    constructor(createToolbar: CreateToolbarFn, setWidgetForView: SetWidgetForViewFn, onViewVisibilityChanged?: ((viewId: string, isExpanded: boolean) => void) | undefined);
    appendView(view: View, insertBefore?: View | null): void;
    wasShown(): void;
    willHide(): void;
    removeView(view: View): void;
    expandView(view: View): Promise<void>;
    isViewExpanded(viewId: string): boolean;
    getContainerForView(view: View): ExpandableContainerWidget | undefined;
}
export {};
