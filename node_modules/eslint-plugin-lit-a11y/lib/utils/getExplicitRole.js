const { roles } = require('aria-query');

/**
 * Returns an element's computed role, which is
 *
 *  1. The valid value of its explicit role attribute; or
 *  2. The implicit value of its tag.
 */
function getExplicitRole(attributes) {
  let explicitRole;
  if (typeof attributes.role === 'string') {
    explicitRole = attributes.role.toLowerCase();
  }

  if (roles.has(explicitRole)) {
    return explicitRole;
  }
  return null;
}

module.exports = {
  getExplicitRole,
};
