import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';
/**
 * Basic permission entity
 */
@Entity('Permission')
export default class Permission extends CoreEntity {
  @Column()
  permission_name: string;

  constructor(prop?: EProperties<Permission>) {
    super();
    this.permission_name = prop?.permission_name || '';
  }
}