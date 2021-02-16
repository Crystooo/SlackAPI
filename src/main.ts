import express from 'express';
import auth from './routes/auth';
import home from './routes/home';
import workspace from './routes/workspace';
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
      'password'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: "http://localhost:4200",
    preflightContinue: false,
  };
  app.use(cors(options));


app.use("/auth",auth);//schermata login
app.use("/home", home);//seconda schermata
app.use("/workspace",workspace)

const port =3001;













app.listen(3001)