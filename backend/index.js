import express from 'express'
import pool from "./db/db.js"
import apiRoutes from './routes/apiRoutes.js';
import { startMonitoringScheduler }
    from "./scheduler/monitorScheduler.js";

import { connectRedis } from "./db/redis.js";
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

app.get("/test-500", (req, res) => {
    res.status(500).json({
        message: "Simulated internal server error"
    });
});

app.get("/test-timeout", async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 8000));

    res.status(200).json({
        message: "Response returned after 8 seconds"
    });
});



app.use('/api/apis', apiRoutes);
await connectRedis();
startMonitoringScheduler();
app.listen(3000,()=>{
    console.log("App is listening at http://localhost:3000")
})