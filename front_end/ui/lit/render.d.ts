import * as Lit from '../../third_party/lit/lit.js';
export interface RenderOptions extends Lit.RenderOptions {
    container?: {
        attributes?: Record<string, string | null | boolean | undefined | {
            toString(): string;
        }>;
        classes?: string[];
        listeners?: Record<string, EventListenerOrEventListenerObject>;
    };
}
export declare function render(template: unknown, container: HTMLElement | DocumentFragment, options?: RenderOptions): ReturnType<typeof Lit.render>;
