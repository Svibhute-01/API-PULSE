import express from 'express'
import pool from "./db/db.js"
import apiRoutes from './routes/apiRoutes.js';
import { getCheckHistory } from "../controller/monitorController.js";
const app= express();
app.use(express.json());

app.get("/",(req, res)=>{
    res.json({message:"API Pulse backen is running"})
})

app.get("/health", async(req, res)=>{
    try{
        const result = await pool.query('SELECT NOW()');

        res.status(200).json({
            message:"Database Connected"
        })
    }catch(err){

        console.error('Health check failed:', err.message);

    }
})



app.use('/api/apis', apiRoutes);


app.listen(3000,()=>{
    console.log("App is listening at http://localhost:3000")
})