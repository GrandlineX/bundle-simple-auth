import {
  BaseApiAction,
  CryptoClient,
  IBaseKernelModule,
} from '@grandlinex/kernel';
import e from 'express';
import { JwtToken } from '@grandlinex/kernel/dist/classes/BaseAuthProvider';
import { AuthDb } from '../database';

/**
 * @name ListUserGroupsAction
 *
 * @openapi
 * /user/groups:
 *   get:
 *     summary: UserGroup list
 *     tags:
 *       - simple-auth
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     user_name:
 *                       type: string
 *                     disabled:
 *                       type: boolean
 *                     group_id:
 *                       type: number
 *       401:
 *         description: invalid token / not authorized
 *       403:
 *         description:  not authorized
 */

export default class ListUserGroupsAction extends BaseApiAction {
  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super('GET', '/user/groups', module, module.getKernel().getModule());
    this.handler = this.handler.bind(this);
  }

  async handler(
    req: e.Request,
    res: e.Response,
    next: () => void,
    data: JwtToken | null
  ): Promise<void> {
    const cc = this.getKernel().getCryptoClient() as CryptoClient;

    if (data) {
      const allowed = await cc.permissonValidation(data, 'api');
      if (allowed) {
        const db = this.getModule().getDb() as AuthDb;
        const user = await db.getUserByName(data.username);
        if (user) {
          const list = await db.getUserGroups(user.e_id);

          res
            .status(200)
            .header([['Content-Type', 'application/json']])
            .send(list);
          return;
        }
      }
    }
    res.status(403).send('no no no ...');
  }
}
