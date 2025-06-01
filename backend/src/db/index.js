import mongoose from "mongoose";
import { DB_NAME} from "../constants.js";

mongoose.set('strictQuery', false);
// DB is in another continent
const connectDB = async () =>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(" "); 
        console.log(`MongoDB connected successfully ! DB host ${connectionInstance.connection.host}`);
    }catch(error){
        console.error("Error connecting to the database:", error);
        process.exit(1);
        throw error;
    }
}

export default connectDB;

// sample code which can be directly written in index.js of src 
/*
import express from "express";
const app = express();

;( async () => {
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/DB_NAME`);
       app.on("error",(error) => {
           console.error("Error connecting to the database:", error);
           throw error
       });
       
       app.listen(process.env.PORT,()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
       })

    }catch(error){
        console.log("Error :",error);
        throw error;
    }
})()
*/