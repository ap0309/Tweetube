//when using database use try catch and async await
//require("dotenv").config({path:"./env"})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js"

dotenv.config({
    path: './.env'
});

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("App encountered an error:", error);
            throw error;
        });

        app.listen(process.env.PORT || 8000, () => {
            console.log(`🚀 Server is running on port ${process.env.PORT || 8000}`);
        });
    })
    .catch((error) => {
        console.log("❌ MongoDB connection failed:", error);
        throw error;
    });

