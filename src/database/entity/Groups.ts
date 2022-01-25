import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';

/**
 * Basic group entity
 */
@Entity('Groups')
export default class Groups extends CoreEntity {
  @Column({
    dataType: 'string',
  })
  group_name: string;

  constructor(prop?: EProperties<Groups>) {
    super();
    this.group_name = prop?.group_name || '';
  }
}
