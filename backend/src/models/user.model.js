import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt' 

const userSchema = new Schema(
    {
        username : {
            type : String , 
            required : true , 
            unique : true ,
            lowercase : true , 
            trim : true , 
            index: true 
        } ,
        fullName : {
            type : String , 
            required : true , 
            trim : true , 
            index : true 
        } , 
        email : {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        } ,
        avatar : {
            type : String , 
            required : true 
        } , 
        coverImage : {
            type : String
        } , 
        // Denormalized counters for performance
        subscriberCount: {
            type: Number,
            default: 0,
            index: true
        },
        videoCount: {
            type: Number,
            default: 0,
            index: true
        },
        totalViews: {
            type: Number,
            default: 0,
            index: true
        },
        // User preferences and settings
        preferences: {
            notifications: {
                email: { type: Boolean, default: true },
                push: { type: Boolean, default: true },
                comments: { type: Boolean, default: true },
                subscriptions: { type: Boolean, default: true }
            },
            privacy: {
                showSubscriberCount: { type: Boolean, default: true },
                showViewCount: { type: Boolean, default: true },
                allowComments: { type: Boolean, default: true }
            },
            channel: {
                description: String,
                country: String,
                language: { type: String, default: 'en' },
                category: String
            }
        },
        // Account status and verification
        isVerified: {
            type: Boolean,
            default: false,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        // Remove watchHistory from user - will be separate collection
        password : {
            type : String , 
            required : [true , "password is required"]
        } ,
        refreshToken : {
            type : String
        } 
    } , 
    {
        timestamps : true 
    }
)

// Compound indexes for common queries
userSchema.index({ username: 1, isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ subscriberCount: -1, isActive: 1 }); // For trending creators
userSchema.index({ totalViews: -1, isActive: 1 }); // For most viewed creators
userSchema.index({ createdAt: -1, isActive: 1 }); // For new creators

userSchema.pre( "save" , async function (next) {
    if( ! this.isModified("password") ) return next()
    this.password = await bcrypt.hash(this.password , 10)
    next()
} ) 

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// Method to update subscriber count
userSchema.methods.updateSubscriberCount = async function() {
    const count = await mongoose.model('Subscription').countDocuments({ channel: this._id });
    this.subscriberCount = count;
    await this.save();
    return count;
}

// Method to update video count
userSchema.methods.updateVideoCount = async function() {
    const count = await mongoose.model('Video').countDocuments({ owner: this._id, isPublished: true });
    this.videoCount = count;
    await this.save();
    return count;
}

export const User = mongoose.model("User" , userSchema)