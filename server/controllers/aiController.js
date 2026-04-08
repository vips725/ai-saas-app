import { GoogleGenerativeAI } from "@google/generative-ai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from 'axios'
import { response } from "express";
import {v2 as cloudinary} from "cloudinary";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateArticle = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success:false, message:"Limit Reached" });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, ${prompt}, ${content}, 'article')`;

        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, content });

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}
export const generateBlogTitle = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt} = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success:false, message:"Limit Reached" });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, content });

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}
export const generateImage = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, publish} = req.body;
        const plan = req.plan;

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }

        const formData = new FormData()
        formData.append('prompt', prompt)
        const {data}=await axios.post("https://clipdrop-api.co/text-to-image/v1",formData ,{
            headers :{'x-api-key': process.env.CLIPDROP_API_KEY},
            responseType:"arraybuffer"
        })
        const base64Image =`data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`
        
        const {secure_url} =await cloudinary.uploader.upload(base64Image)

        await sql`INSERT INTO creations (user_id,prompt,content,type,publish)
        VALUES (${userId}, ${prompt}, ${secure_url}, 'image',  ${publish ?? false})`;


        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, secure_url});

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}
export const removeImageBackground = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const {image} =req.file;  //multer middleware
        const plan = req.plan;

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }

        
        const {secure_url} =await cloudinary.uploader.upload(image.path, {
            transformation : [
                {
                    effect: 'background_removal',
                    background_removal:'remove_the_background'
                }
            ]
        })

        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`;


        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, secure_url});

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}
export const removeImageObject = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { object } = req.body();
        const {image} =req.file;  //multer middleware
        const plan = req.plan;

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }

        
        const {public_id} =await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation : [{effect :`gen_remove:${image.path}`}],
            resource_type: 'image'
        })
        
        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, ${`Removed ${object}`}, ${imageUrl}, 'image')`;


        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, content: imageUrl});

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}