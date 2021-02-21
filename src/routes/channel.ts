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
const uidgen = new UIDGenerator();
const path2 = process.cwd() + '\\resources\\channels.json'
const path3 = process.cwd() + '\\resources\\messages.json'
let channelsReadByFile: Channel[]=[]
let messagesReadByFile: Message[]=[];
channelsReadByFile = readFile(channelsReadByFile,path2) as Channel[];
messagesReadByFile = readFile(messagesReadByFile, path3) as Message[];

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
    let message:Message={id: messageId, userId:String(user_id),content:content,time:new Date(),replies:[]}
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

let addToChannel = ({headers:{to_add,channel_id}}:Request,res:Response)=>{
    let channel=channelsReadByFile.find(channel=>channel.id==channel_id)
    if(Array.isArray(to_add)){
        to_add.forEach(receiverEmail => channel?.usersList.find(email=>email !== receiverEmail) && channel.usersList.push(receiverEmail))
        res.status(200).json({message:"users added to channel"})
    }else{
        channel?.usersList.find(email=>email !== to_add) && channel.usersList.push(String(to_add)) &&
        res.status(200).json({message:"user added to channel"}) || res.status(400).json({message:"user already is in the channel"})
    }
}

let leaveChannel = ({headers:{user_id,channel_id}}:Request,res:Response)=>{
    let channel=channelsReadByFile.find(channel=>channel.id==channel_id)
    channel?.usersList.find(email=>email === user_id) && channel.usersList.splice(channel.usersList.indexOf(String(user_id)),1) &&
    res.status(200).json({message:"user deleted from channel"}) || res.status(400).json({message:"user not found"})
}

function readFile(container: Channel[] | Message[],filePath:string) {
    let rawdata = fs.readFileSync(filePath);
    container = JSON.parse(rawdata.toString());
    return container;
}

function updateFile(container: Channel [] | Message[], filePath:string){
    let data = JSON.stringify(container, null, 2);
    fs.writeFileSync(filePath, data);
}

router.get('/', getChannelName);
router.get("/messages",getAllMessages);
router.get("/users",getAllUsers);

router.post("/messages",body("content").isEmpty(), errorsHandler,createMessage);
router.post("/messages/replies",body("content").isEmpty(), errorsHandler, replyMessage);
router.put("/add", addToChannel);

router.delete("/leave", leaveChannel);



export default router;