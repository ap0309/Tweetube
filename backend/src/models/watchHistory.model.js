import mongoose, { Schema } from "mongoose";

const watchHistorySchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true
        },
        // Track watch progress for resume functionality
        watchProgress: {
            type: Number, // Percentage watched (0-100)
            default: 0,
            min: 0,
            max: 100
        },
        // Track watch duration for analytics
        watchDuration: {
            type: Number, // Seconds watched
            default: 0
        },
        // Track completion status
        isCompleted: {
            type: Boolean,
            default: false,
            index: true
        },
        // Track if user liked the video
        liked: {
            type: Boolean,
            default: false
        },
        // Track device/platform for analytics
        device: {
            type: String,
            enum: ['mobile', 'desktop', 'tablet', 'tv', 'unknown'],
            default: 'unknown'
        },
        // Track watch session for analytics
        sessionId: {
            type: String,
            index: true
        },
        // Track referral source
        referrer: {
            type: String,
            enum: ['home', 'search', 'subscriptions', 'trending', 'playlist', 'external', 'unknown'],
            default: 'unknown'
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes for efficient queries
watchHistorySchema.index({ user: 1, createdAt: -1 }); // User's watch history chronologically
watchHistorySchema.index({ user: 1, video: 1 }, { unique: true }); // Prevent duplicate entries
watchHistorySchema.index({ video: 1, createdAt: -1 }); // Video's watch history
watchHistorySchema.index({ user: 1, isCompleted: 1, createdAt: -1 }); // Completed videos
watchHistorySchema.index({ createdAt: -1 }); // Recent activity
watchHistorySchema.index({ user: 1, device: 1, createdAt: -1 }); // Device-specific history

// TTL index to automatically delete old watch history (optional - keep for 1 year)
watchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to get user's watch history with pagination
watchHistorySchema.statics.getUserWatchHistory = async function(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    return await this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'videoData'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'videoData.owner',
                foreignField: '_id',
                as: 'ownerData'
            }
        },
        {
            $addFields: {
                video: { $arrayElemAt: ['$videoData', 0] },
                owner: { $arrayElemAt: ['$ownerData', 0] }
            }
        },
        {
            $project: {
                videoData: 0,
                ownerData: 0,
                'video.owner': 0
            }
        }
    ]);
};

// Static method to get video's watch statistics
watchHistorySchema.statics.getVideoWatchStats = async function(videoId) {
    return await this.aggregate([
        { $match: { video: mongoose.Types.ObjectId(videoId) } },
        {
            $group: {
                _id: null,
                totalWatches: { $sum: 1 },
                uniqueViewers: { $addToSet: '$user' },
                avgWatchProgress: { $avg: '$watchProgress' },
                completedWatches: { $sum: { $cond: ['$isCompleted', 1, 0] } },
                totalWatchDuration: { $sum: '$watchDuration' }
            }
        },
        {
            $addFields: {
                uniqueViewerCount: { $size: '$uniqueViewers' },
                completionRate: {
                    $cond: [
                        { $gt: ['$totalWatches', 0] },
                        { $divide: ['$completedWatches', '$totalWatches'] },
                        0
                    ]
                }
            }
        }
    ]);
};

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);
