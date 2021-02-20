import { Reply } from './reply'

export interface Message{
    id:string,
    userId:string,
    content:string,
    time:Date,
    replies: Reply[]
}