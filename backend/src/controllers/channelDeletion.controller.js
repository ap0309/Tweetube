import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import ChannelDeletionService from "../services/channelDeletion.service.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

/**
 * Delete user's own channel
 */
const deleteMyChannel = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { reason, dataRetention } = req.body;
    
    // Validate data retention options
    const validRetentionPolicies = ['deleted', 'archived', 'anonymized'];
    if (dataRetention) {
        Object.values(dataRetention).forEach(policy => {
            if (!validRetentionPolicies.includes(policy)) {
                throw new ApiError(400, 'Invalid data retention policy');
            }
        });
    }
    
    const result = await ChannelDeletionService.deleteChannel(
        userId,
        reason || 'user_request',
        null,
        { dataRetention }
    );
    
    res.status(200).json(
        new ApiResponse(200, result, "Channel deleted successfully")
    );
});

/**
 * Admin delete channel
 */
const adminDeleteChannel = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason, dataRetention } = req.body;
    const adminId = req.user._id;
    
    // Check if user is admin (you can implement proper admin check)
    if (!req.user.isAdmin) {
        throw new ApiError(403, "Unauthorized: Admin access required");
    }
    
    const result = await ChannelDeletionService.deleteChannel(
        userId,
        reason || 'policy_violation',
        adminId,
        { dataRetention }
    );
    
    res.status(200).json(
        new ApiResponse(200, result, "Channel deleted by admin")
    );
});

/**
 * Recover deleted channel
 */
const recoverChannel = asyncHandler(async (req, res) => {
    const { deletedChannelId } = req.params;
    const { newUserId } = req.body;
    
    if (!newUserId) {
        throw new ApiError(400, "New user ID is required for recovery");
    }
    
    const result = await ChannelDeletionService.recoverChannel(
        deletedChannelId,
        newUserId
    );
    
    res.status(200).json(
        new ApiResponse(200, result, "Channel recovered successfully")
    );
});

/**
 * Get deletion statistics
 */
const getDeletionStats = asyncHandler(async (req, res) => {
    const stats = await ChannelDeletionService.getDeletionStats();
    
    res.status(200).json(
        new ApiResponse(200, stats, "Deletion statistics retrieved")
    );
});

/**
 * Get deleted channels list (admin only)
 */
const getDeletedChannels = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, recoverable } = req.query;
    const skip = (page - 1) * limit;
    
    // Check if user is admin
    if (!req.user.isAdmin) {
        throw new ApiError(403, "Unauthorized: Admin access required");
    }
    
    const matchStage = {};
    if (recoverable !== undefined) {
        matchStage.isRecoverable = recoverable === 'true';
    }
    
    const deletedChannels = await DeletedChannel.aggregate([
        { $match: matchStage },
        { $sort: { deletedAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
            $project: {
                username: 1,
                fullName: 1,
                stats: 1,
                deletionReason: 1,
                deletedAt: 1,
                isRecoverable: 1,
                recoveryDeadline: 1
            }
        }
    ]);
    
    const total = await DeletedChannel.countDocuments(matchStage);
    
    res.status(200).json(
        new ApiResponse(200, {
            deletedChannels,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Deleted channels retrieved")
    );
});

export {
    deleteMyChannel,
    adminDeleteChannel,
    recoverChannel,
    getDeletionStats,
    getDeletedChannels
};
