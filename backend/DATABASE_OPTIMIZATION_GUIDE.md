# Database Optimization Guide for YouTube-like Platform

## 🚀 Scalability Enhancements Implemented

### 1. **Enhanced User Model**
- **Denormalized Counters**: `subscriberCount`, `videoCount`, `totalViews` for fast queries
- **User Preferences**: Comprehensive settings for notifications, privacy, and channel customization
- **Account Status**: `isVerified`, `isActive`, `lastActiveAt` for better user management
- **Compound Indexes**: Optimized for common queries like trending creators, new users

### 2. **Separate WatchHistory Model**
- **Time-based Partitioning**: TTL indexes for automatic cleanup
- **Watch Progress Tracking**: Resume functionality and analytics
- **Device Analytics**: Track user behavior across devices
- **Session Management**: Group related watch activities
- **Efficient Queries**: Optimized aggregation pipelines for user history

### 3. **Advanced Video Model**
- **Rich Metadata**: Categories, tags, quality, file size, language, region
- **Engagement Metrics**: Denormalized like/dislike/comment counts
- **Analytics Integration**: Watch time, retention rate, CTR tracking
- **Monetization Support**: Ad breaks, revenue tracking
- **Content Management**: Processing status, privacy settings, age restrictions

### 4. **Optimized Subscription System**
- **Status Management**: Active, paused, cancelled subscriptions
- **Notification Preferences**: Granular control over subscription notifications
- **Analytics Integration**: Track subscription engagement and retention
- **Performance Counters**: Real-time subscriber count updates
- **Trending Channels**: Algorithm for discovering popular creators

### 5. **Unified Engagement System**
- **Polymorphic Design**: Single model for likes on videos, comments, tweets, playlists
- **Multiple Engagement Types**: Like, dislike, love, laugh, angry, sad, wow
- **Rich Metadata**: Device, platform, session tracking
- **Analytics Integration**: Engagement patterns and trending content
- **Performance Optimization**: Efficient toggling and counting

### 6. **Comprehensive Analytics**
- **Daily Analytics**: Aggregated metrics for content performance
- **Real-time Analytics**: Live tracking for current viewers and engagement
- **User Behavior**: Detailed user activity and preference tracking
- **Geographic Data**: Country and region-based analytics
- **Device Analytics**: Cross-platform usage patterns

## 📊 Database Indexes for Performance

### Critical Indexes Added:
```javascript
// User Model
{ username: 1, isActive: 1 }
{ email: 1, isActive: 1 }
{ subscriberCount: -1, isActive: 1 }
{ totalViews: -1, isActive: 1 }

// Video Model
{ owner: 1, isPublished: 1, createdAt: -1 }
{ category: 1, isPublished: 1, views: -1 }
{ isPublished: 1, publishedAt: -1 }
{ title: 'text', description: 'text', tags: 'text' }

// WatchHistory Model
{ user: 1, createdAt: -1 }
{ user: 1, video: 1 } // Unique
{ video: 1, createdAt: -1 }

// Subscription Model
{ subscriber: 1, status: 1, createdAt: -1 }
{ channel: 1, status: 1, createdAt: -1 }
{ subscriber: 1, channel: 1 } // Unique

// Engagement Model
{ user: 1, contentType: 1, createdAt: -1 }
{ content: 1, contentType: 1, engagementType: 1 }
{ user: 1, content: 1, contentType: 1 } // Unique
```

## 🔄 Migration Strategy

### Phase 1: Data Migration
```javascript
// 1. Create new models alongside existing ones
// 2. Migrate user data with new fields
// 3. Create watch history records from existing data
// 4. Migrate subscription data with new structure
// 5. Convert like data to engagement model

// Example migration script:
const migrateUserData = async () => {
    const users = await User.find({});
    for (const user of users) {
        // Update subscriber count
        const subscriberCount = await Subscription.countDocuments({ 
            channel: user._id, 
            status: 'active' 
        });
        
        // Update video count
        const videoCount = await Video.countDocuments({ 
            owner: user._id, 
            isPublished: true 
        });
        
        // Update total views
        const totalViews = await Video.aggregate([
            { $match: { owner: user._id } },
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        
        await User.findByIdAndUpdate(user._id, {
            subscriberCount,
            videoCount,
            totalViews: totalViews[0]?.total || 0
        });
    }
};
```

### Phase 2: Performance Optimization
```javascript
// 1. Create all indexes
// 2. Set up TTL indexes for data cleanup
// 3. Configure connection pooling
// 4. Set up read replicas for analytics queries

// Database connection optimization
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false, // Disable mongoose buffering
});
```

### Phase 3: Monitoring and Maintenance
```javascript
// 1. Set up database monitoring
// 2. Create automated cleanup jobs
// 3. Implement query performance monitoring
// 4. Set up alerts for slow queries

// Example cleanup job
const cleanupOldData = async () => {
    // Clean up old watch history (older than 1 year)
    await WatchHistory.deleteMany({
        createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    });
    
    // Clean up old analytics data (older than 2 years)
    await DailyAnalytics.deleteMany({
        date: { $lt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) }
    });
};
```

## 🎯 Performance Best Practices

### 1. **Query Optimization**
- Use aggregation pipelines for complex queries
- Implement pagination for large datasets
- Use projection to limit returned fields
- Leverage compound indexes for multi-field queries

### 2. **Caching Strategy**
```javascript
// Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient();

// Cache user data
const getUserWithCache = async (userId) => {
    const cached = await client.get(`user:${userId}`);
    if (cached) return JSON.parse(cached);
    
    const user = await User.findById(userId);
    await client.setex(`user:${userId}`, 3600, JSON.stringify(user));
    return user;
};

// Cache trending videos
const getTrendingVideosWithCache = async () => {
    const cached = await client.get('trending:videos');
    if (cached) return JSON.parse(cached);
    
    const videos = await Video.getTrendingVideos();
    await client.setex('trending:videos', 1800, JSON.stringify(videos)); // 30 min cache
    return videos;
};
```

### 3. **Background Jobs**
```javascript
// Update counters asynchronously
const updateCounters = async (contentId, contentType) => {
    // Queue job for background processing
    await queue.add('updateCounters', { contentId, contentType });
};

// Process counter updates
queue.process('updateCounters', async (job) => {
    const { contentId, contentType } = job.data;
    await Engagement.updateContentEngagementCounts(contentId, contentType);
});
```

### 4. **Database Sharding Strategy**
```javascript
// Shard by user ID for horizontal scaling
const getShardForUser = (userId) => {
    const shardNumber = userId.toString().charCodeAt(0) % 4; // 4 shards
    return `shard_${shardNumber}`;
};

// Route queries to appropriate shard
const getUserFromShard = async (userId) => {
    const shard = getShardForUser(userId);
    const connection = await mongoose.createConnection(`${process.env.MONGODB_URI}/${shard}`);
    return connection.model('User').findById(userId);
};
```

## 📈 Monitoring and Analytics

### 1. **Query Performance Monitoring**
```javascript
// Monitor slow queries
mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`${collectionName}.${method}`, JSON.stringify(query));
});

// Custom query timing
const timeQuery = async (queryName, queryFn) => {
    const start = Date.now();
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Log slow queries
        console.warn(`Slow query: ${queryName} took ${duration}ms`);
    }
    
    return result;
};
```

### 2. **Database Health Checks**
```javascript
// Health check endpoint
app.get('/health/database', async (req, res) => {
    try {
        const stats = await mongoose.connection.db.stats();
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        res.json({
            status: 'healthy',
            collections: collections.length,
            dataSize: stats.dataSize,
            indexSize: stats.indexSize,
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});
```

## 🚀 Next Steps for Production

1. **Set up MongoDB Atlas** for managed database service
2. **Implement Redis caching** for frequently accessed data
3. **Set up database monitoring** with tools like MongoDB Compass or DataDog
4. **Create automated backup** and disaster recovery procedures
5. **Implement database sharding** when you reach scale limits
6. **Set up read replicas** for analytics and reporting queries
7. **Create data archival** strategy for old analytics data

This enhanced data model will scale to millions of users and videos, similar to YouTube's architecture! 🎉
