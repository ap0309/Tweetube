import mongoose from "mongoose"
import bcrypt  from "bcrypt"
import jwt from "jsonwebtoken"

// will use mongoose pre hook to work on data before injecting into the database

const UserSchema  = new mongoose.Schema( 
    {
        username : {
            type : String,
            required : true,
            trim : true,
            unique: true,
            lowercase : true,
            index : true
        },
        email:{
            type : String,
            required : true,
            trim : true,
            unique: true,
            lowercase : true,
        },
        fullname:{
            type : String,
            required : true,
            trim : true,
            index : true
        },
        avatar : {
            type :String , // cloudinary url
            required :true,
        },
        coverImage : {
            type :String , // cloudinary url
        },
        watchHistory : [  // use moongose aggregate paginate . aggregation queries
            {
                type : mongoose.Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password : {
            type : String,
            required : [true, "Password is requrired"]
        },
        refreshToken: {
            type : String
        }
    },
{timestamps : true}
);

UserSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10);
    next()
})

UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password , this.password)
}

UserSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id : this._id,
        email : this.email,
        username : this.username,
        fullname  : this.fullname

    },process.env.ACCESS_TOKEN_SECRET,{
        expiresIn : ACCESS_TOKEN_EXPIRY
    }
)
}
UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id : this._id,

    },process.env.REFRESH_TOKEN_SECRET,{
        expiresIn : REFRESH_TOKEN_EXPIRY
    }
 )
}

export const User = mongoose.model("User",UserSchema);
