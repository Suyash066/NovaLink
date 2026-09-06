// Per-project role hierarchy. A user's role is scoped to a single project —
// the same user can be OWNER on their own project and GUEST elsewhere.
const ROLES = ["GUEST", "MEMBER", "CONTRIBUTOR", "MAINTAINER", "OWNER"];

function rank(role) {
  const i = ROLES.indexOf(role);
  return i === -1 ? -1 : i;
}

// true if `role` meets or exceeds `minRole` in the hierarchy
function atLeast(role, minRole) {
  return rank(role) >= rank(minRole);
}

module.exports = { ROLES, rank, atLeast };
