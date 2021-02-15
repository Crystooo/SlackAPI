import express, {Request, Response, Router, NextFunction} from 'express';
let router= Router();
import bodyparser, { json } from'body-parser';
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
const path = process.cwd() + '\\resources\\workspaces.json'
let client:any = bluebird.promisifyAll(redis.createClient());
let workspacesReadByFile: Workspace[];
readFile();

let getUser = async (tkn:string):Promise<User | null> => {  
    let userMail = await client.getAsync(tkn);
    if(userMail){
        let userInfo:User = JSON.parse( await client.getAsync(userMail));
        return userInfo;
    }
    return null;
}

let checkToken =async ({headers:{tkn}}:Request, res:Response,next:NextFunction)=>{
    let user = await getUser(tkn as string)
    if(!user){
        res.status(400).json({message:"invalid token"})
    }else{
        next()
    }
}

let checkWorkspace=async ({body:{workspaceId}}:Request, res:Response,next:NextFunction)=>{
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    if(!workspace){
        res.status(404).json({message:"workspace not found"})
    }else{
        next()
    }
}

let createChannel

let getChannelsNames= async ({body:{workspaceId}}:Request, res:Response)=>{//incompleto
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    res.status(200).json({"list of workspace channel":workspace?.channelsList})
}

let getUsers=async ({body:{workspaceId}}:Request, res:Response)=>{
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    let usersEmail = await client.getAsync(workspace?.usersList);
    console.log(usersEmail)
    let usersName = JSON.parse(usersEmail.username)
    res.status(200).json({"list of users in this workspace":JSON.parse(usersEmail)})
}

let logOutFromWorkspace

function readFile () {
    let rawdata = fs.readFileSync(path);
    workspacesReadByFile = JSON.parse(rawdata.toString());
}

function updateFile(){
    let data = JSON.stringify(workspacesReadByFile, null, 2);
    fs.writeFileSync(path, data);
}

client.on("error", (error: any)=>console.error(error))
router.get('/channel',checkToken,checkWorkspace,getChannelsNames);
router.get('/user',checkToken,checkWorkspace,getUsers);

export default router;