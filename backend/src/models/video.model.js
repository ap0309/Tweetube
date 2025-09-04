import mongoose, { Schema } from "mongoose";
import mongooseAggregateePaginate from 'mongoose-aggregate-paginate-v2'

const videoSchema = new Schema(
    {
        videoFile : {
            type : String , 
            required : true 
        } , 
        thumbnail : {
            type : String , 
            required : true 
        } , 
        title : {
            type : String , 
            required : true,
            trim: true,
            index: 'text' // Text index for search
        } ,
        description : {
            type : String , 
            required : true,
            trim: true,
            index: 'text' // Text index for search
        } ,
        duration : {
            type : Number , 
            required : true,
            index: true
        } ,
        views : {
            type : Number ,
            default : 0,
            index: true
        } ,
        // Denormalized like/dislike counts for performance
        likeCount: {
            type: Number,
            default: 0,
            index: true
        },
        dislikeCount: {
            type: Number,
            default: 0,
            index: true
        },
        commentCount: {
            type: Number,
            default: 0,
            index: true
        },
        // Video metadata
        category: {
            type: String,
            enum: [
                'Entertainment', 'Education', 'Gaming', 'Music', 'Sports', 
                'Technology', 'News', 'Comedy', 'Lifestyle', 'Travel', 
                'Food', 'Fashion', 'Science', 'Art', 'Other'
            ],
            default: 'Other',
            index: true
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        // Video quality and format info
        quality: {
            type: String,
            enum: ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4K'],
            default: '720p'
        },
        fileSize: {
            type: Number, // Size in bytes
            index: true
        },
        // Video status and publishing
        isPublished : {
            type : Boolean , 
            default : true,
            index: true
        },
        publishedAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        // Video analytics
        analytics: {
            watchTime: {
                type: Number,
                default: 0 // Total watch time in seconds
            },
            retentionRate: {
                type: Number,
                default: 0 // Average retention percentage
            },
            clickThroughRate: {
                type: Number,
                default: 0 // CTR percentage
            }
        },
        // Video monetization
        monetization: {
            isMonetized: {
                type: Boolean,
                default: false
            },
            adBreaks: [{
                time: Number, // Time in seconds where ad should play
                duration: Number // Ad duration in seconds
            }]
        },
        // Video engagement metrics
        engagement: {
            avgWatchTime: {
                type: Number,
                default: 0
            },
            completionRate: {
                type: Number,
                default: 0
            },
            shareCount: {
                type: Number,
                default: 0
            }
        },
        // Video processing status
        processingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'completed',
            index: true
        },
        // Video privacy settings
        privacy: {
            type: String,
            enum: ['public', 'unlisted', 'private'],
            default: 'public',
            index: true
        },
        // Video age restriction
        ageRestricted: {
            type: Boolean,
            default: false,
            index: true
        },
        // Video language
        language: {
            type: String,
            default: 'en',
            index: true
        },
        // Video location/region
        region: {
            type: String,
            default: 'US',
            index: true
        },
        owner : {
            type : Schema.Types.ObjectId , 
            ref : "User",
            required: true,
            index: true
        }
    },
    {
        timestamps : true 
    }
)

// Compound indexes for common queries
videoSchema.index({ owner: 1, isPublished: 1, createdAt: -1 }); // User's published videos
videoSchema.index({ category: 1, isPublished: 1, views: -1 }); // Category trending
videoSchema.index({ isPublished: 1, publishedAt: -1 }); // Recent published videos
videoSchema.index({ isPublished: 1, views: -1 }); // Most viewed videos
videoSchema.index({ isPublished: 1, likeCount: -1 }); // Most liked videos
videoSchema.index({ tags: 1, isPublished: 1 }); // Videos by tags
videoSchema.index({ language: 1, isPublished: 1, views: -1 }); // Language-specific trending
videoSchema.index({ region: 1, isPublished: 1, views: -1 }); // Region-specific trending

// Text search index
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

videoSchema.plugin(mongooseAggregateePaginate)

// Static method to get trending videos
videoSchema.statics.getTrendingVideos = async function(limit = 20, category = null, region = 'US') {
    const matchStage = {
        isPublished: true,
        privacy: 'public'
    };
    
    if (category) matchStage.category = category;
    if (region) matchStage.region = region;
    
    return await this.aggregate([
        { $match: matchStage },
        {
            $addFields: {
                // Calculate trending score based on views, likes, and recency
                trendingScore: {
                    $add: [
                        { $multiply: ['$views', 0.4] },
                        { $multiply: ['$likeCount', 0.3] },
                        { $multiply: ['$commentCount', 0.1] },
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        { $subtract: [new Date(), '$publishedAt'] },
                                        86400000 // 24 hours in milliseconds
                                    ]
                                },
                                -0.2 // Penalty for older videos
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        {
            $addFields: {
                owner: { $arrayElemAt: ['$owner', 0] }
            }
        }
    ]);
};

// Static method to get recommended videos for a user
videoSchema.statics.getRecommendedVideos = async function(userId, limit = 20) {
    // This is a simplified recommendation algorithm
    // In production, you'd use more sophisticated ML algorithms
    return await this.aggregate([
        { $match: { isPublished: true, privacy: 'public' } },
        {
            $lookup: {
                from: 'watchhistories',
                localField: '_id',
                foreignField: 'video',
                as: 'watchData'
            }
        },
        {
            $addFields: {
                userWatched: {
                    $gt: [
                        {
                            $size: {
                                $filter: {
                                    input: '$watchData',
                                    cond: { $eq: ['$$this.user', mongoose.Types.ObjectId(userId)] }
                                }
                            }
                        },
                        0
                    ]
                }
            }
        },
        { $match: { userWatched: false } }, // Exclude already watched videos
        { $sort: { views: -1, likeCount: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        {
            $addFields: {
                owner: { $arrayElemAt: ['$owner', 0] }
            }
        }
    ]);
};

export const Video = mongoose.model("Video" , videoSchema)