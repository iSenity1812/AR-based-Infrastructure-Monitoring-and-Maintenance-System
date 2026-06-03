import { buildSystemRoles } from '../../src/domain/policies/system-role.policy';

describe('system role policy', () => {
  it('should define unique role codes with permissions', () => {
    const roles = buildSystemRoles();
    const roleCodes = roles.map((role) => role.code);

    expect(new Set(roleCodes).size).toBe(roleCodes.length);
    expect(roles.every((role) => role.permissionCodes.length > 0)).toBe(true);
  });
});
