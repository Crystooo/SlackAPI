import express, {Request, Response, Router, NextFunction, request} from 'express';
let router= Router();
import bodyparser, { json } from'body-parser';
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));
import { Channel } from '../interfaces/channel'
import UIDGenerator from 'uid-generator';
import fs from 'fs';
import { Message } from '../interfaces/message';
import { Reply } from '../interfaces/reply';
import { body, validationResult } from 'express-validator'
import bluebird from 'bluebird';
import redis from 'redis';
import { Workspace } from '../interfaces/workspace';
const uidgen = new UIDGenerator();
const path = process.cwd() + '\\resources\\workspaces.json'
const path2 = process.cwd() + '\\resources\\channels.json'
const path3 = process.cwd() + '\\resources\\messages.json'
let workspaceReadByFile: Workspace[] = [];
let channelsReadByFile: Channel[]=[]
let messagesReadByFile: Message[]=[];

workspaceReadByFile = readFile(workspaceReadByFile, path) as Workspace[];
channelsReadByFile = readFile(channelsReadByFile,path2) as Channel[];
messagesReadByFile = readFile(messagesReadByFile, path3) as Message[];
let client:any = bluebird.promisifyAll(redis.createClient());

var errorsHandler = (req:Request, res:Response, next:NextFunction) => {
    var errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    next();
}

let getChannelName = ({headers:{channel_id}}:Request, res:Response)=>{
    let channel= channelsReadByFile.find(item => item.id === channel_id);
    channel && res.status(200).json(channel.name) || res.status(404).json({message:"channel not found"})
}

let getAllUsers = ({headers: {channel_id}}:Request, res:Response) => {
    let users:string[] = [];
    let channel = channelsReadByFile.find(item => item.id === channel_id);
    if(channel) users = channel.usersList
    users && res.status(200).json(users) || res.status(400).json({message: "no users found"});
}

let createMessage = ({headers:{channel_id, user_id}, body:{content}}:Request,res:Response) =>{
    let messageId = uidgen.generateSync()
    let message:Message={id: messageId, userId: user_id as string,content:content,time:new Date(),replies:[]}
    if(message.content.length !=0){
        messagesReadByFile.push(message);
        channelsReadByFile.find(channel=>channel.id==channel_id)?.messagesList.push(messageId)
        updateFile(channelsReadByFile, path2);
        updateFile(messagesReadByFile, path3);
        res.status(200).json({message:"message sended"})
    }else{res.status(400).json({message:"cannot send an empty message"})}
}

let replyMessage = ({headers:{user_id,message_id},body:{content}}:Request,res:Response) =>{
    let reply:Reply={id:uidgen.generateSync(),userId:String(user_id),content:content,time:new Date()}
    if(reply.content.length !=0){
        messagesReadByFile.find(item => item.id === message_id)?.replies.push(reply);
        updateFile(messagesReadByFile, path3);
        res.status(200).json({message:"message replied"})
    }else{res.status(400).json({message:"cannot reply with an empty message"})}
}

let getAllMessages = ({headers: {channel_id}}:Request, res:Response) => {
    let messagesId = channelsReadByFile.find(item => item.id == channel_id)?.messagesList;
    let messages: Message[] = [];
    messagesId?.forEach(id => messagesReadByFile.find((message)=> {
        message.id === id && messages.push(message);
    }));
    messages && res.status(200).json(messages) || res.status(400).json({message: "Error"});
}

let addToChannel = ({headers:{to_add,channel_id, workspace_id}}:Request,res:Response)=>{
    let channel=channelsReadByFile.find(channel=>channel.id==channel_id);
    let workspace = workspaceReadByFile.find(workspace => workspace.id == workspace_id);
    if(to_add?.includes(',')){
        to_add = String(to_add).split(',')
        to_add.forEach(receiverEmail => (channel?.usersList.find(email=>email !== receiverEmail) && workspace?.usersList.find(email => email == receiverEmail)) 
            && channel.usersList.push(receiverEmail))
        updateFile(channelsReadByFile, path2)
        res.status(200).json({message:"users added to channel"})
    }else{
       if(!channel?.usersList.find(email => email === to_add) && workspace?.usersList.find(email => email === to_add)){
           channel?.usersList.push(to_add as string);
           updateFile(channelsReadByFile, path2);
           res.status(200).json({message: "User added to channel"});
       }else{
           res.status(418).json({message: "The user is already in the channel or it doesn't exist in this workspace"})
       }
    }
}

let leaveChannel = ({headers:{user_id,channel_id}}:Request,res:Response)=>{
    let channel=channelsReadByFile.find(channel=>channel.id==channel_id)
    channel?.usersList.find(email=>email === user_id) && channel.usersList.splice(channel.usersList.indexOf(String(user_id)),1) &&
    res.status(200).json({message:"user deleted from channel"}) || res.status(400).json({message:"user not found"})
}

let getUserName = async ({headers:{user_id}}:Request,res:Response)=>{
    let userName= JSON.parse(await client.getAsync(user_id)).username
    userName && res.status(200).json(userName) || res.status(404).json({message:"user not found"})
}

function readFile(container:Workspace[] | Channel[] | Message[],filePath:string) {
    let rawdata = fs.readFileSync(filePath);
    container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container:Workspace[] | Channel [] | Message[], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

router.get('/', getChannelName);
router.get("/messages",getAllMessages);
router.get("/users",getAllUsers);
router.get("/users/user",getUserName);

router.post("/messages",body("body.content").isEmpty(), errorsHandler,createMessage);
router.post("/messages/replies", replyMessage);
router.put("/add", addToChannel);

router.delete("/leave", leaveChannel);



export default router;