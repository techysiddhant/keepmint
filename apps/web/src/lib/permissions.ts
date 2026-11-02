import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'

// Roles for the Better Auth admin plugin. `owner` has every admin permission;
// it exists so the founder account can't be demoted by another admin later.
export const ac = createAccessControl(defaultStatements)

export const roles = {
  user: ac.newRole({ ...userAc.statements }),
  admin: ac.newRole({ ...adminAc.statements }),
  owner: ac.newRole({ ...adminAc.statements }),
}
