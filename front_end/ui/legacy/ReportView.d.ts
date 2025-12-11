import './Toolbar.js';
import type * as Buttons from '../components/buttons/buttons.js';
import type { Toolbar } from './Toolbar.js';
import { VBox } from './Widget.js';
/**
 * @deprecated Please consider using the web component version of this widget
 *             (`ui/components/report_view/ReportView.ts`) for new code.
 */
export declare class ReportView extends VBox {
    private readonly contentBox;
    private headerElement;
    private titleElement;
    private readonly sectionList;
    private subtitleElement?;
    private urlElement?;
    constructor(title?: string);
    getHeaderElement(): Element;
    setTitle(title: string): void;
    setSubtitle(subtitle: string): void;
    setURL(link: Element | null): void;
    createToolbar(): Toolbar;
    appendSection(title: string, className?: string, jslogContext?: string): Section;
    sortSections(comparator: (arg0: Section, arg1: Section) => number): void;
    setHeaderVisible(visible: boolean): void;
    setBodyScrollable(scrollable: boolean): void;
}
export declare class Section extends VBox {
    jslogContext?: string | undefined;
    private readonly headerElement;
    private headerButtons;
    private titleElement;
    private fieldList;
    private readonly fieldMap;
    constructor(title: string, className?: string, jslogContext?: string | undefined);
    title(): string;
    getTitleElement(): Element;
    getFieldElement(): HTMLElement;
    appendFieldWithCustomView(customElement: HTMLElement): void;
    setTitle(title: string, tooltip?: string): void;
    /**
     * Declares the overall container to be a group and assigns a title.
     */
    setUiGroupTitle(groupTitle: string): void;
    appendButtonToHeader(button: Buttons.Button.Button): void;
    setHeaderButtonsState(disabled: boolean): void;
    appendField(title: string, textValue?: string): HTMLElement;
    appendFlexedField(title: string, textValue?: string): HTMLElement;
    removeField(title: string): void;
    setFieldVisible(title: string, visible: boolean): void;
    fieldValue(title: string): Element | null;
    appendRow(): HTMLElement;
    appendSelectableRow(): HTMLElement;
    clearContent(): void;
    markFieldListAsGroup(): void;
}
