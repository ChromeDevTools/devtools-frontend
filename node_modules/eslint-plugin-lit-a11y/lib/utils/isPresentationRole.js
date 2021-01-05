const presentationRoles = new Set(['presentation', 'none']);

const isPresentationRole = attributes => presentationRoles.has(attributes.role);

module.exports = {
  isPresentationRole,
};
