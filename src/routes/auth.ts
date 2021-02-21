import express, {NextFunction, Request, Response, Router} from 'express';
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
import { body, validationResult } from 'express-validator'

var errorsHandler = (req:Request, res:Response, next:NextFunction) => {
    var errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }
    next();
}

let client:any = bluebird.promisifyAll(redis.createClient());    //:p 8>

let register = async ({body: {username,email,password}}:Request, res:Response)=>{
    if(!(await client.existsAsync(email))){
        let user: User = {email, username, password, workspacesList:[]};
        client.set(email,JSON.stringify(user),redis.print)
        res.status(201).json({message:`user ${username} registered`})
    }else{
        res.status(400).json({message:"email already used"})
    }
}

let login = async ({headers: {tkn,email, password}}:Request, res:Response) => {
    if(await client.existsAsync(email)){
        let info = JSON.parse(await client.getAsync(email));
        if(await client.existsAsync(tkn)){
            res.status(400).json({message: "A user associated to this token is already logged in."})
        }else{
            if(info.password === password){
                let token = uidgen.generateSync();
                token=String(token)
                client.set(token, info.email);
                res.status(200).json({token,username:info.username})
            }else{
                res.status(400).json({message: "Wrong password!"});
            }
        }
    }else{
        res.status(404).json({message: "user not found."});
    }
}

let logout = async ({headers:{tkn}}:Request, res:Response) => {
    await client.existsAsync(tkn) && (client.del(tkn), res.status(200).json({message: "Succesfully logged out!"})) ||
    res.status(400).json({message: "There is no user logged in whit this token."});
}

client.on("error", (error: any)=>console.error(error))

router.post('/login', login)

router.delete("/logout",logout)

router.post("/register",body("user.email").isEmpty(),body("user.username").isEmpty(),body("user.password").isEmpty(),errorsHandler, register)



export default router;