import {
  BaseKernelModule,
  CoreDBCon,
  IKernel,
  InMemDB,
} from '@grandlinex/kernel';
import AuthDb from './database/AuthDb';
import AuthProvider from './auth/AuthProvider';
import CreateUserAction from './action/CreateUserAction';
import ListUserAction from './action/ListUserAction';
import ListUserGroupsAction from './action/ListUserGroupsAction';
import DeleteUserAction from './action/DeleteUserAction';

export default class AuthModule extends BaseKernelModule<
  AuthDb,
  null,
  null,
  null
> {
  constructor(
    kernel: IKernel,
    dbCall?: (mod: AuthModule) => CoreDBCon<any, any>
  ) {
    super('auth', kernel);
    this.addAction(new CreateUserAction(this));
    this.addAction(new DeleteUserAction(this));
    this.addAction(new ListUserGroupsAction(this));
    this.addAction(new ListUserAction(this));
    this.setDb(new AuthDb(dbCall ? dbCall(this) : new InMemDB(this)));
  }

  async initModule(): Promise<void> {
    this.getKernel().getCryptoClient()?.setAuthProvider(new AuthProvider(this));
  }
}
