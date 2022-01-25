import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';

/**
 * GroupMap entity to assign a permission to a group
 */
@Entity('GroupMap')
export default class GroupMap extends CoreEntity {
  @Column({
    dataType: 'int',
    foreignKey: {
      key: 'e_id',
      relation: 'groups',
    },
  })
  group_id: number;

  @Column({
    dataType: 'int',
    foreignKey: {
      key: 'e_id',
      relation: 'permission',
    },
  })
  permission: number;

  constructor(prop?: EProperties<GroupMap>) {
    super();
    this.group_id = prop?.group_id || -1;
    this.permission = prop?.permission || -1;
  }
}
