import parser, { MessageFormatPattern } from 'intl-messageformat-parser';

import { Formats, Formatters } from './compiler';

export interface Options {
    formatters?: Formatters;
}
export declare function createDefaultFormatters(): Formatters;
export declare class IntlMessageFormat {
    private ast;
    private locale;
    private pattern;
    private message;
    constructor(message: string | MessageFormatPattern, locales?: string | string[], overrideFormats?: Partial<Formats>, opts?: Options);
    format: (values?: Record<string, string | number | boolean | null | undefined> | undefined) => string;
    resolvedOptions(): {
        locale: string;
    };
    getAst(): MessageFormatPattern;
    static defaultLocale: string;
    static __parse: typeof parser['parse'] | undefined;
    static formats: {
        number: {
            currency: {
                style: string;
            };
            percent: {
                style: string;
            };
        };
        date: {
            short: {
                month: string;
                day: string;
                year: string;
            };
            medium: {
                month: string;
                day: string;
                year: string;
            };
            long: {
                month: string;
                day: string;
                year: string;
            };
            full: {
                weekday: string;
                month: string;
                day: string;
                year: string;
            };
        };
        time: {
            short: {
                hour: string;
                minute: string;
            };
            medium: {
                hour: string;
                minute: string;
                second: string;
            };
            long: {
                hour: string;
                minute: string;
                second: string;
                timeZoneName: string;
            };
            full: {
                hour: string;
                minute: string;
                second: string;
                timeZoneName: string;
            };
        };
    };
}
export { Formats, Pattern } from './compiler';
export default IntlMessageFormat;
