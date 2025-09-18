import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Engagement } from '../models/engagement.model.js';
import { WatchHistory } from '../models/watchHistory.model.js';
import { Comment } from '../models/comment.model.js';
import { Tweet } from '../models/tweet.model.js';
import { Playlist } from '../models/playlist.model.js';
import { DeletedChannel } from '../models/deletedChannel.model.js';
import { ApiError } from '../utils/ApiError.js';

class ChannelDeletionService {
    /**
     * Delete a channel and handle all related data
     * @param {string} userId - ID of the user whose channel to delete
     * @param {string} reason - Reason for deletion
     * @param {string} deletedBy - ID of admin processing deletion
     * @param {Object} options - Deletion options
     */
    static async deleteChannel(userId, reason = 'user_request', deletedBy = null, options = {}) {
        const session = await mongoose.startSession();
        
        try {
            await session.withTransaction(async () => {
                // 1. Get user data before deletion
                const user = await User.findById(userId).session(session);
                if (!user) {
                    throw new ApiError(404, 'User not found');
                }

                // 2. Get channel statistics
                const stats = await this.getChannelStats(userId, session);
                
                // 3. Create deleted channel record
                const deletedChannel = await DeletedChannel.create([{
                    originalUserId: userId,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    stats: stats,
                    deletionReason: reason,
                    deletedBy: deletedBy,
                    dataRetention: options.dataRetention || {
                        videos: 'archived',
                        comments: 'anonymized',
                        analytics: 'archived'
                    }
                }], { session });

                // 4. Handle subscriptions (10M subscribers)
                await this.handleSubscriptions(userId, session);

                // 5. Handle videos
                await this.handleVideos(userId, options.dataRetention?.videos || 'archived', session);

                // 6. Handle comments
                await this.handleComments(userId, options.dataRetention?.comments || 'anonymized', session);

                // 7. Handle engagements
                await this.handleEngagements(userId, session);

                // 8. Handle watch history
                await this.handleWatchHistory(userId, options, session);

                // 9. Handle playlists
                await this.handlePlaylists(userId, session);

                // 10. Handle tweets
                await this.handleTweets(userId, session);

                // 11. Finally delete the user
                await User.findByIdAndDelete(userId).session(session);

                console.log(`Channel deleted successfully: ${user.username} (${stats.subscriberCount} subscribers)`);
            });

            return { success: true, message: 'Channel deleted successfully' };
        } catch (error) {
            console.error('Channel deletion failed:', error);
            throw new ApiError(500, 'Channel deletion failed: ' + error.message);
        } finally {
            await session.endSession();
        }
    }

    /**
     * Get channel statistics before deletion
     */
    static async getChannelStats(userId, session) {
        const [subscriberCount, videoCount, totalViews, totalLikes, totalComments] = await Promise.all([
            Subscription.countDocuments({ channel: userId, status: 'active' }).session(session),
            Video.countDocuments({ owner: userId, isPublished: true }).session(session),
            Video.aggregate([
                { $match: { owner: userId } },
                { $group: { _id: null, total: { $sum: '$views' } } }
            ]).session(session),
            Engagement.countDocuments({ 
                content: { $in: await Video.find({ owner: userId }).distinct('_id') },
                contentType: 'video',
                engagementType: 'like'
            }).session(session),
            Comment.countDocuments({ owner: userId }).session(session)
        ]);

        return {
            subscriberCount,
            videoCount,
            totalViews: totalViews[0]?.total || 0,
            totalLikes,
            totalComments
        };
    }

    /**
     * Handle 10M subscriptions efficiently
     */
    static async handleSubscriptions(userId, session) {
        console.log('Processing subscriptions...');
        
        // Batch update subscriptions to cancelled status
        const batchSize = 10000;
        let processed = 0;
        
        while (true) {
            const result = await Subscription.updateMany(
                { channel: userId, status: 'active' },
                { status: 'cancelled' },
                { session, limit: batchSize }
            );
            
            processed += result.modifiedCount;
            console.log(`Processed ${processed} subscriptions...`);
            
            if (result.modifiedCount < batchSize) break;
        }

        // Update subscriber counts for all affected users
        await this.updateAffectedSubscriberCounts(userId, session);
        
        console.log(`Processed ${processed} subscriptions`);
    }

    /**
     * Update subscriber counts for users who were subscribed to deleted channel
     */
    static async updateAffectedSubscriberCounts(deletedUserId, session) {
        // Get all users who were subscribed to the deleted channel
        const subscribers = await Subscription.find({ 
            channel: deletedUserId 
        }).distinct('subscriber').session(session);

        // Update their subscription counts
        for (const subscriberId of subscribers) {
            const activeSubscriptions = await Subscription.countDocuments({
                subscriber: subscriberId,
                status: 'active'
            }).session(session);

            await User.findByIdAndUpdate(
                subscriberId,
                { subscriberCount: activeSubscriptions },
                { session }
            );
        }
    }

    /**
     * Handle videos based on retention policy
     */
    static async handleVideos(userId, retentionPolicy, session) {
        console.log(`Processing videos with policy: ${retentionPolicy}`);
        
        switch (retentionPolicy) {
            case 'deleted':
                // Delete all videos
                await Video.deleteMany({ owner: userId }).session(session);
                break;
                
            case 'archived':
                // Mark as unpublished and update owner reference
                await Video.updateMany(
                    { owner: userId },
                    { 
                        isPublished: false,
                        owner: null, // Remove owner reference
                        title: '[Deleted Channel] ' + mongoose.Types.ObjectId().toString()
                    },
                    { session }
                );
                break;
                
            case 'anonymized':
                // Keep videos but anonymize owner
                await Video.updateMany(
                    { owner: userId },
                    { 
                        owner: null,
                        title: '[Anonymous] ' + mongoose.Types.ObjectId().toString()
                    },
                    { session }
                );
                break;
        }
    }

    /**
     * Handle comments based on retention policy
     */
    static async handleComments(userId, retentionPolicy, session) {
        console.log(`Processing comments with policy: ${retentionPolicy}`);
        
        switch (retentionPolicy) {
            case 'deleted':
                await Comment.deleteMany({ owner: userId }).session(session);
                break;
                
            case 'anonymized':
                await Comment.updateMany(
                    { owner: userId },
                    { 
                        owner: null,
                        content: '[Comment deleted]'
                    },
                    { session }
                );
                break;
                
            case 'archived':
                // Keep comments but remove owner reference
                await Comment.updateMany(
                    { owner: userId },
                    { owner: null },
                    { session }
                );
                break;
        }
    }

    /**
     * Handle engagements
     */
    static async handleEngagements(userId, session) {
        console.log('Processing engagements...');
        
        // Get all content owned by the user
        const userContent = await Video.find({ owner: userId }).distinct('_id').session(session);
        
        if (userContent.length > 0) {
            // Delete engagements on user's content
            await Engagement.deleteMany({
                content: { $in: userContent },
                contentType: 'video'
            }).session(session);
        }
        
        // Delete user's own engagements
        await Engagement.deleteMany({ user: userId }).session(session);
    }

    /**
     * Handle watch history with retention policies
     */
    static async handleWatchHistory(userId, options = {}, session) {
        console.log('Processing watch history...');
        
        const watchHistoryRetention = options.watchHistoryRetention || 'anonymized';
        const userVideos = await Video.find({ owner: userId }).distinct('_id').session(session);
        
        switch (watchHistoryRetention) {
            case 'deleted':
                // Delete user's watch history completely
                await WatchHistory.deleteMany({ user: userId }).session(session);
                
                // Delete watch history for user's videos from all users
                if (userVideos.length > 0) {
                    await WatchHistory.deleteMany({
                        video: { $in: userVideos }
                    }).session(session);
                }
                break;
                
            case 'anonymized':
                // Keep watch history but anonymize the user
                await WatchHistory.updateMany(
                    { user: userId },
                    { 
                        user: null,
                        // Keep analytics data but remove personal identifiers
                        sessionId: null,
                        device: 'unknown'
                    },
                    { session }
                );
                
                // For videos from deleted channel, anonymize the video reference
                if (userVideos.length > 0) {
                    await WatchHistory.updateMany(
                        { video: { $in: userVideos } },
                        { 
                            video: null,
                            // Mark as from deleted channel for analytics
                            metadata: {
                                deletedChannel: true,
                                originalVideoId: '$video'
                            }
                        },
                        { session }
                    );
                }
                break;
                
            case 'archived':
                // Archive watch history with metadata
                await WatchHistory.updateMany(
                    { user: userId },
                    { 
                        archived: true,
                        archivedAt: new Date(),
                        archivedReason: 'channel_deleted'
                    },
                    { session }
                );
                
                // Archive watch history for user's videos
                if (userVideos.length > 0) {
                    await WatchHistory.updateMany(
                        { video: { $in: userVideos } },
                        { 
                            archived: true,
                            archivedAt: new Date(),
                            archivedReason: 'channel_deleted',
                            originalVideoId: '$video'
                        },
                        { session }
                    );
                }
                break;
        }
        
        console.log(`Watch history processed with policy: ${watchHistoryRetention}`);
    }

    /**
     * Handle playlists
     */
    static async handlePlaylists(userId, session) {
        console.log('Processing playlists...');
        
        // Delete user's playlists
        await Playlist.deleteMany({ owner: userId }).session(session);
    }

    /**
     * Handle tweets
     */
    static async handleTweets(userId, session) {
        console.log('Processing tweets...');
        
        // Delete user's tweets
        await Tweet.deleteMany({ owner: userId }).session(session);
    }

    /**
     * Recover a deleted channel (within recovery period)
     */
    static async recoverChannel(deletedChannelId, newUserId) {
        const session = await mongoose.startSession();
        
        try {
            await session.withTransaction(async () => {
                const deletedChannel = await DeletedChannel.findById(deletedChannelId).session(session);
                
                if (!deletedChannel) {
                    throw new ApiError(404, 'Deleted channel not found');
                }
                
                if (!deletedChannel.isRecoverable) {
                    throw new ApiError(400, 'Channel recovery period has expired');
                }
                
                if (new Date() > deletedChannel.recoveryDeadline) {
                    throw new ApiError(400, 'Channel recovery deadline has passed');
                }
                
                
                const recoveredUser = await User.create([{
                    _id: newUserId,
                    username: deletedChannel.username,
                    fullName: deletedChannel.fullName,
                    email: deletedChannel.email,
                    avatar: 'https://via.placeholder.com/150', 
                    coverImage: '',
                    subscriberCount: 0, 
                    videoCount: 0,
                    totalViews: 0
                }], { session });
               
                deletedChannel.isRecoverable = false;
                await deletedChannel.save({ session });
                
                console.log(`Channel recovered: ${deletedChannel.username}`);
            });
            
            return { success: true, message: 'Channel recovered successfully' };
        } catch (error) {
            console.error('Channel recovery failed:', error);
            throw new ApiError(500, 'Channel recovery failed: ' + error.message);
        } finally {
            await session.endSession();
        }
    }

    /**
     * Get deletion statistics
     */
    static async getDeletionStats() {
        const stats = await DeletedChannel.aggregate([
            {
                $group: {
                    _id: null,
                    totalDeletedChannels: { $sum: 1 },
                    totalSubscribersAffected: { $sum: '$stats.subscriberCount' },
                    totalVideosAffected: { $sum: '$stats.videoCount' },
                    totalViewsAffected: { $sum: '$stats.totalViews' }
                }
            }
        ]);
        
        return stats[0] || {
            totalDeletedChannels: 0,
            totalSubscribersAffected: 0,
            totalVideosAffected: 0,
            totalViewsAffected: 0
        };
    }
}

export default ChannelDeletionService;
