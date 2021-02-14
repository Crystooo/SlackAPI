import express, {Request, Response, Router} from 'express';
let router= Router();
import bodyparser from'body-parser';
router.use(bodyparser.json());
router.use(bodyparser.urlencoded({extended: true}));
import redis from 'redis';
import bluebird from 'bluebird';
import { User } from '../interfaces/user';
import { Workspace } from '../interfaces/workspace'
import UIDGenerator from 'uid-generator';
const uidgen = new UIDGenerator();

//Bluebird.promisifyAll(redis.RedisClient.prototype);
//bluebird.promisifyAll(redis.Multi.prototype);

//Possiamo creare un user senza workspace, ma quando dobbiamo aggiugnerne una dobbiamo prima inizializzare la lista.
/* let user:User = {email:"pippo@gmail.com", username:"pippo", password:"pippo1"}
user.workspacesList = [];
user.workspacesList.push({id:1, name:"test", channelsList:[], usersList:[]}) */
//console.log(user);



let client:any = bluebird.promisifyAll(redis.createClient());    //:p 8>

let register = async ({body: {email,username,password}}:Request, res:Response)=>{
    if(!(await client.existsAsync(email))){
        let user: User = {email, username, password};
        client.set(email,JSON.stringify(user),redis.print)
        res.status(201).json({message:`user ${username} registered`})
    }else{
        res.status(400).json({message:"email already used"})
    }
}

let login = async ({headers: {tkn} ,body: {email, password}}:Request, res:Response) => {
    if(await client.existsAsync(email)){
        let info = JSON.parse(await client.getAsync(email));
        if(await client.existsAsync(tkn)){
            res.status(400).json({message: "A user associated to this token is already logged in."})
        }else{
            if(info.password === password){
                let token = uidgen.generateSync();
                client.set(String(token), info.email);
                res.status(200).json({message: "Welcome " + info.username, token})
            }else{
                res.status(400).json({message: "Wrong password!"});
            }
        }
    }else{
        res.status(404).json({message: "user not found."});
    }
}

let logout = async ({headers:{tkn}, body: { username,email,password } }:Request, res:Response) => {
    await client.existsAsync(tkn) && (client.del(tkn), res.status(200).json({message: "Succesfully logged out!"})) ||
    res.status(400).json({message: "There is no user logged in whit this token."});
}

client.on("error", (error: any)=>console.error(error))

router.get('/login', login)

router.delete("/logout",logout)

router.post("/register", register)



export default router;