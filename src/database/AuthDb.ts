import {
  CoreEntityWrapper,
  generateSeed,
  IBaseKernelModule,
  PGCon,
} from '@grandlinex/kernel';
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
  groups: CoreEntityWrapper<Groups>;

  permission: CoreEntityWrapper<Permission>;

  groupMap: CoreEntityWrapper<GroupMap>;

  authUser: CoreEntityWrapper<AuthUser>;

  userMap: CoreEntityWrapper<UserMap>;

  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super(module, '0');
    this.groups = this.registerEntity(new Groups());
    this.permission = this.registerEntity(new Permission());
    this.groupMap = this.registerEntity(new GroupMap());
    this.authUser = this.registerEntity(new AuthUser());
    this.userMap = this.registerEntity(new UserMap());
  }

  async initNewDB(): Promise<void> {
    const seed = generateSeed();
    const pw = this.getKernel()
      .getConfigStore()
      .get('SERVER_PASSWORD') as string;
    const hash = this.getKernel().getCryptoClient()?.getHash(seed, pw);

    // ADD GROUPS
    for (const item of [
      new Groups({ group_name: 'admin' }),
      new Groups({ group_name: 'user' }),
    ]) {
      await this.groups.createObject(item);
    }

    // ADD PERMISSION
    for (const item of [
      new Permission({ permission_name: 'admin' }),
      new Permission({ permission_name: 'api' }),
    ]) {
      await this.permission.createObject(item);
    }

    // MAP GROUPS

    for (const item of [
      new GroupMap({ group_id: 1, permission: 1 }),
      new GroupMap({ group_id: 1, permission: 2 }),
      new GroupMap({ group_id: 2, permission: 2 }),
    ]) {
      await this.groupMap.createObject(item);
    }

    // Admin user
    await this.authUser.createObject(
      new AuthUser({
        created: new Date(),
        disabled: false,
        user_name: 'admin',
        password: hash,
        seed,
      })
    );

    // Admin permission
    await this.userMap.createObject(new UserMap({ user_id: 1, group_id: 1 }));

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
        `SELECT *
                 from ${this.schemaName}.user_groups
                 WHERE user_name = $1`,
        [name]
      );
      return query?.rows || [];
    } catch (e) {
      this.error(e);
      return [];
    }
  }
}
