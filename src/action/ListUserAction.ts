import {
  BaseApiAction,
  CryptoClient,
  IBaseKernelModule,
} from '@grandlinex/kernel';
import e from 'express';
import { JwtToken } from '@grandlinex/kernel/dist/classes/BaseAuthProvider';
import { AuthDb } from '../database';
import AuthUser from '../database/entity/AuthUser';

/**
 * @name ListUserAction
 *
 * @openapi
 * /user/list:
 *   get:
 *     summary: User list
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

export default class ListUserAction extends BaseApiAction {
  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super('GET', '/user/list', module, module.getKernel().getModule());
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
      const allowed = await cc.permissonValidation(data, 'admin');
      if (allowed) {
        const mdb = this.getModule().getDb() as AuthDb;
        const AUW = mdb.getEntityWrapper<AuthUser>('AuthUser');

        const list = await AUW?.getObjList();
        if (!list) {
          res.sendStatus(500);
          return;
        }
        res
          .status(200)
          .header([['Content-Type', 'application/json']])
          .send(
            list.map((user) => {
              return {
                e_id: user.e_id,
                user_name: user.user_name,
                created: user.created,
                disabled: user.disabled,
              };
            })
          );
        return;
      }
    }
    res.status(403).send('no no no ...');
  }
}
