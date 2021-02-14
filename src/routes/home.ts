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

let createWorkspace = async ({headers:{tkn},body: {name}}:Request, res:Response)=>{
    let user = await getUser(tkn as string)
    if(user){
        let defaultChannels:Channel[]=[
            {id:uidgen.generateSync(),name:"Random",usersList:[user.email] },
            {id:uidgen.generateSync(),name:"General",usersList:[user.email]}
        ]
        let newWorkspace:Workspace={
            id:uidgen.generateSync(),
            name:name,
            channelsList:[defaultChannels[0].id, defaultChannels[1].id],
            usersList:[user.email]
        }
        if(user.workspacesList === undefined) user.workspacesList = [];
        user.workspacesList.push(newWorkspace.id);
        await client.setAsync(user.email, JSON.stringify(user));
        workspacesReadByFile.push(newWorkspace);
        updateFile();
        res.status(200).json({message:`Workspace ${name} created!`})
    }else{
        res.status(400).json({message:"invalid token"})  
    }

}

let joinWorkspace = async ({headers: {tkn},body:{id}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    let workspace = workspacesReadByFile.find(item => item.id === id);
    if(!workspace) return res.status(404).json({message: "This workspace doesn't exist"}); 
    if(user){
        if(user.workspacesList === undefined) user.workspacesList = [];
        if(workspace.usersList.find(item => item === user!.email)) return res.status(400).json({message: "This user's is already in this workspace!"})
        workspace && user.workspacesList!.push(id);
        await client.setAsync(user.email, JSON.stringify(user));
        workspacesReadByFile.find(item => item.id === id)!.usersList.push(user.email);
        updateFile();
        res.status(200).json({message: "Workspace added"});
    }else{
        res.status(400).json({message:"This user doesn't exist!"});
    }
}

let getAllWorkspaces = async ({headers: {tkn}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    if(user){
        let userWorkspacesName: string[] = [];
        user.workspacesList!.forEach(workspaceId => workspacesReadByFile.find(item => {item.id === workspaceId && userWorkspacesName.push(item.name)}));
        res.status(200).json(userWorkspacesName);
    }else{
        res.status(400).json({message: "This user doesn't exist"});
    }
}

let leaveWorkspace = async ({headers: {tkn}, body:{workspaceId}}:Request, res:Response) => {
    let user = await getUser(tkn as string)
    if(user){
        let workspace=user.workspacesList?.find(x=>x==workspaceId)
        if(workspace){
            user.workspacesList?.splice(user.workspacesList.indexOf(workspaceId), 1);
            let workspaceFromFile=workspacesReadByFile!.find(({id})=> id === workspaceId)
            let userInWorkspace = workspaceFromFile?.usersList.find(email => email === user!.email);
            if(userInWorkspace){
                workspaceFromFile?.usersList.splice(workspaceFromFile.usersList.indexOf(user.email),1);
                updateFile();
                res.status(200).json({message: "Workspace left."});
            }else{
                res.status(400).json({message: "User not found in this workspace!"});
            }
            
        }else{
            res.status(404).json({message: "Workspace not found."});
        }
    }else{
        res.status(404).json({message: "User doesn't exist."});
    }
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
        res.status(404).json({message: "User not found."});
    }
}

function readFile(){
    let rawdata = fs.readFileSync(path);
    workspacesReadByFile = JSON.parse(rawdata.toString());
}

function updateFile(){
    let data = JSON.stringify(workspacesReadByFile, null, 2);
    fs.writeFileSync(path, data);
}
                                        
router.post('/workspace', createWorkspace);
router.post('/join/workspace', joinWorkspace);
router.get('/workspace', getAllWorkspaces);
router.delete('/workspace',leaveWorkspace); //sicuramente piu facile di slack official
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