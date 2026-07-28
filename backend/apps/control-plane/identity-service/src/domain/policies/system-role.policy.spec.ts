import { PERMISSION_CODES } from '../constants/permission-code.constant';
import { RoleCode } from '../constants/role-code.enum';
import { buildSystemRoles } from './system-role.policy';

describe('buildSystemRoles', () => {
  it('grants marker-based AR asset identification to administrators', () => {
    const adminRole = buildSystemRoles().find(
      (role) => role.code === RoleCode.IT_ADMINISTRATOR,
    );

    expect(adminRole?.permissionCodes).toEqual(
      expect.arrayContaining([PERMISSION_CODES.AR_ASSETS_IDENTIFY]),
    );
  });

  it('grants ticket dispatch permissions to monitoring operators', () => {
    const operatorRole = buildSystemRoles().find(
      (role) => role.code === RoleCode.SYSTEM_MONITORING_OPERATOR,
    );

    expect(operatorRole?.permissionCodes).toEqual(
      expect.arrayContaining([
        PERMISSION_CODES.INCIDENTS_READ,
        PERMISSION_CODES.INCIDENTS_CREATE,
        PERMISSION_CODES.TICKETS_READ,
        PERMISSION_CODES.TICKETS_CREATE,
        PERMISSION_CODES.TICKETS_DISPATCH,
        PERMISSION_CODES.TICKETS_ASSIGN,
        PERMISSION_CODES.TICKETS_STATUS_UPDATE,
        PERMISSION_CODES.TICKETS_COMMENT,
        PERMISSION_CODES.TICKETS_CLOSE,
        PERMISSION_CODES.TICKETS_CANCEL,
      ]),
    );
  });

  it('grants field execution permissions to maintenance technicians', () => {
    const technicianRole = buildSystemRoles().find(
      (role) => role.code === RoleCode.MAINTENANCE_TECHNICIAN,
    );

    expect(technicianRole?.permissionCodes).toEqual(
      expect.arrayContaining([
        PERMISSION_CODES.TICKETS_READ,
        PERMISSION_CODES.TICKETS_ACKNOWLEDGE,
        PERMISSION_CODES.TICKETS_WORK_START,
        PERMISSION_CODES.TICKETS_COMMENT,
        PERMISSION_CODES.TICKETS_EVIDENCE_ATTACH,
        PERMISSION_CODES.TICKETS_RESOLVE,
        PERMISSION_CODES.AR_INSPECTIONS_CONDUCT,
        PERMISSION_CODES.AR_INSPECTION_RESULTS_SUBMIT,
      ]),
    );
  });
});
