/**
 * To use links in markdown, add key here with the link and
 * use the added key in markdown.
 * @example markdown
 * Find more information about web development at [Learn more](exampleLink)
 */
/**
 * This is only exported for tests, and it should not be
 * imported in any component, instead add link in map and
 * use getMarkdownLink to get the appropriate link.
 **/
export declare const markdownLinks: Map<string, string>;
export declare const getMarkdownLink: (key: string) => string;
