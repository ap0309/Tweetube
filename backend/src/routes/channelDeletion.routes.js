import { Router } from 'express';
import { verifyJwt } from '../middlewares/auth.middleware.js';
import {
    deleteMyChannel,
    adminDeleteChannel,
    recoverChannel,
    getDeletionStats,
    getDeletedChannels
} from '../controllers/channelDeletion.controller.js';

const router = Router();

// User routes (require authentication)
router.route('/my-channel').delete(verifyJwt, deleteMyChannel);

// Admin routes (require admin authentication)
router.route('/admin/:userId').delete(verifyJwt, adminDeleteChannel);
router.route('/recover/:deletedChannelId').post(verifyJwt, recoverChannel);
router.route('/stats').get(verifyJwt, getDeletionStats);
router.route('/deleted-channels').get(verifyJwt, getDeletedChannels);

export default router;
