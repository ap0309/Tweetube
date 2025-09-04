import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // Subscription status
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled'],
        default: 'active',
        index: true
    },
    // Notification preferences for this subscription
    notifications: {
        newVideos: {
            type: Boolean,
            default: true
        },
        liveStreams: {
            type: Boolean,
            default: true
        },
        communityPosts: {
            type: Boolean,
            default: true
        },
        highlights: {
            type: Boolean,
            default: true
        }
    },
    // Subscription metadata
    subscriptionType: {
        type: String,
        enum: ['free', 'premium', 'sponsor'],
        default: 'free',
        index: true
    },
    // Track subscription analytics
    analytics: {
        lastVideoWatched: {
            type: Date
        },
        videosWatched: {
            type: Number,
            default: 0
        },
        totalWatchTime: {
            type: Number,
            default: 0 // in seconds
        },
        lastNotificationSent: {
            type: Date
        }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
subscriptionSchema.index({ subscriber: 1, status: 1, createdAt: -1 }); // User's active subscriptions
subscriptionSchema.index({ channel: 1, status: 1, createdAt: -1 }); // Channel's subscribers
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true }); // Prevent duplicate subscriptions
subscriptionSchema.index({ status: 1, createdAt: -1 }); // Active subscriptions
subscriptionSchema.index({ subscriptionType: 1, status: 1 }); // Premium subscriptions

// TTL index for cancelled subscriptions (delete after 1 year)
subscriptionSchema.index({ 
    createdAt: 1 
}, { 
    expireAfterSeconds: 31536000, 
    partialFilterExpression: { status: 'cancelled' } 
});

// Static method to get user's subscriptions with pagination
subscriptionSchema.statics.getUserSubscriptions = async function(userId, page = 1, limit = 20, status = 'active') {
    const skip = (page - 1) * limit;
    
    return await this.aggregate([
        { 
            $match: { 
                subscriber: mongoose.Types.ObjectId(userId),
                status: status
            } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'channel',
                foreignField: '_id',
                as: 'channelData'
            }
        },
        {
            $addFields: {
                channel: { $arrayElemAt: ['$channelData', 0] }
            }
        },
        {
            $project: {
                channelData: 0,
                'channel.password': 0,
                'channel.refreshToken': 0
            }
        }
    ]);
};

// Static method to get channel's subscribers with pagination
subscriptionSchema.statics.getChannelSubscribers = async function(channelId, page = 1, limit = 20, status = 'active') {
    const skip = (page - 1) * limit;
    
    return await this.aggregate([
        { 
            $match: { 
                channel: mongoose.Types.ObjectId(channelId),
                status: status
            } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                as: 'subscriberData'
            }
        },
        {
            $addFields: {
                subscriber: { $arrayElemAt: ['$subscriberData', 0] }
            }
        },
        {
            $project: {
                subscriberData: 0,
                'subscriber.password': 0,
                'subscriber.refreshToken': 0
            }
        }
    ]);
};

// Static method to get subscription statistics
subscriptionSchema.statics.getSubscriptionStats = async function(channelId) {
    return await this.aggregate([
        { $match: { channel: mongoose.Types.ObjectId(channelId) } },
        {
            $group: {
                _id: null,
                totalSubscribers: { $sum: 1 },
                activeSubscribers: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                premiumSubscribers: {
                    $sum: { $cond: [{ $eq: ['$subscriptionType', 'premium'] }, 1, 0] }
                },
                avgVideosWatched: { $avg: '$analytics.videosWatched' },
                totalWatchTime: { $sum: '$analytics.totalWatchTime' }
            }
        }
    ]);
};

// Static method to get trending channels (most subscribed)
subscriptionSchema.statics.getTrendingChannels = async function(limit = 20, timeframe = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    return await this.aggregate([
        {
            $match: {
                status: 'active',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$channel',
                newSubscribers: { $sum: 1 },
                totalSubscribers: { $sum: 1 }
            }
        },
        { $sort: { newSubscribers: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'channelData'
            }
        },
        {
            $addFields: {
                channel: { $arrayElemAt: ['$channelData', 0] }
            }
        },
        {
            $project: {
                channelData: 0,
                'channel.password': 0,
                'channel.refreshToken': 0
            }
        }
    ]);
};

// Method to toggle subscription
subscriptionSchema.statics.toggleSubscription = async function(subscriberId, channelId) {
    const existingSubscription = await this.findOne({
        subscriber: subscriberId,
        channel: channelId
    });
    
    if (existingSubscription) {
        // Toggle status
        existingSubscription.status = existingSubscription.status === 'active' ? 'cancelled' : 'active';
        await existingSubscription.save();
        
        // Update subscriber counts
        await this.updateSubscriberCounts(channelId);
        
        return {
            isSubscribed: existingSubscription.status === 'active',
            subscription: existingSubscription
        };
    } else {
        // Create new subscription
        const newSubscription = await this.create({
            subscriber: subscriberId,
            channel: channelId,
            status: 'active'
        });
        
        // Update subscriber counts
        await this.updateSubscriberCounts(channelId);
        
        return {
            isSubscribed: true,
            subscription: newSubscription
        };
    }
};

// Static method to update subscriber counts
subscriptionSchema.statics.updateSubscriberCounts = async function(channelId) {
    const activeCount = await this.countDocuments({
        channel: channelId,
        status: 'active'
    });
    
    await mongoose.model('User').findByIdAndUpdate(channelId, {
        subscriberCount: activeCount
    });
    
    return activeCount;
};

export const Subscription = mongoose.model("Subscription", subscriptionSchema);