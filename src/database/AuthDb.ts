import {
  CoreDBCon,
  CoreDBPrefab,
  CoreEntityWrapper,
  generateSeed,
  WorkLoad,
} from '@grandlinex/kernel';
import AuthUser from './entity/AuthUser';
import Groups from './entity/Groups';
import GroupMap from './entity/GroupMap';
import Permission from './entity/Permission';
import UserMap from './entity/UserMap';

export default class AuthDb extends CoreDBPrefab<CoreDBCon<any, any>> {
  groups: CoreEntityWrapper<Groups>;

  permission: CoreEntityWrapper<Permission>;

  groupMap: CoreEntityWrapper<GroupMap>;

  authUser: CoreEntityWrapper<AuthUser>;

  userMap: CoreEntityWrapper<UserMap>;

  constructor(dbCon: CoreDBCon<any, any>) {
    super(dbCon);
    this.groups = this.registerEntity(new Groups());
    this.permission = this.registerEntity(new Permission());
    this.groupMap = this.registerEntity(new GroupMap());
    this.authUser = this.registerEntity(new AuthUser());
    this.userMap = this.registerEntity(new UserMap());
    this.initPrefabDB = this.initPrefabDB.bind(this);
  }

  async initPrefabDB(): Promise<void> {
    const seed = generateSeed();
    const pw = this.getKernel()
      .getConfigStore()
      .get('SERVER_PASSWORD') as string;
    const hash = this.getKernel().getCryptoClient()?.getHash(seed, pw);

    // ADD GROUPS
    const groups = [];
    for (const item of [
      new Groups({ group_name: 'admin' }),
      new Groups({ group_name: 'user' }),
    ]) {
      groups.push(await this.groups.createObject(item));
    }

    // ADD PERMISSION
    const permission = [];
    for (const item of [
      new Permission({ permission_name: 'admin' }),
      new Permission({ permission_name: 'api' }),
    ]) {
      permission.push(await this.permission.createObject(item));
    }

    // MAP GROUPS

    for (const item of [
      new GroupMap({
        group_id: groups[0].e_id,
        permission: permission[0].e_id,
      }),
      new GroupMap({
        group_id: groups[0].e_id,
        permission: permission[1].e_id,
      }),
      new GroupMap({
        group_id: groups[1].e_id,
        permission: permission[1].e_id,
      }),
    ]) {
      await this.groupMap.createObject(item);
    }

    // Admin user
    const adminUser = await this.authUser.createObject(
      new AuthUser({
        created: new Date(),
        disabled: false,
        user_name: 'admin',
        password: hash,
        seed,
      })
    );

    // Admin permission
    await this.userMap.createObject(
      new UserMap({ user_id: adminUser.e_id, group_id: groups[0].e_id })
    );
  }

  async getGroupPermissions(id: string): Promise<Permission[]> {
    const maps = await this.groupMap.getObjList({ search: { group_id: id } });
    const wl: WorkLoad<Permission | null> = [];
    for (const map of maps) {
      wl.push(this.permission.getObjById(map.permission));
    }
    return (await Promise.all(wl)).filter((el) => el !== null) as Permission[];
  }

  async getUserPermissionsById(userId: string): Promise<Permission[]> {
    const premSet = new Set<Permission>();
    const groups = await this.getUserGroups(userId);
    for (const group of groups) {
      (await this.getGroupPermissions(group.e_id)).forEach((perm) => {
        premSet.add(perm);
      });
    }
    return Array.from(premSet);
  }

  async getUserGroups(userId: string): Promise<Groups[]> {
    const out: Groups[] = [];

    const userMap = await this.userMap.getObjList({
      search: { user_id: userId },
    });
    for (const map of userMap) {
      const group = await this.groups.getObjById(map.group_id);
      if (group) {
        out.push(group);
      }
    }
    return out;
  }

  async getUserByName(name: string): Promise<AuthUser | null> {
    const user = await this.authUser.findObj({ user_name: name });
    return user || null;
  }
}
