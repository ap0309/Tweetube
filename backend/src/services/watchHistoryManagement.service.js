import mongoose from 'mongoose';
import { WatchHistory } from '../models/watchHistory.model.js';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';

class WatchHistoryManagementService {
    /**
     * Get user's watch history with filtering options
     */
    static async getUserWatchHistory(userId, options = {}) {
        const {
            page = 1,
            limit = 20,
            includeArchived = false,
            includeDeletedChannels = false,
            device = null,
            dateRange = null
        } = options;

        const skip = (page - 1) * limit;
        const matchStage = { user: userId };

        // Filter out archived items unless specifically requested
        if (!includeArchived) {
            matchStage.archived = { $ne: true };
        }

        // Filter out deleted channel content unless specifically requested
        if (!includeDeletedChannels) {
            matchStage['metadata.deletedChannel'] = { $ne: true };
        }

        // Filter by device
        if (device) {
            matchStage.device = device;
        }

        // Filter by date range
        if (dateRange) {
            matchStage.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }

        return await WatchHistory.aggregate([
            { $match: matchStage },
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
                    owner: { $arrayElemAt: ['$ownerData', 0] },
                    isFromDeletedChannel: '$metadata.deletedChannel',
                    originalVideoId: '$metadata.originalVideoId'
                }
            },
            {
                $project: {
                    videoData: 0,
                    ownerData: 0
                }
            }
        ]);
    }

    /**
     * Get watch history statistics for a user
     */
    static async getUserWatchStats(userId) {
        const stats = await WatchHistory.aggregate([
            { $match: { user: userId, archived: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    totalVideosWatched: { $sum: 1 },
                    totalWatchTime: { $sum: '$watchDuration' },
                    avgWatchProgress: { $avg: '$watchProgress' },
                    completedVideos: { $sum: { $cond: ['$isCompleted', 1, 0] } },
                    likedVideos: { $sum: { $cond: ['$liked', 1, 0] } },
                    videosFromDeletedChannels: {
                        $sum: { $cond: ['$metadata.deletedChannel', 1, 0] }
                    }
                }
            }
        ]);

        return stats[0] || {
            totalVideosWatched: 0,
            totalWatchTime: 0,
            avgWatchProgress: 0,
            completedVideos: 0,
            likedVideos: 0,
            videosFromDeletedChannels: 0
        };
    }

    /**
     * Clean up watch history for deleted videos
     */
    static async cleanupDeletedVideos() {
        console.log('Cleaning up watch history for deleted videos...');
        
        // Find videos that no longer exist
        const existingVideoIds = await Video.find({}).distinct('_id');
        
        const result = await WatchHistory.updateMany(
            {
                video: { $nin: existingVideoIds },
                archived: { $ne: true }
            },
            {
                $set: {
                    archived: true,
                    archivedAt: new Date(),
                    archivedReason: 'video_deleted',
                    metadata: {
                        deletedChannel: true,
                        originalVideoId: '$video'
                    }
                }
            }
        );

        console.log(`Cleaned up ${result.modifiedCount} watch history records for deleted videos`);
        return result;
    }

    /**
     * Restore watch history for recovered channel
     */
    static async restoreWatchHistoryForChannel(deletedChannelId, newUserId) {
        console.log('Restoring watch history for recovered channel...');
        
        const result = await WatchHistory.updateMany(
            {
                'metadata.originalVideoId': { $exists: true },
                archived: true,
                archivedReason: 'channel_deleted'
            },
            {
                $set: {
                    user: newUserId,
                    archived: false,
                    archivedAt: null,
                    archivedReason: null,
                    'metadata.deletedChannel': false,
                    video: '$metadata.originalVideoId'
                },
                $unset: {
                    'metadata.originalVideoId': 1
                }
            }
        );

        console.log(`Restored ${result.modifiedCount} watch history records`);
        return result;
    }

    /**
     * Get analytics for deleted channel content
     */
    static async getDeletedChannelAnalytics() {
        return await WatchHistory.aggregate([
            { $match: { 'metadata.deletedChannel': true } },
            {
                $group: {
                    _id: null,
                    totalWatchRecords: { $sum: 1 },
                    totalWatchTime: { $sum: '$watchDuration' },
                    avgWatchProgress: { $avg: '$watchProgress' },
                    completedVideos: { $sum: { $cond: ['$isCompleted', 1, 0] } },
                    likedVideos: { $sum: { $cond: ['$liked', 1, 0] } }
                }
            }
        ]);
    }

    /**
     * Export user's watch history for data portability
     */
    static async exportUserWatchHistory(userId, format = 'json') {
        const watchHistory = await WatchHistory.find({ user: userId })
            .populate('video', 'title description duration thumbnail')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            const csvData = watchHistory.map(record => ({
                videoTitle: record.video?.title || '[Deleted Video]',
                videoDescription: record.video?.description || '',
                watchDate: record.createdAt,
                watchProgress: record.watchProgress,
                watchDuration: record.watchDuration,
                isCompleted: record.isCompleted,
                liked: record.liked,
                device: record.device,
                isFromDeletedChannel: record.metadata?.deletedChannel || false
            }));

            return csvData;
        }

        return watchHistory;
    }

    /**
     * Clear user's watch history
     */
    static async clearUserWatchHistory(userId, options = {}) {
        const { archive = false, reason = 'user_request' } = options;

        if (archive) {
            // Archive instead of delete
            const result = await WatchHistory.updateMany(
                { user: userId, archived: { $ne: true } },
                {
                    $set: {
                        archived: true,
                        archivedAt: new Date(),
                        archivedReason: reason
                    }
                }
            );
            return { archived: result.modifiedCount };
        } else {
            // Delete permanently
            const result = await WatchHistory.deleteMany({ user: userId });
            return { deleted: result.deletedCount };
        }
    }

    /**
     * Get watch history recommendations based on deleted content
     */
    static async getRecommendationsForDeletedContent(userId, limit = 10) {
        // Get user's watch history for deleted channels
        const deletedChannelHistory = await WatchHistory.find({
            user: userId,
            'metadata.deletedChannel': true,
            archived: { $ne: true }
        }).limit(100);

        if (deletedChannelHistory.length === 0) {
            return [];
        }

        // Extract categories and tags from deleted videos
        const categories = [];
        const tags = [];

        for (const record of deletedChannelHistory) {
            if (record.video?.category) {
                categories.push(record.video.category);
            }
            if (record.video?.tags) {
                tags.push(...record.video.tags);
            }
        }

        // Find similar videos from active channels
        const recommendations = await Video.aggregate([
            {
                $match: {
                    isPublished: true,
                    privacy: 'public',
                    owner: { $exists: true, $ne: null },
                    $or: [
                        { category: { $in: categories } },
                        { tags: { $in: tags } }
                    ]
                }
            },
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
            { $match: { userWatched: false } },
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

        return recommendations;
    }
}

export default WatchHistoryManagementService;
