 import express, {Request, Response, Router, NextFunction} from 'express';
let router= Router();
import bodyparser from'body-parser';
import { existsSync } from 'fs';
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));
import redis from 'redis';
import bluebird from 'bluebird';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace'
import { Channel } from '../interfaces/channel'
import UIDGenerator from 'uid-generator';
import fs from 'fs';
const uidgen = new UIDGenerator();
const path = '..\\..\\resources\\workspaces.json';

let client:any = bluebird.promisifyAll(redis.createClient());
let workspacesReadByFile: Workspace[];
readFile();

let getChannels= async ({headers:{tkn},body: {name}}:Request, res:Response)=>{
    
}

function readFile () {
    let rawdata = fs.readFileSync(path);
    workspacesReadByFile = JSON.parse(rawdata.toString());
}

export default router;