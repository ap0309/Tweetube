import mongoose, { Schema } from "mongoose";

const engagementSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // Polymorphic reference to different content types
    content: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    contentType: {
        type: String,
        enum: ['video', 'comment', 'tweet', 'playlist'],
        required: true,
        index: true
    },
    // Engagement type
    engagementType: {
        type: String,
        enum: ['like', 'dislike', 'love', 'laugh', 'angry', 'sad', 'wow'],
        required: true,
        index: true
    },
    // Engagement metadata
    metadata: {
        // For video engagements
        watchTime: Number, // Time spent watching before engaging
        watchProgress: Number, // Percentage of video watched
        
        // For comment engagements
        commentDepth: Number, // How deep in the comment thread
        
        // For all engagements
        device: {
            type: String,
            enum: ['mobile', 'desktop', 'tablet', 'tv'],
            default: 'desktop'
        },
        platform: {
            type: String,
            enum: ['web', 'android', 'ios', 'tv'],
            default: 'web'
        }
    },
    // Engagement analytics
    analytics: {
        sessionId: String,
        referrer: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
engagementSchema.index({ user: 1, contentType: 1, createdAt: -1 }); // User's engagements by type
engagementSchema.index({ content: 1, contentType: 1, engagementType: 1 }); // Content engagement stats
engagementSchema.index({ user: 1, content: 1, contentType: 1 }, { unique: true }); // Prevent duplicate engagements
engagementSchema.index({ engagementType: 1, createdAt: -1 }); // Engagement type analytics
engagementSchema.index({ contentType: 1, engagementType: 1, createdAt: -1 }); // Content type analytics

// TTL index to clean up old engagement data (keep for 2 years)
engagementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Static method to get content engagement statistics
engagementSchema.statics.getContentEngagementStats = async function(contentId, contentType) {
    return await this.aggregate([
        {
            $match: {
                content: mongoose.Types.ObjectId(contentId),
                contentType: contentType
            }
        },
        {
            $group: {
                _id: '$engagementType',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        },
        {
            $project: {
                uniqueUsers: 0
            }
        }
    ]);
};

// Static method to get user's engagement history
engagementSchema.statics.getUserEngagements = async function(userId, contentType = null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const matchStage = { user: mongoose.Types.ObjectId(userId) };
    
    if (contentType) matchStage.contentType = contentType;
    
    return await this.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: contentType === 'video' ? 'videos' : 
                      contentType === 'comment' ? 'comments' :
                      contentType === 'tweet' ? 'tweets' : 'playlists',
                localField: 'content',
                foreignField: '_id',
                as: 'contentData'
            }
        },
        {
            $addFields: {
                content: { $arrayElemAt: ['$contentData', 0] }
            }
        },
        {
            $project: {
                contentData: 0
            }
        }
    ]);
};

// Static method to toggle engagement (like/unlike)
engagementSchema.statics.toggleEngagement = async function(userId, contentId, contentType, engagementType = 'like') {
    const existingEngagement = await this.findOne({
        user: userId,
        content: contentId,
        contentType: contentType,
        engagementType: engagementType
    });
    
    if (existingEngagement) {
        // Remove engagement
        await this.findByIdAndDelete(existingEngagement._id);
        await this.updateContentEngagementCounts(contentId, contentType);
        return { isEngaged: false, engagement: null };
    } else {
        // Remove any other engagement types for the same content
        await this.deleteMany({
            user: userId,
            content: contentId,
            contentType: contentType
        });
        
        // Create new engagement
        const newEngagement = await this.create({
            user: userId,
            content: contentId,
            contentType: contentType,
            engagementType: engagementType
        });
        
        await this.updateContentEngagementCounts(contentId, contentType);
        return { isEngaged: true, engagement: newEngagement };
    }
};

// Static method to update content engagement counts
engagementSchema.statics.updateContentEngagementCounts = async function(contentId, contentType) {
    const stats = await this.getContentEngagementStats(contentId, contentType);
    
    const likeCount = stats.find(s => s._id === 'like')?.count || 0;
    const dislikeCount = stats.find(s => s._id === 'dislike')?.count || 0;
    
    // Update the appropriate model based on content type
    let Model;
    switch (contentType) {
        case 'video':
            Model = mongoose.model('Video');
            await Model.findByIdAndUpdate(contentId, {
                likeCount: likeCount,
                dislikeCount: dislikeCount
            });
            break;
        case 'comment':
            Model = mongoose.model('Comment');
            await Model.findByIdAndUpdate(contentId, {
                likeCount: likeCount,
                dislikeCount: dislikeCount
            });
            break;
        case 'tweet':
            Model = mongoose.model('Tweet');
            await Model.findByIdAndUpdate(contentId, {
                likeCount: likeCount,
                dislikeCount: dislikeCount
            });
            break;
    }
    
    return { likeCount, dislikeCount };
};

// Static method to get trending content based on engagement
engagementSchema.statics.getTrendingContent = async function(contentType, limit = 20, timeframe = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    return await this.aggregate([
        {
            $match: {
                contentType: contentType,
                engagementType: 'like',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$content',
                likeCount: { $sum: 1 },
                uniqueUsers: { $addToSet: '$user' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        },
        { $sort: { likeCount: -1, uniqueUserCount: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: contentType === 'video' ? 'videos' : 
                      contentType === 'comment' ? 'comments' :
                      contentType === 'tweet' ? 'tweets' : 'playlists',
                localField: '_id',
                foreignField: '_id',
                as: 'contentData'
            }
        },
        {
            $addFields: {
                content: { $arrayElemAt: ['$contentData', 0] }
            }
        },
        {
            $project: {
                contentData: 0,
                uniqueUsers: 0
            }
        }
    ]);
};

export const Engagement = mongoose.model("Engagement", engagementSchema);
