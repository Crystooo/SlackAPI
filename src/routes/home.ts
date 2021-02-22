import express, {Request, Response, Router, NextFunction} from 'express';
let router= Router();
import bodyparser from'body-parser';
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));
import redis from 'redis';
import bluebird from 'bluebird';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace'
import { Channel } from '../interfaces/channel'
import UIDGenerator from 'uid-generator';
import { body, validationResult } from 'express-validator'
import fs from 'fs';
const uidgen = new UIDGenerator();
const path = process.cwd() + '\\resources\\workspaces.json'
const path2 = process.cwd() + '\\resources\\channels.json'
let client:any = bluebird.promisifyAll(redis.createClient());
let workspacesReadByFile: Workspace[]=[];
let channelsReadByFile: Channel[]=[];
workspacesReadByFile = readFile(workspacesReadByFile,path) as Workspace[];
channelsReadByFile = readFile(channelsReadByFile,path2) as Channel[];

var errorsHandler = (req:Request, res:Response, next:NextFunction) => {
    var errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    next();
}

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
        {id:uidgen.generateSync(),name:"Random", private: false,usersList:[user!.email], messagesList: [] },
        {id:uidgen.generateSync(),name:"General", private: false,usersList:[user!.email], messagesList: []}
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
    updateFile(workspacesReadByFile, path);
    channelsReadByFile.push(defaultChannels[0])
    channelsReadByFile.push(defaultChannels[1])
    updateFile(channelsReadByFile, path2);
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
    workspace?.channelsList.forEach(channelId => channelsReadByFile.find(channel => {
        (channel.id === channelId && channel.private == false) && channel.usersList.push(user?.email as string);
    }));
    updateFile(workspacesReadByFile, path);
    updateFile(channelsReadByFile, path2);
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
        updateFile(workspacesReadByFile, path);
        (channelsReadByFile.forEach(channel => 
            channel.usersList.find((email) => {email === user!.email && 
                channel.usersList.splice(channel.usersList.indexOf(email), 1)})));
        updateFile(channelsReadByFile, path2);
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

function readFile(container: Channel[] | Workspace[],filePath:string) {
    let rawdata = fs.readFileSync(filePath);
    container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: Workspace[] | Channel [], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

client.on("error", (error: any)=>console.error(error));
router.get('/workspace',checkToken,AllWorkspaces);
router.get('/loginWorkspace', checkToken,body("id").isEmpty(), errorsHandler, enterWorkspace);

router.post('/workspace',checkToken,body("name").isEmpty(), errorsHandler,createWorkspace);
router.post('/join/workspace',checkToken,joinWorkspace);


router.delete('/user',deleteAccount);
export default router;


