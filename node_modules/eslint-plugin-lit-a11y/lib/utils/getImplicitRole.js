const { roles } = require('aria-query');
const { implicitRoles } = require('./implicitRoles.js');

/**
 * Returns an element's implicit role given its attributes and type.
 * Some elements only have an implicit role when certain props are defined.
 */
module.exports = {
  getImplicitRole(type, attributes) {
    let implicitRole;
    if (implicitRoles[type]) {
      implicitRole = implicitRoles[type](attributes);
    }
    if (roles.has(implicitRole)) {
      return implicitRole;
    }
    return null;
  },
};
