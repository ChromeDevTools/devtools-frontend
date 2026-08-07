import * as Lit from '../../third_party/lit/lit.js';
export type BindingEventListener = (arg: any) => any;
export declare class InterceptBindingDirective extends Lit.Directive.Directive {
    #private;
    update(part: Lit.Directive.Part, [listener]: [BindingEventListener]): unknown;
    render(listener: Function): Function;
    static setEventListeners(templateElements: Element | Iterable<Element>, renderedElement: Element): void;
    static registerListeners(element: Element, listeners?: Record<string, EventListenerOrEventListenerObject>): void;
}
