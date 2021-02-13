import {User} from "./user"
import {Message} from "./message"
export interface Channel{
    id:number,
    name:string,
    usersList?:User[],
    messagesList?:Message[]
}