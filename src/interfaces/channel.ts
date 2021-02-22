export interface Channel{
    id:string,
    name:string,
    private: boolean,
    usersList:string[],
    messagesList:string[]
}