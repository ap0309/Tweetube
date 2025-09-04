import mongoose, { Schema } from "mongoose";

// Daily analytics aggregation
const dailyAnalyticsSchema = new Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    // User analytics
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    // Content analytics
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
    // Metrics
    metrics: {
        views: {
            type: Number,
            default: 0
        },
        uniqueViews: {
            type: Number,
            default: 0
        },
        watchTime: {
            type: Number,
            default: 0 // Total watch time in seconds
        },
        avgWatchTime: {
            type: Number,
            default: 0 // Average watch time per view
        },
        likes: {
            type: Number,
            default: 0
        },
        dislikes: {
            type: Number,
            default: 0
        },
        comments: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        },
        subscribers: {
            type: Number,
            default: 0
        },
        // Engagement metrics
        clickThroughRate: {
            type: Number,
            default: 0
        },
        retentionRate: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0
        }
    },
    // Geographic data
    geography: {
        countries: [{
            country: String,
            views: Number,
            watchTime: Number
        }],
        regions: [{
            region: String,
            views: Number,
            watchTime: Number
        }]
    },
    // Device data
    devices: {
        mobile: {
            views: { type: Number, default: 0 },
            watchTime: { type: Number, default: 0 }
        },
        desktop: {
            views: { type: Number, default: 0 },
            watchTime: { type: Number, default: 0 }
        },
        tablet: {
            views: { type: Number, default: 0 },
            watchTime: { type: Number, default: 0 }
        },
        tv: {
            views: { type: Number, default: 0 },
            watchTime: { type: Number, default: 0 }
        }
    },
    // Traffic sources
    trafficSources: {
        direct: { type: Number, default: 0 },
        search: { type: Number, default: 0 },
        social: { type: Number, default: 0 },
        external: { type: Number, default: 0 },
        subscriptions: { type: Number, default: 0 },
        playlists: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
dailyAnalyticsSchema.index({ date: -1, contentType: 1 });
dailyAnalyticsSchema.index({ user: 1, date: -1 });
dailyAnalyticsSchema.index({ content: 1, date: -1 });
dailyAnalyticsSchema.index({ contentType: 1, 'metrics.views': -1, date: -1 });

// TTL index to keep analytics for 2 years
dailyAnalyticsSchema.index({ date: 1 }, { expireAfterSeconds: 63072000 });

// Real-time analytics for live tracking
const realtimeAnalyticsSchema = new Schema({
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
    // Current metrics
    currentViewers: {
        type: Number,
        default: 0
    },
    // Session tracking
    sessions: [{
        sessionId: String,
        userId: Schema.Types.ObjectId,
        startTime: Date,
        lastActivity: Date,
        watchTime: Number,
        device: String,
        location: {
            country: String,
            region: String
        }
    }],
    // Real-time engagement
    recentEngagements: [{
        type: String,
        userId: Schema.Types.ObjectId,
        timestamp: Date
    }],
    // Live metrics
    liveMetrics: {
        peakViewers: {
            type: Number,
            default: 0
        },
        totalWatchTime: {
            type: Number,
            default: 0
        },
        engagementScore: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

realtimeAnalyticsSchema.index({ content: 1, contentType: 1 });
realtimeAnalyticsSchema.index({ 'sessions.lastActivity': 1 });

// TTL index to clean up old sessions (1 hour)
realtimeAnalyticsSchema.index({ 'sessions.lastActivity': 1 }, { expireAfterSeconds: 3600 });

// User behavior analytics
const userBehaviorSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    // Daily activity metrics
    activity: {
        videosWatched: { type: Number, default: 0 },
        videosLiked: { type: Number, default: 0 },
        commentsPosted: { type: Number, default: 0 },
        videosUploaded: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 }, // in seconds
        sessions: { type: Number, default: 0 }
    },
    // Content preferences
    preferences: {
        categories: [{
            category: String,
            watchTime: Number,
            videosWatched: Number
        }],
        creators: [{
            creator: Schema.Types.ObjectId,
            watchTime: Number,
            videosWatched: Number
        }],
        devices: [{
            device: String,
            usage: Number
        }]
    },
    // Engagement patterns
    engagement: {
        avgWatchTime: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        interactionRate: { type: Number, default: 0 },
        sharingRate: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

userBehaviorSchema.index({ user: 1, date: -1 });
userBehaviorSchema.index({ date: -1, 'activity.timeSpent': -1 });

// TTL index to keep user behavior data for 1 year
userBehaviorSchema.index({ date: 1 }, { expireAfterSeconds: 31536000 });

// Static methods for analytics
dailyAnalyticsSchema.statics.getContentAnalytics = async function(contentId, contentType, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                content: mongoose.Types.ObjectId(contentId),
                contentType: contentType,
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: '$metrics.views' },
                totalUniqueViews: { $sum: '$metrics.uniqueViews' },
                totalWatchTime: { $sum: '$metrics.watchTime' },
                avgWatchTime: { $avg: '$metrics.avgWatchTime' },
                totalLikes: { $sum: '$metrics.likes' },
                totalDislikes: { $sum: '$metrics.dislikes' },
                totalComments: { $sum: '$metrics.comments' },
                totalShares: { $sum: '$metrics.shares' },
                avgRetentionRate: { $avg: '$metrics.retentionRate' },
                avgCompletionRate: { $avg: '$metrics.completionRate' }
            }
        }
    ]);
};

dailyAnalyticsSchema.statics.getTrendingContent = async function(contentType, limit = 20, timeframe = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    return await this.aggregate([
        {
            $match: {
                contentType: contentType,
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$content',
                totalViews: { $sum: '$metrics.views' },
                totalWatchTime: { $sum: '$metrics.watchTime' },
                totalLikes: { $sum: '$metrics.likes' },
                totalComments: { $sum: '$metrics.comments' },
                avgRetentionRate: { $avg: '$metrics.retentionRate' }
            }
        },
        {
            $addFields: {
                trendingScore: {
                    $add: [
                        { $multiply: ['$totalViews', 0.4] },
                        { $multiply: ['$totalLikes', 0.3] },
                        { $multiply: ['$totalComments', 0.2] },
                        { $multiply: ['$avgRetentionRate', 0.1] }
                    ]
                }
            }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit }
    ]);
};

userBehaviorSchema.statics.getUserInsights = async function(userId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalVideosWatched: { $sum: '$activity.videosWatched' },
                totalTimeSpent: { $sum: '$activity.timeSpent' },
                totalVideosLiked: { $sum: '$activity.videosLiked' },
                totalCommentsPosted: { $sum: '$activity.commentsPosted' },
                avgWatchTime: { $avg: '$engagement.avgWatchTime' },
                avgCompletionRate: { $avg: '$engagement.completionRate' },
                topCategories: {
                    $push: {
                        $reduce: {
                            input: '$preferences.categories',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', ['$$this']] }
                        }
                    }
                }
            }
        }
    ]);
};

export const DailyAnalytics = mongoose.model("DailyAnalytics", dailyAnalyticsSchema);
export const RealtimeAnalytics = mongoose.model("RealtimeAnalytics", realtimeAnalyticsSchema);
export const UserBehavior = mongoose.model("UserBehavior", userBehaviorSchema);
