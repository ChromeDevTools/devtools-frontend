/**
 * Returns true if all items in baseAttributes are found in attributes. Always
 * returns true if baseAttributes is empty.
 */
function attributesComparator(baseAttributes, attributes) {
  return baseAttributes
    ? baseAttributes.every(baseAttr =>
        Object.keys(attributes).some(attribute => {
          // Attribute matches.
          if (baseAttr.name !== attribute) {
            return false;
          }

          // Value exists and does not match.
          if (baseAttr.value && baseAttr.value !== attributes[attribute]) {
            return false;
          }
          return true;
        }),
      )
    : true;
}

module.exports = {
  attributesComparator,
};
