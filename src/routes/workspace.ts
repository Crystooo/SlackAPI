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
const path2 = process.cwd() + '\\resources\\channels.json'
let client:any = bluebird.promisifyAll(redis.createClient());
let workspacesReadByFile: Workspace[]=[];
let channelsReadByFile: Channel[]=[];
workspacesReadByFile = readFile(workspacesReadByFile,path) as Workspace[];
channelsReadByFile = readFile(channelsReadByFile,path2) as Channel[];

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

/*let checkWorkspace=async ({body:{workspaceId}}:Request, res:Response,next:NextFunction)=>{
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    if(!workspace){
        res.status(404).json({message:"workspace not found"})
    }else{
        next()
    }
}*/

let createChannel = async({headers: {tkn, workspace_id}, body: {name}}:Request, res:Response) => {
    let user = await getUser(tkn as  string);
    let channel = {id:uidgen.generateSync(), name, usersList: [user!.email], messagesList: []};
    let workspace = workspacesReadByFile.find(({id}) => id === workspace_id);
    workspace!.channelsList.push(channel.id);
    updateFile(workspacesReadByFile, path);
    channelsReadByFile.push(channel);
    updateFile(channelsReadByFile, path2);
    res.status(200).json({message: "Channel created."});
}

let deleteChannel = ({headers:{workspace_id, channel_id}}:Request, res:Response) => {
    let workspace=workspacesReadByFile.find(item => item.id === workspace_id);
    let channelToDelete = workspace!.channelsList.find(channel=>channel===channel_id) as string;
    workspace?.channelsList.splice(workspace.channelsList.indexOf(channelToDelete), 1);
    let channelToDeleteByFile=channelsReadByFile.find(channel=>channel.id===channelToDelete);
    let indexOfChannelToDeleteByFile=channelToDeleteByFile!.id.indexOf(channelToDeleteByFile!.id);
    !channelToDelete && res.status(404).json({message:"channel not found"});
    channelsReadByFile.splice(indexOfChannelToDeleteByFile,1);
    updateFile(channelsReadByFile, path2);
    updateFile(workspacesReadByFile, path);
    res.status(200).json({message:"canale eliminato"});
}

let getChannelsNames= async ({body:{workspaceId}}:Request, res:Response)=>{//incompleto
    let channelsName: string[] = [];
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    workspace!.channelsList!.forEach(channelId => channelsReadByFile.find(
        item => {item.id === channelId && channelsName.push(item.name)}));
    res.status(200).json({listOfChannels:channelsName})
}

let getUsers=async ({body:{workspaceId}}:Request, res:Response)=>{
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    let users = await client.getAsync(workspace?.usersList);
    res.status(200).json({listOfUsers:JSON.parse(users).username})
}

//useless
/*let exitFromWorkspace=async ({headers:{tkn},body:{workspaceId}}:Request, res:Response)=>{//provare per credere*****************
    //let user = await getUser(tkn as string);
    let workspace=workspacesReadByFile.find(item => item.id === workspaceId)
    let users = await client.getAsync(workspace?.usersList);
    let currentUser=users.find((item: any)=>item.email===client.getAsync(tkn))
    console.log("currentUser: ",currentUser)
}*/

function readFile(container: Channel[] | Workspace[],filePath:string) {
    let rawdata = fs.readFileSync(filePath);
    container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: Workspace[] | Channel [], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

client.on("error", (error: any)=>console.error(error))
router.get('/channel',checkToken,getChannelsNames);
router.get('/user',checkToken,getUsers);
//router.delete('/logoutWorkspace',checkToken,exitFromWorkspace)
router.delete('/channel',checkToken,deleteChannel)
router.post('/channel',checkToken,createChannel)

export default router;