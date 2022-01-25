import * as Path from 'path';
import Kernel, {createFolderIfNotExist, ICClient, sleep} from '@grandlinex/kernel';
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
let adminBearer = '';

const user={
  username: "test-user",
  password: 'test-pw',
}

describe('Kernel Startup', () => {
  test('start kernel', async () => {
    expect(kernel.getState()).toBe('init');
    const result = await kernel.start();
    expect(result).toBe(true);
    expect(kernel.getState()).toBe('running');
    expect(kernel.getModCount()).toBe(1);
  });
});



describe('Prepare env', () => {

  test('db', async () => {
    const db = (await kernel.getChildModule('auth')?.getDb()) as AuthDb;
    const USW=db.getEntityWrapper<AuthUser>("AuthUser");

    const user = await USW?.findObj({
      user_name:"admin"
    })
    expect(user?.user_name).not.toBeNull();
    expect(user?.user_name).toBe('admin');
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
    adminBearer = json.token;
    const res = await cc?.jwtVerifyAccessToken(adminBearer);
    expect(res?.username).toBe('admin');
  });



  test('test auth + user add ', async () => {
    const testcall = await axios.post(
        `http://localhost:${apiPort}/user/add`,
        user,
        {
          headers:{
            Authorization: `Bearer ${adminBearer}`
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
    expect(userList.length).toBe(2);

    const lastUser=userList[userList.length-1];

    expect(lastUser.user_name).toBe(user.username)

  });

});




describe.each([
  ['admin', store.get("SERVER_PASSWORD") as string,"admin",true],
  [user.username, user.password,"api",true],
  ['noAuth', "noPw","api",false],
])('CheckAccess :(%s):', (curUser: string, pw: string,access:string,valid:boolean) => {
  let bearer: string="";



  test('token api', async () => {
    const cc = kernel.getCryptoClient() as ICClient;
    expect(cc).not.toBeNull();
    const body = {
      username: curUser,
      token: pw,
    };

    const token = await axios.post(
        `http://localhost:${apiPort}/token`,
        body,
    {
      validateStatus:()=>true
    }
    );


    expect(token.status).toBe(valid?200:403);
    if (valid){
      const json = token.data;
      expect(json.token).not.toBeNull();
      expect(json.token).not.toBeUndefined();
      bearer = json.token;
      const res = await cc.jwtVerifyAccessToken(bearer);
      expect(res).not.toBeUndefined()
      expect(res).not.toBeNull()
      if (!res){
        return
      }
      const validation = await cc.permissonValidation(res,access)

      expect(validation).toBe(valid)
    }
  });


  test('user list ', async () => {

    const testcall = await axios.get<any[]>(
        `http://localhost:${apiPort}/user/list`,
        {
          headers:{
            Authorization: `Bearer ${bearer}`
          },
          validateStatus:()=>true
        }
    );

    switch (access){
      case "admin":
        expect(testcall.status).toBe(valid?200:403);
        if (valid){
          expect(testcall.data).toHaveLength(2)
        }
        break;
      case  "api":
        expect(testcall.status).toBe(valid?403:401);
        break;
    }

  });


  test('auth via query', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/test/auth?glxauth=${bearer}`,{
    validateStatus:()=>true
    }
    );


    expect(testcall.status).toBe(valid?200:401);

  });


  test('auth via cookie', async () => {

    const testcall = await axios.get(
        `http://localhost:${apiPort}/test/auth`,
        {
          headers:{
            Cookie: `glxauth=${bearer};`
          },validateStatus:()=>true

        }
    );


    expect(testcall.status).toBe(valid?200:401);

  });

  test('user groups ', async () => {

    const testcall = await axios.get<any[]>(
        `http://localhost:${apiPort}/user/groups`,
        {
          headers:{
            Authorization: `Bearer ${bearer}`
          }
          ,validateStatus:()=>true
        }

  );

    expect(testcall.status).toBe(valid?200:401);
    if (valid){
      expect(testcall.data.length).toBeGreaterThanOrEqual(1);
    }
  });

});



describe('Cleanup env', () => {

  test('delete user', async () => {

    const testcall = await axios.post(
        `http://localhost:${apiPort}/user/delete`,
        user,
        {
          headers:{
            Authorization: `Bearer ${adminBearer}`
          }
        }
    );
    expect(testcall.status).toBe(200);
  });

});



describe('Kernel stop', () => {

  test('exit kernel', async () => {
    const result = await kernel.stop();
    await sleep(1000);
    expect(kernel.getState()).toBe('exited');
    expect(result).toBeTruthy();
  });

});
