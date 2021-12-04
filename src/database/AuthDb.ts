import { generateSeed, IBaseKernelModule,PGCon } from '@grandlinex/kernel';
import {
  GroupPermissionRow,
  PermissionRow,
  UserGroupRow,
} from '../lib/DBTypes';
import AuthUser from './entity/AuthUser';
import Groups from './entity/Groups';
import GroupMap from './entity/GroupMap';
import Permission from './entity/Permission';
import UserMap from './entity/UserMap';

export default class AuthDb extends PGCon {
  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super(module, '0');
    [
      new AuthUser(),
      new Groups(),
      new Permission(),
      new GroupMap(),
      new UserMap(),
    ].forEach((entity) => {
      this.registerEntity(entity);
    });
  }

  async initNewDB(): Promise<void> {
    const seed = generateSeed();
    const pw = this.getKernel()
      .getConfigStore()
      .get('SERVER_PASSWORD') as string;
    const hash = this.getKernel().getCryptoClient()?.getHash(seed, pw);
    const GW = this.getEntityWrapper<Groups>('Groups');
    const PMW = this.getEntityWrapper<Permission>('Permission');
    const GMW = this.getEntityWrapper<GroupMap>('GroupMap');
    const AUW = this.getEntityWrapper<AuthUser>('AuthUser');
    const UMW = this.getEntityWrapper<UserMap>('UserMap');

    // ADD GROUPS
    await GW?.createObject(
      new Groups({
        e_id: null,
        group_name: 'admin',
      })
    );
    await GW?.createObject(
      new Groups({
        e_id: null,
        group_name: 'user',
      })
    );

    // ADD PERMISSION
    await PMW?.createObject(
      new Permission({
        e_id: null,
        permission_name: 'admin',
      })
    );
    await PMW?.createObject(
      new Permission({
        e_id: null,
        permission_name: 'api',
      })
    );

    // MAP GROUPS
    await GMW?.createObject(
      new GroupMap({
        e_id: null,
        group_id: 1,
        permission: 1,
      })
    );
    await GMW?.createObject(
      new GroupMap({
        e_id: null,
        group_id: 1,
        permission: 2,
      })
    );
    await GMW?.createObject(
      new GroupMap({
        e_id: null,
        group_id: 2,
        permission: 2,
      })
    );

    // Admin user
    await AUW?.createObject(
      new AuthUser({
        created: new Date(),
        disabled: false,
        e_id: null,
        user_name: 'admin',
        password: hash,
        seed,
      })
    );

    // Admin permission
    await UMW?.createObject(
      new UserMap({
        e_id: null,
        user_id: 1,
        group_id: 1,
      })
    );

    await this.execScripts([
      {
        exec: `CREATE VIEW ${this.schemaName}.user_groups AS
                  SELECT u.e_id,u.user_name,u.disabled,m.group_id
                  FROM ${this.schemaName}.auth_user as u
                  RIGHT OUTER JOIN
                  ${this.schemaName}.user_map as m on u.e_id=m.user_id;`,
        param: [],
      },
      {
        exec: `CREATE VIEW ${this.schemaName}.group_permission AS
                SELECT p_map.*,p.permission_name
                FROM  (SELECT g.*,gp.permission
                        FROM ${this.schemaName}.groups as g
                        RIGHT OUTER JOIN ${this.schemaName}.group_map as gp
                        on g.e_id=gp.group_id) as p_map
                RIGHT OUTER JOIN ${this.schemaName}.permission as p on p_map.permission=p.e_id;`,
        param: [],
      },
    ]);
  }

  async getGroupPermissions(id: number): Promise<GroupPermissionRow[]> {
    try {
      const query = await this.db?.query(
        `SELECT *
                 FROM ${this.schemaName}.group_permission
                 WHERE e_id = $1;`,
        [id]
      );
      return query?.rows || [];
    } catch (e) {
      this.error(e);
      return [];
    }
  }

  async getUserPermissionsById(id: number): Promise<PermissionRow[]> {
    try {
      const query = await this.db?.query(
        `SELECT DISTINCT gp.permission_name
                 FROM (
                          Select *
                          from ${this.schemaName}.user_groups
                          WHERE e_id = $1
                      ) AS ug
                          JOIN ${this.schemaName}.group_permission as gp on ug.group_id = gp.e_id;
                `,
        [id]
      );
      return query?.rows || [];
    } catch (e) {
      this.error(e);
      return [];
    }
  }

  async getUserPermissionsByName(name: string): Promise<PermissionRow[]> {
    try {
      const query = await this.db?.query(
        `SELECT DISTINCT gp.permission_name
                 FROM (
                          Select *
                          from ${this.schemaName}.user_groups
                          WHERE user_name = $1
                      ) AS ug
                          JOIN ${this.schemaName}.group_permission as gp on ug.group_id = gp.e_id;
                `,
        [name]
      );
      return query?.rows || [];
    } catch (e) {
      this.error(e);
      return [];
    }
  }

  async getUserGroups(name: string): Promise<UserGroupRow[]> {
    try {
      const query = await this.db?.query(
        `SELECT * from ${this.schemaName}.user_groups WHERE user_name=$1`,
        [name]
      );
      return query?.rows || [];
    } catch (e) {
      this.error(e);
      return [];
    }
  }
}
