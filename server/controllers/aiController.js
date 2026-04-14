import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from 'axios'
import {v2 as cloudinary} from "cloudinary";
import fs from 'fs'
import * as pdf from "pdf-parse";

export const generateArticle = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success:false, message:"Limit Reached" });
        }

        // 🔥 OPENROUTER CALL
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model:"openai/gpt-3.5-turbo", // free model
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const content = response.data.choices[0].message.content;

        // DB SAVE (same as yours)
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
        console.log(error.response?.data || error.message);
        res.json({ success:false, message:"AI failed" });
    }
}
export const generateBlogTitle = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage >= 10){
            return res.json({ success:false, message:"Limit Reached" });
        }

        // 🔥 OPENROUTER CALL
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-3.5-turbo", // ✅ working model
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const content = response.data.choices[0].message.content;

        // DB save (same as before)
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
        console.log(error.response?.data || error.message);
        res.json({ success:false, message:"AI failed" });
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
        const image = req.file;
        const plan = req.plan;

        // ❌ REMOVE ANY req.body destructuring

        if(!image){
            return res.json({ success:false, message:"No image uploaded" });
        }

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }

        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: 'background_removal'
                }
            ]
        });

        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`;

        res.json({ success:true, secure_url });

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:"Image processing failed" });
    }
}
export const removeImageObject = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const image =req.file;  //multer middleware
        const plan = req.plan;

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }

        
        const {public_id} =await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation : [{effect :`gen_remove:${object}`}],
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
export const resumeReview = async(req, res)=>{
    try {
        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if(plan !== 'premium' ){
            return res.json({ success:false, message:"Only available for premium subscription" });
        }
        if(resume.size > 5*1024*1024){
            return res.json({success:false, message: "Resume fule size exceeds allowed size (5MB)."})
        }
        const dataBuffer = fs.readFileSync(resume.path)
        const pdfData = await pdf(dataBuffer)

        const prompt = `Review the following resume and provide constructive
        feedback on its strength, weakness, and areas for improvement
        COntent:\n\n${pdfData.text}`

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        await sql`INSERT INTO creations (user_id,prompt,content,type)
        VALUES (${userId}, 'Review the uploaded resume, ${content}, 'resume-review')`;


        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId,{
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            });
        }

        res.json({ success:true, content: content});

    } catch (error) {
        console.log(error.message);
        res.json({ success:false, message:error.message });
    }
}