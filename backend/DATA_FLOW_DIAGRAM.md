# Data Flow Architecture Diagram

## 🏗️ **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YOUTUBE-LIKE PLATFORM                                │
│                              Data Architecture                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │    DATABASE     │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 **Core Data Models & Relationships**

```
                    ┌─────────────────────────────────┐
                    │            USER MODEL           │
                    │  ┌─────────────────────────────┐│
                    │  │ • username (unique)         ││
                    │  │ • email (unique)            ││
                    │  │ • fullName                  ││
                    │  │ • avatar, coverImage        ││
                    │  │ • subscriberCount (denorm)  ││
                    │  │ • videoCount (denorm)       ││
                    │  │ • totalViews (denorm)       ││
                    │  │ • preferences               ││
                    │  │ • isVerified, isActive      ││
                    │  └─────────────────────────────┘│
                    └─────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼───────┐   │   ┌───────▼───────┐
            │ VIDEO MODEL   │   │   │ SUBSCRIPTION  │
            │ ┌───────────┐ │   │   │ MODEL         │
            │ │ • title   │ │   │   │ ┌───────────┐ │
            │ │ • desc    │ │   │   │ │ subscriber │ │
            │ │ • duration│ │   │   │ │ channel    │ │
            │ │ • views   │ │   │   │ │ status     │ │
            │ │ • likes   │ │   │   │ │ notifications││
            │ │ • category│ │   │   │ └───────────┘ │
            │ │ • tags    │ │   │   └───────────────┘
            │ │ • owner   │ │   │
            │ │ • privacy │ │   │
            │ └───────────┘ │   │
            └───────────────┘   │
                    │           │
            ┌───────▼───────┐   │
            │ WATCH HISTORY │   │
            │ ┌───────────┐ │   │
            │ │ user      │ │   │
            │ │ video     │ │   │
            │ │ progress  │ │   │
            │ │ duration  │ │   │
            │ │ device    │ │   │
            │ │ archived  │ │   │
            │ └───────────┘ │   │
            └───────────────┘   │
                    │           │
            ┌───────▼───────┐   │
            │  ENGAGEMENT   │   │
            │ ┌───────────┐ │   │
            │ │ user      │ │   │
            │ │ content   │ │   │
            │ │ type      │ │   │
            │ │ reaction  │ │   │
            │ │ metadata  │ │   │
            │ └───────────┘ │   │
            └───────────────┘   │
                                │
                    ┌───────────▼───────────┐
                    │    ANALYTICS MODELS   │
                    │ ┌─────────────────────┐│
                    │ │ Daily Analytics     ││
                    │ │ Real-time Analytics ││
                    │ │ User Behavior       ││
                    │ └─────────────────────┘│
                    └─────────────────────────┘
```

## 🔄 **Data Flow Patterns**

### **1. User Registration Flow**
```
Frontend → Backend → User Model
    ↓
Cloudinary (Avatar Upload)
    ↓
User Created with Denormalized Counters
    ↓
JWT Tokens Generated
    ↓
Response to Frontend
```

### **2. Video Upload Flow**
```
Frontend → Multer → Cloudinary
    ↓
Video Model Created
    ↓
Owner's videoCount Updated (Denormalized)
    ↓
Analytics Tracking Started
    ↓
Response to Frontend
```

### **3. Watch History Flow**
```
User Watches Video → WatchHistory Created
    ↓
Video's views Counter Updated
    ↓
User's totalViews Updated
    ↓
Analytics Aggregated
    ↓
Recommendations Updated
```

### **4. Engagement Flow**
```
User Likes Video → Engagement Created
    ↓
Video's likeCount Updated (Denormalized)
    ↓
User's Engagement Analytics Updated
    ↓
Real-time Analytics Updated
    ↓
Trending Algorithm Updated
```

### **5. Subscription Flow**
```
User Subscribes → Subscription Created
    ↓
Channel's subscriberCount Updated
    ↓
Subscriber's Subscription List Updated
    ↓
Notification Preferences Set
    ↓
Analytics Tracking Started
```

## 🚀 **Performance Optimization Layers**

```
┌─────────────────────────────────────────────────────────────┐
│                    PERFORMANCE LAYERS                      │
├─────────────────────────────────────────────────────────────┤
│ 1. CACHING LAYER (Redis)                                   │
│    • User sessions                                         │
│    • Trending videos                                       │
│    • Popular creators                                      │
│    • Search results                                        │
├─────────────────────────────────────────────────────────────┤
│ 2. DATABASE INDEXES                                        │
│    • Compound indexes for complex queries                  │
│    • Text indexes for search                               │
│    • TTL indexes for cleanup                               │
│    • Unique indexes for constraints                        │
├─────────────────────────────────────────────────────────────┤
│ 3. DENORMALIZATION                                         │
│    • Counter fields (subscriberCount, likeCount)          │
│    • Pre-aggregated analytics                              │
│    • Cached relationship data                              │
├─────────────────────────────────────────────────────────────┤
│ 4. BACKGROUND PROCESSING                                   │
│    • Counter updates                                       │
│    • Analytics aggregation                                 │
│    • Data cleanup jobs                                     │
│    • Recommendation updates                                │
├─────────────────────────────────────────────────────────────┤
│ 5. DATABASE OPTIMIZATION                                   │
│    • Connection pooling                                    │
│    • Read replicas for analytics                           │
│    • Sharding for horizontal scaling                       │
│    • Query optimization                                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 **Channel Deletion Flow**

```
Channel Deletion Request
    ↓
┌─────────────────────────────────────────────────────────────┐
│                TRANSACTION BEGINS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Capture Channel Statistics                              │
│    • subscriberCount, videoCount, totalViews               │
│    • Store in DeletedChannel model                         │
├─────────────────────────────────────────────────────────────┤
│ 2. Handle Subscriptions (10M+ records)                    │
│    • Batch update to 'cancelled' status                   │
│    • Update subscriber counts for all affected users      │
├─────────────────────────────────────────────────────────────┤
│ 3. Handle Videos (Based on Retention Policy)              │
│    • Deleted: Remove completely                           │
│    • Archived: Mark as unpublished, remove owner ref      │
│    • Anonymized: Keep but remove owner, update title      │
├─────────────────────────────────────────────────────────────┤
│ 4. Handle Watch History (Based on Policy)                 │
│    • Deleted: Remove all watch history                    │
│    • Anonymized: Remove user ref, keep analytics          │
│    • Archived: Mark as archived, preserve for recovery    │
├─────────────────────────────────────────────────────────────┤
│ 5. Handle Engagements                                      │
│    • Remove user's engagements                            │
│    • Remove engagements on user's content                 │
├─────────────────────────────────────────────────────────────┤
│ 6. Handle Comments/Tweets/Playlists                       │
│    • Apply retention policy to each type                  │
├─────────────────────────────────────────────────────────────┤
│ 7. Delete User Account                                     │
│    • Final cleanup of user record                         │
├─────────────────────────────────────────────────────────────┤
│                TRANSACTION COMMITS                         │
└─────────────────────────────────────────────────────────────┘
    ↓
Recovery System Available (30 days)
    ↓
Data Analytics Preserved
    ↓
User Experience Maintained
```

## 📊 **Analytics Data Flow**

```
User Action → Real-time Analytics → Daily Aggregation → Business Intelligence
     ↓              ↓                      ↓                    ↓
┌─────────┐  ┌──────────────┐    ┌─────────────────┐  ┌─────────────────┐
│ Watch   │  │ Live Viewers │    │ Daily Metrics   │  │ Creator Reports │
│ Like    │  │ Engagement   │    │ User Behavior   │  │ Platform Stats  │
│ Comment │  │ Session Data │    │ Content Perf    │  │ Revenue Data    │
│ Share   │  │ Device Info  │    │ Geographic Data │  │ Trend Analysis  │
└─────────┘  └──────────────┘    └─────────────────┘  └─────────────────┘
```

## 🛡️ **Data Integrity & Recovery**

```
┌─────────────────────────────────────────────────────────────┐
│                DATA INTEGRITY LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│ 1. SCHEMA VALIDATION                                       │
│    • MongoDB schema-level validation                       │
│    • Required fields and data types                        │
│    • Enum constraints and custom validators                │
├─────────────────────────────────────────────────────────────┤
│ 2. BUSINESS LOGIC VALIDATION                               │
│    • Service-level validation                              │
│    • Complex business rules                                │
│    • Cross-model consistency checks                        │
├─────────────────────────────────────────────────────────────┤
│ 3. TRANSACTION MANAGEMENT                                  │
│    • ACID transactions for critical operations             │
│    • Rollback on failures                                  │
│    • Data consistency guarantees                           │
├─────────────────────────────────────────────────────────────┤
│ 4. RECOVERY SYSTEMS                                        │
│    • Soft deletes with recovery periods                    │
│    • Data archival for compliance                          │
│    • Graceful degradation on failures                      │
├─────────────────────────────────────────────────────────────┤
│ 5. MONITORING & ALERTING                                   │
│    • Data consistency monitoring                           │
│    • Performance tracking                                  │
│    • Error detection and alerting                          │
└─────────────────────────────────────────────────────────────┘
```

This architecture is designed to handle YouTube-scale data while maintaining excellent performance, data integrity, and user experience! 🚀
