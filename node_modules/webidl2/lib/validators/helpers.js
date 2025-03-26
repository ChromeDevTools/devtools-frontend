/**
 * @typedef {import("../validator.js").Definitions} Definitions
 * @typedef {import("../productions/dictionary.js").Dictionary} Dictionary
 * @typedef {import("../../lib/productions/type").Type} Type
 *
 * @param {Type} idlType
 * @param {Definitions} defs
 * @param {object} [options]
 * @param {boolean} [options.useNullableInner] use when the input idlType is nullable and you want to use its inner type
 * @return {{ reference: *, dictionary: Dictionary }} the type reference that ultimately includes dictionary.
 */
export function idlTypeIncludesDictionary(
  idlType,
  defs,
  { useNullableInner } = {}
) {
  if (!idlType.union) {
    const def = defs.unique.get(idlType.idlType);
    if (!def) {
      return;
    }
    if (def.type === "typedef") {
      const { typedefIncludesDictionary } = defs.cache;
      if (typedefIncludesDictionary.has(def)) {
        // Note that this also halts when it met indeterminate state
        // to prevent infinite recursion
        return typedefIncludesDictionary.get(def);
      }
      defs.cache.typedefIncludesDictionary.set(def, undefined); // indeterminate state
      const result = idlTypeIncludesDictionary(def.idlType, defs);
      defs.cache.typedefIncludesDictionary.set(def, result);
      if (result) {
        return {
          reference: idlType,
          dictionary: result.dictionary,
        };
      }
    }
    if (def.type === "dictionary" && (useNullableInner || !idlType.nullable)) {
      return {
        reference: idlType,
        dictionary: def,
      };
    }
  }
  for (const subtype of idlType.subtype) {
    const result = idlTypeIncludesDictionary(subtype, defs);
    if (result) {
      if (subtype.union) {
        return result;
      }
      return {
        reference: subtype,
        dictionary: result.dictionary,
      };
    }
  }
}

/**
 * @param {Dictionary} dict dictionary type
 * @param {Definitions} defs
 * @return {boolean}
 */
export function dictionaryIncludesRequiredField(dict, defs) {
  if (defs.cache.dictionaryIncludesRequiredField.has(dict)) {
    return defs.cache.dictionaryIncludesRequiredField.get(dict);
  }
  // Set cached result to indeterminate to short-circuit circular definitions.
  // The final result will be updated to true or false.
  defs.cache.dictionaryIncludesRequiredField.set(dict, undefined);
  let result = dict.members.some((field) => field.required);
  if (!result && dict.inheritance) {
    const superdict = defs.unique.get(dict.inheritance);
    if (!superdict) {
      // Assume required members in the supertype if it is unknown.
      result = true;
    } else if (dictionaryIncludesRequiredField(superdict, defs)) {
      result = true;
    }
  }
  defs.cache.dictionaryIncludesRequiredField.set(dict, result);
  return result;
}

/**
 * For now this only checks the most frequent cases:
 * 1. direct inclusion of [EnforceRange]
 * 2. typedef of that
 *
 * More complex cases with dictionaries and records are not covered yet.
 *
 * @param {Type} idlType
 * @param {Definitions} defs
 */
export function idlTypeIncludesEnforceRange(idlType, defs) {
  if (idlType.union) {
    // TODO: This should ideally be checked too
    return false;
  }

  if (idlType.extAttrs.some((e) => e.name === "EnforceRange")) {
    return true;
  }

  const def = defs.unique.get(idlType.idlType);
  if (def?.type !== "typedef") {
    return false;
  }

  return def.idlType.extAttrs.some((e) => e.name === "EnforceRange");
}
