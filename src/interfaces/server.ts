import { Channel } from "./channel";
import { User } from "./user";

export interface Server{
    id:number,
    name:string,
    channelsList:Channel[],
    usersList:User[]
}