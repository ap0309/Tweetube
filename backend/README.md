
# Tweetube

**Tweetube** is a hybrid backend service combining the core features of a video-sharing platform with social elements inspired by Twitter — enabling users to share videos, follow channels, and interact through a dynamic, media-first experience. From user authentication to channel subscriptions and watch history tracking, this project showcases how to design a scalable, RESTful API with secure and efficient backend logic.

---

## Key Highlights

- 🔐 **User Auth & Session**
  - Register and log in with username or email
  - Secure password storage with hashing
  - JWT-based authentication (access & refresh tokens)
  - Token handling via secure HTTP-only cookies

- 👤 **User Profile & Channel System**
  - Upload profile avatars and channel cover images
  - Update profile information (email, name, images)
  - Each user has a dedicated channel with public stats

- 🔔 **Subscriptions**
  - Follow or unfollow any user channel
  - Track subscribers and who you're subscribed to
  - Aggregated channel overview showing stats and relationship

- 📺 **Watch History**
  - Automatically logs videos a user watches
  - Retrieve watch history enriched with video and uploader info

- ⚙️ **REST API Design**
  - Clean and modular route definitions
  - Reusable middleware for authentication, uploads, and errors
  - Unified API response structure for consistency

- 🔒 **Security First**
  - Bcrypt for password hashing
  - JWT verification middleware
  - Sanitized inputs and secure file handling

- ☁️ **Cloud Storage**
  - Integration with **Cloudinary** for managing user-uploaded images

---

## 🧩Project Blueprint

- [Tweetube Entity Diagram](https://app.eraser.io/workspace/vOAgQXIkBLo7sEkqI8EK?origin=share)

---

## 📂 Folder Breakdown

```
tweetube-backend/
├── src/
│   ├── app.js              # Core server configuration
│   ├── controllers/        # Route handler logic
│   ├── models/             # Mongoose schema definitions
│   ├── routes/             # API route declarations
│   ├── middleware/         # Auth, upload, and error handlers
│   └── utils/              # Helper functions (Cloudinary, responses, etc.)
```

---

## 🛠️ Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** for session handling
- **Multer** for file processing
- **Cloudinary** for image hosting
- **bcrypt** for password security
- **Postman** for testing and documentation

---

## 📌 API Routes Snapshot

- `POST   /api/v1/users/register` – Create a new user profile  
- `POST   /api/v1/users/login` – Authenticate and receive tokens  
- `POST   /api/v1/users/logout` – Invalidate session tokens  
- `POST   /api/v1/users/refresh-token` – Get new access token  
- `GET    /api/v1/users/current-user` – Fetch current user's data  
- `PATCH  /api/v1/users/update-account` – Edit user profile info  
- `PATCH  /api/v1/users/avatar` – Update avatar image  
- `PATCH  /api/v1/users/coverImage` – Update channel cover  
- `GET    /api/v1/users/c/:username` – Get a public channel profile  
- `GET    /api/v1/users/history` – Retrieve watch history  

---

## ⚙️ Getting Up and Running

### Requirements

- Node.js v14 or higher
- MongoDB instance (local/cloud)
- Cloudinary account (for media storage)

### Setup Instructions

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/tweetube-backend.git
   cd tweetube-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file and include the following:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_ACCESS_SECRET=your_access_token_secret
   JWT_REFRESH_SECRET=your_refresh_token_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLIENT_ORIGIN=http://localhost:3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

---

## 📬 Feedback & Contributions

Feel free to fork, contribute, or drop feedback. This project is built for learning, experimentation, and growth. Future additions may include playlists, video uploads, comments, and more!
