import express from 'express';
import auth from './routes/auth';
import home from './routes/home';
import workspace from './routes/workspace';

let app=express();
app.use("/auth",auth);//schermata login
app.use("/home", home);//seconda schermata
app.use("/workspace",workspace)

const port =3001;













app.listen(3001)