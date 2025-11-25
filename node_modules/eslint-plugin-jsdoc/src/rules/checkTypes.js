import {
  buildRejectOrPreferRuleDefinition,
} from '../buildRejectOrPreferRuleDefinition.js';
import {
  strictNativeTypes,
} from '../jsdocUtils.js';

/**
 * @callback CheckNativeTypes
 * Iterates strict types to see if any should be added to `invalidTypes` (and
 * the the relevant strict type returned as the new preferred type).
 * @param {import('../iterateJsdoc.js').PreferredTypes} preferredTypes
 * @param {string} typeNodeName
 * @param {string|undefined} preferred
 * @param {import('jsdoc-type-pratt-parser').NonRootResult|undefined} parentNode
 * @param {(string|false|undefined)[][]} invalidTypes
 * @returns {string|undefined} The `preferred` type string, optionally changed
 */

/** @type {CheckNativeTypes} */
const checkNativeTypes = (preferredTypes, typeNodeName, preferred, parentNode, invalidTypes) => {
  let changedPreferred = preferred;
  for (const strictNativeType of strictNativeTypes) {
    if (
      strictNativeType === 'object' &&
      (
        // This is not set to remap with exact type match (e.g.,
        //   `object: 'Object'`), so can ignore (including if circular)
        !preferredTypes?.[typeNodeName] ||
        // Although present on `preferredTypes` for remapping, this is a
        //   parent object without a parent match (and not
        //   `unifyParentAndChildTypeChecks`) and we don't want
        //   `object<>` given TypeScript issue https://github.com/microsoft/TypeScript/issues/20555
        /**
         * @type {import('jsdoc-type-pratt-parser').GenericResult}
         */
        (
          parentNode
        )?.elements?.length && (
        /**
         * @type {import('jsdoc-type-pratt-parser').GenericResult}
         */
          (
            parentNode
          )?.left?.type === 'JsdocTypeName' &&
          /**
           * @type {import('jsdoc-type-pratt-parser').GenericResult}
           */
          (parentNode)?.left?.value === 'Object'
        )
      )
    ) {
      continue;
    }

    if (strictNativeType !== typeNodeName &&
      strictNativeType.toLowerCase() === typeNodeName.toLowerCase() &&

      // Don't report if user has own map for a strict native type
      (!preferredTypes || preferredTypes?.[strictNativeType] === undefined)
    ) {
      changedPreferred = strictNativeType;
      invalidTypes.push([
        typeNodeName, changedPreferred,
      ]);
      break;
    }
  }

  return changedPreferred;
};

export default buildRejectOrPreferRuleDefinition({
  checkNativeTypes,
  schema: [
    {
      additionalProperties: false,
      properties: {
        exemptTagContexts: {
          description: 'Avoids reporting when a bad type is found on a specified tag.',
          items: {
            additionalProperties: false,
            properties: {
              tag: {
                description: 'Set a key `tag` to the tag to exempt',
                type: 'string',
              },
              types: {
                description: `Set to \`true\` to indicate that any types on that tag will be allowed,
or to an array of strings which will only allow specific bad types.
If an array of strings is given, these must match the type exactly,
e.g., if you only allow \`"object"\`, it will not allow
\`"object<string, string>"\`. Note that this is different from the
behavior of \`settings.jsdoc.preferredTypes\`. This option is useful
for normally restricting generic types like \`object\` with
\`preferredTypes\`, but allowing \`typedef\` to indicate that its base
type is \`object\`.`,
                oneOf: [
                  {
                    type: 'boolean',
                  },
                  {
                    items: {
                      type: 'string',
                    },
                    type: 'array',
                  },
                ],
              },
            },
            type: 'object',
          },
          type: 'array',
        },
        noDefaults: {
          description: `Insists that only the supplied option type
map is to be used, and that the default preferences (such as "string"
over "String") will not be enforced. The option's default is \`false\`.`,
          type: 'boolean',
        },
        unifyParentAndChildTypeChecks: {
          description: `@deprecated Use the \`preferredTypes[preferredType]\` setting of the same name instead.
If this option is \`true\`, will currently override \`unifyParentAndChildTypeChecks\` on the \`preferredTypes\` setting.`,
          type: 'boolean',
        },
      },
      type: 'object',
    },
  ],
});
