import express from 'express'
import cors from 'cors'
import dotenv from "dotenv";
dotenv.config();
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js'
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoute.js';

const app = express()

await connectCloudinary()

app.use(cors()) // front end to backend connection
app.use(express.json())  //request parsed using json
app.use(clerkMiddleware()) // what it does is clerk middleware hai user data ko authentication mai bhejtah hai


app.get('/', (req,res)=>res.send('server is live'))  //when we hit the route this function will get executed 
// home route hai public hai anyine can excess it

app.use(requireAuth())

app.use('/api/ai',aiRouter)
app.use('/api/user',userRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port', PORT)
})