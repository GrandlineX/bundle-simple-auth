import { BaseAuthProvider, IBaseKernelModule } from '@grandlinex/kernel';
import { JwtToken } from '@grandlinex/kernel/dist/classes/BaseAuthProvider';
import { Request } from 'express';
import { AuthDb } from '../database';
import AuthUser from '../database/entity/AuthUser';

export default class AuthProvider extends BaseAuthProvider {
  module: IBaseKernelModule<AuthDb, null, null, null>;

  constructor(module: IBaseKernelModule<AuthDb, null, null, null>) {
    super();
    this.module = module;
  }

  async authorizeToken(
    username: string,
    token: string,
    requestType: string
  ): Promise<boolean> {
    const adb = this.module.getDb() as AuthDb;
    const cc = this.module.getKernel().getCryptoClient();
    const AUW = adb.getEntityWrapper<AuthUser>('AuthUser');

    const user = await AUW?.findObj({
      user_name: username,
    });
    if (!user) {
      return false;
    }
    const a = cc?.getHash(user.seed, token);
    if (!a || a !== user.password) {
      return false;
    }

    return this.isAllowed(username, 'api');
  }

  async validateAcces(token: JwtToken, requestType: string): Promise<boolean> {
    return this.isAllowed(token.username, requestType);
  }

  async bearerTokenValidation(req: Request): Promise<JwtToken | null> {
    const cc = this.module.getKernel().getCryptoClient();
    let token: string | undefined;
    if (req.headers.authorization !== undefined) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.split(' ')[1];
    } else if (req.query.glxauth !== undefined) {
      token = req.query.glxauth as string;
    } else if (req.headers.cookie !== undefined) {
      const crumbs = req.headers.cookie.trim();
      const coList = crumbs.split(';');
      const oel = coList.find((el) => el.startsWith('glxauth='));
      token = oel?.split('=')[1];
    }
    if (token === undefined || !cc) {
      return null;
    }
    const tokenData = await cc.jwtVerifyAccessToken(token);

    if (tokenData) {
      return tokenData;
    }
    return null;
  }

  async isAllowed(username: string, permission: string) {
    const db = this.module.getDb() as AuthDb;
    const perm = await db.getUserPermissionsByName(username);

    return perm.find(({ permission_name }) => permission_name === permission) !==
        undefined;
  }
}
