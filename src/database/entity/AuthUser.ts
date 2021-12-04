import { Column, CoreEntity, Entity, EProperties } from '@grandlinex/kernel';

/**
 * Basic user entity
 */
@Entity('AuthUser')
export default class AuthUser extends CoreEntity {
  @Column({
    dataType: 'string',
    unique: true,
  })
  user_name: string;

  @Column()
  password: string;

  @Column()
  seed: string;

  @Column({
    dataType: 'date',
  })
  created: Date;

  @Column({
    dataType: 'boolean',
  })
  disabled: boolean;

  constructor(prop?: EProperties<AuthUser>) {
    super();
    this.e_id = prop?.e_id || null;
    this.user_name = prop?.user_name || '';
    this.password = prop?.password || '';
    this.seed = prop?.seed || '';
    this.created = prop?.created || new Date();
    this.disabled = prop?.disabled || false;
  }
}
