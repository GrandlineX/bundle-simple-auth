import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';

/**
 * GroupMap entity to assign a permission to a group
 */
@Entity('GroupMap')
export default class GroupMap extends CoreEntity {
  @Column({
    dataType: 'string',
    foreignKey: {
      key: 'e_id',
      relation: 'groups',
    },
  })
  group_id: string;

  @Column({
    dataType: 'string',
    foreignKey: {
      key: 'e_id',
      relation: 'permission',
    },
  })
  permission: string;

  constructor(prop?: EProperties<GroupMap>) {
    super();
    this.group_id = prop?.group_id || '';
    this.permission = prop?.permission || '';
  }
}
