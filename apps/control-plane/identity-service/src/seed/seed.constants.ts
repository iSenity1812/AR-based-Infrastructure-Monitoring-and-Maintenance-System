import { CapabilitySeed } from '../modules/capabilities/capabilities.service';
import { RoleSeed } from '../modules/roles/roles.service';

export const CORE_CAPABILITIES: CapabilitySeed[] = [
  { key: 'identity.users.create', description: 'Create users' },
  { key: 'identity.users.updateStatus', description: 'Update user status' },
  { key: 'identity.users.assignRoles', description: 'Assign roles to users' },
  { key: 'identity.roles.read', description: 'Read roles' },
];

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    name: 'IT Administrator',
    description: 'Identity administrators with full admin access',
    capabilityKeys: CORE_CAPABILITIES.map((capability) => capability.key),
  },
  {
    name: 'Operator',
    description: 'Operations user with monitoring access',
    capabilityKeys: ['identity.roles.read'],
  },
  {
    name: 'Technician',
    description: 'Field technician user with AR inspection access',
    capabilityKeys: ['identity.roles.read'],
  },
];
