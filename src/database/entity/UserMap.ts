import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';
/**
 * UserMap entity to assign a user to a group
 */
@Entity('UserMap')
export default class UserMap extends CoreEntity {
  @Column({
    dataType: 'int',
    foreignKey: {
      key: 'e_id',
      relation: 'groups',
    },
  })
  user_id: number;

  @Column({
    dataType: 'int',
    foreignKey: {
      key: 'e_id',
      relation: 'permission',
    },
  })
  group_id: number;

  constructor(prop?: EProperties<UserMap>) {
    super();
    this.user_id = prop?.user_id || -1;
    this.group_id = prop?.user_id || -1;
  }
}
