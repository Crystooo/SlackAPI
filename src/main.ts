import express from 'express';
import auth from './routes/auth';
import homes from './routes/home';
import workspaces from './routes/workspace';
import channels from './routes/channel'
import cors from 'cors';
let app=express();
const options: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'email',//AGGIUNTI GLI HEADERS ALTRIMENTI CORS DAVA ERRORE
      'tkn',
      'password',
      'workspace_id',
      'channel_id',
      'to_add',
      'user_id'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: "http://localhost:4200",
    preflightContinue: false,
  };
  app.use(cors(options));


app.use("/auth",auth);
app.use("/homes", homes);
app.use("/workspaces",workspaces);
app.use("/channels", channels);

const port =3001;













app.listen(3001)