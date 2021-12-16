import {
  BaseApiAction,
  CryptoClient,
  generateSeed,
  IBaseKernelModule,
} from '@grandlinex/kernel';
import e from 'express';
import { JwtToken } from '@grandlinex/kernel/dist/classes/BaseAuthProvider';
import { AuthDb } from '../database';
import AuthUser from '../database/entity/AuthUser';
import UserMap from '../database/entity/UserMap';
/**
 * @name CreateUserAction
 *
 * @openapi
 * /user/add:
 *   post:
 *     summary: Create new user
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
 *               password:
 *                 type: string
 */
export default class CreateUserAction extends BaseApiAction {
  constructor(module: IBaseKernelModule<any, any, any, any>) {
    super('POST', '/user/add', module, module.getKernel().getModule());
    this.handler = this.handler.bind(this);
  }

  async handler(
    req: e.Request,
    res: e.Response,
    next: () => void,
    data: JwtToken | null
  ): Promise<void> {
    const cc = this.getKernel().getCryptoClient() as CryptoClient;

    if (!req.body.username || !req.body.password) {
      res.status(400).send('error: send username and password');
      return;
    }
    if (data) {
      const allowed = await cc.permissonValidation(data, 'admin');
      if (allowed) {
        const mdb = this.getModule().getDb() as AuthDb;
        const seed = generateSeed();
        const hash = cc.getHash(seed, req.body.password);
        const AUW = mdb.getEntityWrapper<AuthUser>('AuthUser');
        const UMW = mdb.getEntityWrapper<UserMap>('UserMap');

        const uid = await AUW?.createObject({
          created: new Date(),
          disabled: false,

          password: hash,
          seed,
          user_name: req.body.username,
        });
        if (uid) {
          const user = await UMW?.createObject(
            new UserMap({
              user_id: uid.e_id,
              group_id: 2,
            })
          );
          if (user) {
            res.status(200).send('user creaded');
          } else {
            res.sendStatus(500);
          }
        } else {
          res.status(504).send('interal error 1');
        }
        return;
      }
    }
    res.status(403).send('no no no ...');
  }
}
