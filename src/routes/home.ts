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
const path = process.cwd() + '\\resources\\workspaces.json'

let client:any = bluebird.promisifyAll(redis.createClient());
let workspacesReadByFile: Workspace[] = [];
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

let createWorkspace = async ({headers:{tkn},body: {name}}:Request, res:Response)=>{
    console.log(name);
    let user = await getUser(tkn as string)
    let defaultChannels:Channel[]=[
        {id:uidgen.generateSync(),name:"Random",usersList:[user!.email], messagesList: [] },
        {id:uidgen.generateSync(),name:"General",usersList:[user!.email], messagesList: []}
    ]
    let newWorkspace:Workspace={
        id:uidgen.generateSync(),
        name:name,
        channelsList:[defaultChannels[0].id, defaultChannels[1].id],
        usersList:[user!.email]
    }
    user!.workspacesList.push(newWorkspace.id);
    await client.setAsync(user!.email, JSON.stringify(user));
    workspacesReadByFile.push(newWorkspace);
    updateFile();
    res.status(200).json({message:`Workspace ${name} created!`,workspaceId:newWorkspace.id})
}

let joinWorkspace = async ({headers: {tkn, workspace_id}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    let workspace = workspacesReadByFile.find(item => item.id === workspace_id);
    !workspace && res.status(404).json({message: "This workspace doesn't exist"});
    if(workspace!.usersList.find(item => item === user!.email)) return res.status(400).json({message: "This user's is already in this workspace!"})
    workspace && user!.workspacesList!.push(String(workspace_id));
    await client.setAsync(user!.email, JSON.stringify(user));
    workspacesReadByFile.find(item => item.id === workspace_id)!.usersList.push(user!.email);
    updateFile();
    res.status(200).json({message: "Workspace added"});
}

let AllWorkspaces = async ({headers: {tkn}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    let userWorkspacesName: {id:string, name:string}[] = [];
    user!.workspacesList!.forEach(workspaceId => workspacesReadByFile.find(item => {item.id === workspaceId && userWorkspacesName.push({id:item.id, name: item.name})}));
    res.status(200).json(userWorkspacesName);
}

let deleteAccount = async({headers: {tkn}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    if(user){
        (workspacesReadByFile.forEach(workspace => 
            workspace.usersList.find((email) => {email === user!.email && 
                workspace.usersList.splice(workspace.usersList.indexOf(email), 1)})));
        updateFile();
        client.del(tkn);
        client.del(user.email);
        res.status(200).json({message: "User deleted."})
    }else{
        res.status(404).json({message: "Invalid Token."});
    }
}

let enterWorkspace = async ({headers: {tkn}, body: {id}}:Request, res:Response) => {
    let user = await getUser(tkn as string);
    let workspace = workspacesReadByFile.find((item) => item.id === id);
    !workspace && res.status(404).json({message: "A workspace with this id doesn't exist!"});
    workspace?.usersList.find(email => email === user!.email) && res.status(200).json(workspace.id)
    || res.status(404).json({message: "This user doesn't in this workspace!"});
}

function readFile(){
    let rawdata = fs.readFileSync(path);
    workspacesReadByFile = JSON.parse(rawdata.toString());
}

function updateFile(){
    let data = JSON.stringify(workspacesReadByFile, null, 2);
    fs.writeFileSync(path, data);
}

client.on("error", (error: any)=>console.error(error));
router.get('/workspace',checkToken,AllWorkspaces);
router.get('/loginWorkspace', checkToken, enterWorkspace);

router.post('/workspace',checkToken,createWorkspace);
router.post('/join/workspace',checkToken,joinWorkspace);

 //sicuramente piu facile di slack official
router.delete('/user',deleteAccount);
export default router;

//faccio le chiamate
/*import ExpressValidator = require('express-validator');
import util = require('util');


function getOnePreconditions(req:ExpressValidator.RequestValidation, res:express.Response, next:Function) {
    req.checkParams('id', 'Parameter Id is mandatory').notEmpty().isInt();
    var errors = req.validationErrors();
    if (errors) {
        res.send(400, 'errors' + util.inspect(errors));
    } else {
        next();
    }
}




tsd install express-validator --save */
