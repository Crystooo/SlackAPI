import express from 'express';
import auth from './routes/auth';
let app=express();
app.use("/auth",auth)

const port =3001;













app.listen(3001)