# YouTube-like Platform: Data Modeling Architecture

## 🏗️ **Overall Architecture Philosophy**

This platform is designed to handle **YouTube-scale data** with millions of users, videos, and interactions. The architecture follows these core principles:

1. **Scalability First** - Handle millions of records efficiently
2. **Performance Optimization** - Fast queries with proper indexing
3. **Data Integrity** - Consistent relationships and constraints
4. **User Experience** - Seamless interactions and data recovery
5. **Analytics Ready** - Rich data for business intelligence

---

## 📊 **Core Data Models**

### 1. **User Model** - The Foundation

```javascript
const userSchema = new Schema({
    // Identity & Authentication
    username: { type: String, unique: true, index: true },
    email: { type: String, unique: true, index: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true, index: true },
    
    // Profile & Media
    avatar: { type: String, required: true },
    coverImage: { type: String },
    
    // Denormalized Counters (Performance Optimization)
    subscriberCount: { type: Number, default: 0, index: true },
    videoCount: { type: Number, default: 0, index: true },
    totalViews: { type: Number, default: 0, index: true },
    
    // User Preferences & Settings
    preferences: {
        notifications: { email: Boolean, push: Boolean },
        privacy: { showSubscriberCount: Boolean },
        channel: { description: String, country: String }
    },
    
    // Account Status
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now }
});
```

**Why This Design:**
- **Denormalized Counters**: Avoid expensive aggregation queries for subscriber/video counts
- **Compound Indexes**: Optimize common queries like trending creators
- **Preferences Object**: Flexible user settings without separate collections
- **Status Fields**: Enable soft deletion and account management

---

### 2. **Video Model** - Content Management

```javascript
const videoSchema = new Schema({
    // Core Content
    videoFile: { type: String, required: true },
    thumbnail: { type: String, required: true },
    title: { type: String, required: true, index: 'text' },
    description: { type: String, required: true, index: 'text' },
    duration: { type: Number, required: true, index: true },
    
    // Denormalized Engagement Counters
    views: { type: Number, default: 0, index: true },
    likeCount: { type: Number, default: 0, index: true },
    dislikeCount: { type: Number, default: 0, index: true },
    commentCount: { type: Number, default: 0, index: true },
    
    // Content Classification
    category: { type: String, enum: [...], default: 'Other', index: true },
    tags: [{ type: String, lowercase: true }],
    language: { type: String, default: 'en', index: true },
    region: { type: String, default: 'US', index: true },
    
    // Content Management
    isPublished: { type: Boolean, default: true, index: true },
    privacy: { type: String, enum: ['public', 'unlisted', 'private'], index: true },
    ageRestricted: { type: Boolean, default: false },
    
    // Analytics & Performance
    analytics: {
        watchTime: { type: Number, default: 0 },
        retentionRate: { type: Number, default: 0 },
        clickThroughRate: { type: Number, default: 0 }
    },
    
    // Monetization
    monetization: {
        isMonetized: { type: Boolean, default: false },
        adBreaks: [{ time: Number, duration: Number }]
    },
    
    // Relationships
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
});
```

**Why This Design:**
- **Text Indexes**: Enable full-text search on title/description
- **Denormalized Counters**: Fast access to engagement metrics
- **Rich Metadata**: Support for content classification and discovery
- **Analytics Integration**: Built-in performance tracking
- **Monetization Ready**: Support for ad revenue and sponsorships

---

### 3. **WatchHistory Model** - User Behavior Tracking

```javascript
const watchHistorySchema = new Schema({
    // Core Relationships
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    video: { type: Schema.Types.ObjectId, ref: "Video", required: true, index: true },
    
    // Watch Progress Tracking
    watchProgress: { type: Number, default: 0, min: 0, max: 100 },
    watchDuration: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false, index: true },
    liked: { type: Boolean, default: false },
    
    // Analytics & Context
    device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'tv'] },
    sessionId: { type: String, index: true },
    referrer: { type: String, enum: ['home', 'search', 'subscriptions'] },
    
    // Archive & Recovery System
    archived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, index: true },
    archivedReason: { type: String, enum: ['channel_deleted', 'user_request'] },
    
    // Deleted Content Handling
    metadata: {
        deletedChannel: { type: Boolean, default: false },
        originalVideoId: { type: Schema.Types.ObjectId }
    }
});
```

**Why This Design:**
- **Separate Collection**: Avoid bloating user documents with large arrays
- **Progress Tracking**: Enable resume functionality like YouTube
- **Analytics Rich**: Track user behavior patterns
- **Recovery System**: Handle channel deletions gracefully
- **TTL Indexes**: Automatic cleanup of old data

---

### 4. **Subscription Model** - Creator-Fan Relationships

```javascript
const subscriptionSchema = new Schema({
    // Core Relationships
    subscriber: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    
    // Subscription Management
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active', index: true },
    subscriptionType: { type: String, enum: ['free', 'premium', 'sponsor'], default: 'free' },
    
    // Notification Preferences
    notifications: {
        newVideos: { type: Boolean, default: true },
        liveStreams: { type: Boolean, default: true },
        communityPosts: { type: Boolean, default: true }
    },
    
    // Analytics & Engagement
    analytics: {
        lastVideoWatched: { type: Date },
        videosWatched: { type: Number, default: 0 },
        totalWatchTime: { type: Number, default: 0 }
    }
});
```

**Why This Design:**
- **Status Management**: Handle subscription lifecycle (pause, cancel, reactivate)
- **Notification Control**: Granular preferences for each subscription
- **Engagement Tracking**: Monitor subscriber behavior
- **Compound Indexes**: Efficient queries for user subscriptions and channel subscribers

---

### 5. **Engagement Model** - Unified Interaction System

```javascript
const engagementSchema = new Schema({
    // Polymorphic Content Reference
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: Schema.Types.ObjectId, required: true, index: true },
    contentType: { type: String, enum: ['video', 'comment', 'tweet', 'playlist'], required: true },
    
    // Engagement Types
    engagementType: { 
        type: String, 
        enum: ['like', 'dislike', 'love', 'laugh', 'angry', 'sad', 'wow'], 
        required: true 
    },
    
    // Rich Metadata
    metadata: {
        watchTime: Number,
        watchProgress: Number,
        device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'tv'] },
        platform: { type: String, enum: ['web', 'android', 'ios', 'tv'] }
    },
    
    // Analytics
    analytics: {
        sessionId: String,
        referrer: String,
        timestamp: { type: Date, default: Date.now }
    }
});
```

**Why This Design:**
- **Polymorphic Design**: Single model for all content types (videos, comments, tweets)
- **Rich Engagement**: Support multiple reaction types like social media
- **Analytics Integration**: Track engagement patterns and user behavior
- **Performance Optimized**: Efficient toggling and counting operations

---

### 6. **Analytics Models** - Business Intelligence

#### **Daily Analytics** - Aggregated Metrics
```javascript
const dailyAnalyticsSchema = new Schema({
    date: { type: Date, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    content: { type: Schema.Types.ObjectId, required: true, index: true },
    contentType: { type: String, enum: ['video', 'comment', 'tweet'], required: true },
    
    // Aggregated Metrics
    metrics: {
        views: { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
        watchTime: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },
    
    // Geographic Data
    geography: {
        countries: [{ country: String, views: Number, watchTime: Number }],
        regions: [{ region: String, views: Number, watchTime: Number }]
    },
    
    // Device Analytics
    devices: {
        mobile: { views: Number, watchTime: Number },
        desktop: { views: Number, watchTime: Number },
        tablet: { views: Number, watchTime: Number },
        tv: { views: Number, watchTime: Number }
    }
});
```

#### **Real-time Analytics** - Live Tracking
```javascript
const realtimeAnalyticsSchema = new Schema({
    content: { type: Schema.Types.ObjectId, required: true, index: true },
    contentType: { type: String, enum: ['video', 'comment', 'tweet'], required: true },
    
    // Live Metrics
    currentViewers: { type: Number, default: 0 },
    sessions: [{
        sessionId: String,
        userId: Schema.Types.ObjectId,
        startTime: Date,
        lastActivity: Date,
        watchTime: Number,
        device: String,
        location: { country: String, region: String }
    }],
    
    // Real-time Engagement
    recentEngagements: [{
        type: String,
        userId: Schema.Types.ObjectId,
        timestamp: Date
    }]
});
```

**Why This Design:**
- **Pre-aggregated Data**: Fast analytics queries without real-time aggregation
- **Geographic Insights**: Track content performance by location
- **Device Analytics**: Understand user behavior across platforms
- **Real-time Tracking**: Live viewer counts and engagement
- **TTL Indexes**: Automatic cleanup of old analytics data

---

## 🔗 **Model Relationships & Data Flow**

### **1. User-Centric Relationships**
```
User (1) ←→ (Many) Videos
User (1) ←→ (Many) Subscriptions (as subscriber)
User (1) ←→ (Many) Subscriptions (as channel)
User (1) ←→ (Many) WatchHistory
User (1) ←→ (Many) Engagements
```

### **2. Content-Centric Relationships**
```
Video (1) ←→ (Many) WatchHistory
Video (1) ←→ (Many) Engagements
Video (1) ←→ (Many) Comments
Video (1) ←→ (Many) DailyAnalytics
```

### **3. Cross-Platform Engagement**
```
Engagement (Many) ←→ (1) User
Engagement (Many) ←→ (1) Content (Video/Comment/Tweet/Playlist)
```

---

## 🚀 **Performance Optimizations**

### **1. Strategic Indexing**
```javascript
// Compound indexes for common queries
userSchema.index({ username: 1, isActive: 1 });
videoSchema.index({ owner: 1, isPublished: 1, createdAt: -1 });
watchHistorySchema.index({ user: 1, createdAt: -1 });
subscriptionSchema.index({ subscriber: 1, status: 1, createdAt: -1 });

// Text search indexes
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

// TTL indexes for data cleanup
watchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
```

### **2. Denormalization Strategy**
- **User Counters**: subscriberCount, videoCount, totalViews
- **Video Counters**: likeCount, dislikeCount, commentCount
- **Prevents**: Expensive aggregation queries on every request

### **3. Data Partitioning**
- **WatchHistory**: TTL-based partitioning (1 year retention)
- **Analytics**: Time-based partitioning (2 year retention)
- **Engagements**: TTL-based cleanup (2 year retention)

---

## 🛡️ **Data Integrity & Consistency**

### **1. Transaction Management**
```javascript
// Channel deletion with transaction
const session = await mongoose.startSession();
await session.withTransaction(async () => {
    // All operations are atomic
    await this.handleSubscriptions(userId, session);
    await this.handleVideos(userId, options, session);
    await this.handleWatchHistory(userId, options, session);
    await User.findByIdAndDelete(userId).session(session);
});
```

### **2. Referential Integrity**
- **Soft Deletes**: Mark as archived instead of hard delete
- **Cascade Updates**: Update counters when related data changes
- **Recovery System**: Restore deleted data within grace period

### **3. Data Validation**
- **Schema Validation**: MongoDB schema-level validation
- **Business Logic**: Custom validation in services
- **API Validation**: Request validation in controllers

---

## 📈 **Scalability Features**

### **1. Horizontal Scaling**
- **Sharding Strategy**: Partition by user ID
- **Read Replicas**: Separate analytics queries
- **Caching Layer**: Redis for frequently accessed data

### **2. Background Processing**
- **Counter Updates**: Async updates for engagement counts
- **Analytics Aggregation**: Scheduled jobs for daily metrics
- **Data Cleanup**: Automated TTL-based cleanup

### **3. Monitoring & Alerting**
- **Query Performance**: Monitor slow queries
- **Data Growth**: Track collection sizes
- **Error Tracking**: Monitor data consistency issues

---

## 🎯 **Why This Architecture?**

### **1. YouTube-Scale Requirements**
- **Millions of Users**: Efficient user management and queries
- **Billions of Videos**: Optimized content storage and retrieval
- **Real-time Engagement**: Fast like/dislike/subscribe operations
- **Analytics Heavy**: Rich data for business intelligence

### **2. User Experience Focus**
- **Resume Functionality**: Track watch progress like YouTube
- **Personalized Recommendations**: Rich user behavior data
- **Seamless Deletions**: Graceful handling of channel deletions
- **Data Portability**: Export user data for compliance

### **3. Business Intelligence**
- **Creator Analytics**: Detailed performance metrics
- **Platform Analytics**: User engagement patterns
- **Monetization Ready**: Ad revenue and sponsorship support
- **Content Moderation**: Age restrictions and privacy controls

### **4. Technical Excellence**
- **Performance First**: Sub-second query responses
- **Data Consistency**: ACID transactions where needed
- **Scalability**: Handle 10x growth without architecture changes
- **Maintainability**: Clean separation of concerns

This architecture is designed to handle the complexity and scale of a modern video platform while maintaining excellent performance and user experience! 🚀
