import { Reply } from './reply'

export interface Message{
    id:number,
    sender:string,
    content:string,
    time:Date,
    replies: Reply[]
}