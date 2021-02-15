import {User} from "./user"
import {Message} from "./message"
export interface Channel{
    id:string,
    name:string,
    usersList:string[],
    messagesList:string[]
}