import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';

/**
 * UserMap entity to assign a user to a group
 */
@Entity('UserMap')
export default class UserMap extends CoreEntity {
  @Column({
    dataType: 'string',
    foreignKey: {
      key: 'e_id',
      relation: 'auth_user',
    },
  })
  user_id: string;

  @Column({
    dataType: 'string',
    foreignKey: {
      key: 'e_id',
      relation: 'groups',
    },
  })
  group_id: string;

  constructor(prop?: EProperties<UserMap>) {
    super();
    this.user_id = prop?.user_id || '';
    this.group_id = prop?.group_id || '';
  }
}
