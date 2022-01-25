import {
  BaseApiAction,
  CryptoClient,
  IBaseKernelModule,
} from '@grandlinex/kernel';
import e from 'express';
import { JwtToken } from '@grandlinex/kernel/dist/classes/BaseAuthProvider';
import { AuthDb } from '../database';

/**
 * @name CreateUserAction
 *
 * @openapi
 * /user/delete:
 *   post:
 *     summary: Delete user
 *     tags:
 *       - simple-auth
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       401:
 *         description: invalid token / not authorized
 *       403:
 *         description:  not authorized
 *       503:
 *         description: server error
 *       504:
 *         description: server error
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 */
export default class DeleteUserAction extends BaseApiAction {
  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super('POST', '/user/delete', module, module.getKernel().getModule());
    this.handler = this.handler.bind(this);
  }

  async handler(
    req: e.Request,
    res: e.Response,
    next: () => void,
    data: JwtToken | null
  ): Promise<void> {
    const cc = this.getKernel().getCryptoClient() as CryptoClient;
    const userName = req.body.username;
    if (!userName) {
      res.status(400).send('error: send username and password');
      return;
    }
    if (data) {
      const allowed = await cc.permissonValidation(data, 'admin');
      if (allowed && userName !== 'admin') {
        const mdb = this.getModule().getDb() as AuthDb;

        const authUser = await mdb.authUser.findObj({
          user_name: userName,
        });
        if (!authUser) {
          res.sendStatus(500);
          return;
        }

        const groupAccess = await mdb.userMap.getObjList({
          user_id: authUser.e_id,
        });

        for (const acc of groupAccess) {
          await mdb.userMap.delete(acc.e_id);
        }

        await mdb.authUser.delete(authUser.e_id);

        res.status(200).send('user deleted');
        return;
      }
    }
    res.status(403).send('no no no ...');
  }
}
