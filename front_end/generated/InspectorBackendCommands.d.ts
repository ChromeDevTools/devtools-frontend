/**
 * @param {!InspectorBackendAPI} inspectorBackend
 */
export function registerCommands(inspectorBackend: InspectorBackendAPI): void;
export type InspectorBackendAPI = {
    registerCommand: (arg0: string & any, arg1: Array<{
        name: string;
        type: string;
        optional: boolean;
        description: string;
        typeRef: string | null;
    }>, arg2: Array<string>, arg3: string) => void;
    registerEnum: (arg0: string & any, arg1: {
        [x: string]: string;
    }) => void;
    registerEvent: (arg0: string & any, arg1: Array<string>) => void;
    registerType: (arg0: string & any, arg1: Array<{
        name: string;
        type: string;
        optional: boolean;
        description: string;
        typeRef: string | null;
    }>) => void;
};
/**
 * @typedef {{
 *  registerCommand: function(
 *      string&any,
 *      !Array.<!{
 *          name: string,
 *          type: string,
 *          optional: boolean,
 *          description: string,
 *          typeRef: string | null
 *      }>,
 *      !Array.<string>,
 *      string
 *  ): void,
 *  registerEnum: function(string&any, !Object<string, string>): void,
 *  registerEvent: function(string&any, !Array<string>): void,
 *  registerType: function(
 *      string&any,
 *      !Array.<!{
 *          name: string,
 *          type: string,
 *          optional: boolean,
 *          description: string,
 *          typeRef: string | null
 *      }>
 *  ): void,
 * }}
 */
export let InspectorBackendAPI: any;
