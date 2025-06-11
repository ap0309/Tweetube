//when using database use try catch and async await
//require("dotenv").config({path:"./env"})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from "./app.js"
dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.on("error" , (error)=>{
        console.log("Mongo db connection failed" , err);
        throw error;
    })
    app.listen(process.env.PORT || 8000  , ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    })

})
.catch((error)=>{
    console.log("Mongo db connection failed" , error);
    throw error;

})

