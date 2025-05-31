//when using database use try catch and async await
//require("dotenv").config({path:"./env"})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()
