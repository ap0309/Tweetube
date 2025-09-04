import mongoose, { Schema } from "mongoose";

const deletedChannelSchema = new Schema({
    // Store original user data for reference
    originalUserId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    // Channel statistics at time of deletion
    stats: {
        subscriberCount: Number,
        videoCount: Number,
        totalViews: Number,
        totalLikes: Number,
        totalComments: Number
    },
    // Deletion metadata
    deletionReason: {
        type: String,
        enum: ['user_request', 'policy_violation', 'copyright', 'spam', 'other'],
        default: 'user_request'
    },
    deletedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User" // Admin who processed deletion
    },
    // Grace period for recovery
    recoveryDeadline: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    isRecoverable: {
        type: Boolean,
        default: true
    },
    // Data retention policy
    dataRetention: {
        videos: {
            type: String,
            enum: ['deleted', 'archived', 'anonymized'],
            default: 'archived'
        },
        comments: {
            type: String,
            enum: ['deleted', 'archived', 'anonymized'],
            default: 'anonymized'
        },
        analytics: {
            type: String,
            enum: ['deleted', 'archived', 'anonymized'],
            default: 'archived'
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
deletedChannelSchema.index({ deletedAt: -1 });
deletedChannelSchema.index({ isRecoverable: 1, recoveryDeadline: 1 });
deletedChannelSchema.index({ originalUserId: 1 }, { unique: true });

// TTL index to permanently delete after recovery deadline
deletedChannelSchema.index({ 
    recoveryDeadline: 1 
}, { 
    expireAfterSeconds: 0,
    partialFilterExpression: { isRecoverable: false }
});

export const DeletedChannel = mongoose.model("DeletedChannel", deletedChannelSchema);
