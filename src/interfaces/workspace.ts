import { Channel } from "./channel";
import { User } from "./user";

export interface Workspace{
    id:string,
    name:string,
    channelsList:string[],
    usersList:string[]
}