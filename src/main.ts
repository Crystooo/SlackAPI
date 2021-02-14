import express from 'express';
import auth from './routes/auth';
import home from './routes/home';
let app=express();
app.use("/auth",auth);//schermata login
app.use("/home", home);//seconda schermata

const port =3001;













app.listen(3001)