import * as Path from 'path';
 import Kernel, {  createFolderIfNotExist, sleep} from '@grandlinex/kernel';
import { randomUUID } from 'crypto';
import AuthModule from '../src/AuthModule';
import { AuthDb } from '../src';
import axios from "axios";
import AuthUser from "../src/database/entity/AuthUser";

const appName = 'TestKernel';
const appCode = 'tkernel';
const root = Path.join(__dirname, '..');
const testPathData = Path.join(__dirname, '..', 'data');
const testPath = Path.join(__dirname, '..', 'data', 'config');

const apiPort = 9923;
createFolderIfNotExist(testPathData);
createFolderIfNotExist(testPath);

const kernel = new Kernel( {appName, appCode,pathOverride: testPath,envFilePath:root});
kernel.setAppServerPort( apiPort)
const store=kernel.getConfigStore();
kernel.setTriggerFunction('pre', async (ik) => {
  ik.addModule(new AuthModule(ik));
});
let bearer = '';

describe('New Kernel Startup', () => {
  jest.setTimeout(30000);

  test('start kernel', async () => {
    expect(kernel.getState()).toBe('init');
    const result = await kernel.start();
    expect(result).toBe(true);
    expect(kernel.getState()).toBe('running');
    expect(kernel.getModCount()).toBe(1);
  });
  test('db', async () => {
    const db = (await kernel.getChildModule('auth')?.getDb()) as AuthDb;
    const USW=db.getEntityWrapper<AuthUser>("AuthUser");

    const user = await USW?.findObj({
      user_name:"admin"
    })
    expect(user?.user_name).not.toBeNull();
    expect(user?.user_name).toBe('admin');
  });

  test('token api', async () => {
    const cc = kernel.getCryptoClient();
    expect(cc).not.toBeNull();
    const body = {
      username: 'admin',
      token: store.get("SERVER_PASSWORD"),
    };


    const token = await axios.post(
        `http://localhost:${apiPort}/token`,
        body
    );


    expect(token.status).toBe(200);
     const json = token.data;
    expect(json.token).not.toBeNull();
    expect(json.token).not.toBeUndefined();
    bearer = json.token;
    const res = await cc?.jwtVerifyAccessToken(bearer);
    expect(res?.username).toBe('admin');
  });

  test('test auth + user add ', async () => {
    const user={
      username: randomUUID(),
      password: 'testpw',
    }

    const testcall = await axios.post(
        `http://localhost:${apiPort}/user/add`,
        user,
        {
          headers:{
            Authorization: `Bearer ${bearer}`
          }
        }
    );

    expect(testcall.status).toBe(200);
    const mod = kernel.getChildModule('auth') as AuthModule;
    const db= mod.getDb() as AuthDb

    const USW=db.getEntityWrapper<AuthUser>("AuthUser");
    const userList=await USW?.getObjList()

    expect(USW).not.toBeUndefined()
    expect(userList).not.toBeNull()

    if (!userList || USW){
      return
    }
    expect(userList.length).toBeGreaterThan(1);

    const lastUser=userList[userList.length-1];

    expect(lastUser.user_name).toBe(user.username)

  });

  test('user list ', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/user/list`,
        {
          headers:{
            Authorization: `Bearer ${bearer}`
          }
        }
    );

    expect(testcall.status).toBe(200);

    const json:any[]=testcall.data;
    expect(json.length).toBeGreaterThan(1)
  });


  test('auth via query', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/test/auth?glxauth=${bearer}`
    );

    expect(testcall.status).toBe(200);

  });


  test('auth via cookie', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/test/auth`,
        {
          headers:{
            Cookie: `glxauth=${bearer};`
          }
        }
    );

    expect(testcall.status).toBe(200);

  });

  test('user groups ', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/user/groups`,
        {
          headers:{
            Authorization: `Bearer ${bearer}`
          }
        }
    );

    expect(testcall.status).toBe(200);

    expect(testcall.data.length).toBe(1);
  });


  test('group permission', async () => {
    const mod = kernel.getChildModule('auth') as AuthModule;
    expect(mod).not.toBeNull();
    const db = mod?.getDb();
    expect(db).not.toBeNull();
    const perm = await db?.getGroupPermissions(1);
    expect(perm).toHaveLength(2);
    expect(await db?.getUserPermissionsById(1)).not.toBeNull();
    expect(await db?.getUserPermissionsById(1)).toHaveLength(2);
    expect(await db?.getUserPermissionsByName('admin')).not.toBeNull();
    expect(await db?.getUserPermissionsByName('admin')).toHaveLength(2);
  });

  test('exit kernel', async () => {
    const result = await kernel.stop();
    await sleep(1000);
    expect(kernel.getState()).toBe('exited');
    expect(result).toBeTruthy();
  });
});
