import { BaseKernelModule, IKernel } from '@grandlinex/kernel';
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
  constructor(kernel: IKernel) {
    super('auth', kernel);
    this.addAction(new CreateUserAction(this));
    this.addAction(new DeleteUserAction(this));
    this.addAction(new ListUserGroupsAction(this));
    this.addAction(new ListUserAction(this));
  }

  async initModule(): Promise<void> {
    const db = new AuthDb(this);
    this.setDb(db);
    this.getKernel().getCryptoClient()?.setAuthProvider(new AuthProvider(this));
  }
}
