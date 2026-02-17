# Backend README (Node.js + Express + MongoDB)

This backend powers a full‑stack photo‑sharing social media platform featuring secure user authentication, OTP email verification, image uploads, real‑time‑ready architecture, and robust security middleware. It exposes RESTful API endpoints consumed by the Next.js frontend and integrates with MongoDB, Cloudinary, and Nodemailer.

## Features

- User Authentication
  - JWT‑based login & protected routes
  - Two‑step account creation
  - Secure HTTP‑only cookies

- OTP Email Verification
  - Nodemailer‑powered one‑time passcodes
  - Email templates stored in /email

- Image Upload & Processing
  - Multer for file handling
  - Sharp for image compression
  - Cloudinary for storage

- User Interactions
  - Likes, comments, saves
  - User search

- Security Middleware
  - Helmet
  - HPP
  - Rate limiting
  - MongoDB sanitization
  - Cookie parsing

- Logging
  - Morgan request logging

- Scalable Architecture
  - Controllers, routes, models, middleware, and utilities separated cleanly

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Nodemailer
- Cloudinary
- Multer + Sharp
- dotenv
- Security Middleware: Helmet, HPP, express‑rate‑limit, express‑mongo‑sanitize

## Folder Structure

```
backend/
│
├── controllers/        # Route logic
├── email/              # Email templates & OTP helpers
├── middleware/         # Auth, error handling, security
├── models/             # Mongoose schemas
├── routes/             # API route definitions
├── utils/              # Helpers (cloudinary, tokens, etc.)
│
├── app.js              # Express app configuration
├── server.js           # Server entry point
├── package.json
└── .gitignore
```

## Enviroment Variables

Create a '.env' file in the backend root and add the following:

```
NODE_ENV=development
PORT=8000

DB_USERNAME=
DB_PASSWORD=
DB=

JWT_SECRET=
JWT_EXPIRES_IN=
JWT_COOKIE_EXPIRES_IN=

EMAIL=
EMAIL_PASS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Installation

1. Clone the repository

```
git clone <your-backend-repo-url>
cd backend
```

2. Install Dependencies

```
npm install
```

3. Create your .env file
   - Copy the variables from the enviroment variable section above.

4. Start the development server

```
npm start
```

this runs:

```
nodemon server.js
```

## API Overview

### Auth Routes

| Method | Endpoint                        | Description                      | Auth Required |
| ------ | ------------------------------- | -------------------------------- | ------------- |
| POST   | `/api/v1/users/signup`          | Register a new user              | No            |
| POST   | `/api/v1/users/verify`          | Verify email OTP                 | Yes           |
| POST   | `/api/v1/users/resend-otp`      | Authenticate user                | Yes           |
| POST   | `/api/v1/users/login`           | Log in user and issue JWT cookie | No            |
| POST   | `/api/v1/users/logout`          | Log out user and clear cookie    | No            |
| POST   | `/api/v1/users/forget-password` | Send password reset email        | No            |
| POST   | `/api/v1/users/reset-password`  | Reset password using token       | No            |
| POST   | `/api/v1/users/change-password` | Change password while logged in  | Yes           |
| DELETE | `/api/v1/users/delete-account`  | Permanently delete account       | Yes           |

### User Routes

| Method | Endpoint                            | Description                     | Auth Required |
| ------ | ----------------------------------- | ------------------------------- | ------------- |
| GET    | `/api/v1/users/profile/:id`         | Get public profile of user      | No            |
| POST   | `/api/v1/users/edit-profile`        | Update profile info and picture | Yes           |
| GET    | `/api/v1/users/suggested-user`      | Get suggested users to follow   | Yes           |
| POST   | `/api/v1/users/follow-unfollow/:id` | follow or unfollow a user       | Yes           |
| GET    | `/api/v1/users/me`                  | Get the user's profile          | Yes           |
| GET    | `/api/v1/users/search`              | Search users by name/username   | Yes           |

### Notification Routes

| Method | Endpoint                           | Description                              | Auth Required |
| ------ | ---------------------------------- | ---------------------------------------- | ------------- |
| GET    | `/api/v1/users/notifications`      | Get all notifications for logged in user | Yes           |
| POST   | `/api/v1/users/notifications/read` | Mark notifications as read               | Yes           |

### Post Routes

| Method | Endpoint                                 | Description                | Auth Required |
| ------ | ---------------------------------------- | -------------------------- | ------------- |
| POST   | `/api/v1/posts/create-post`              | Create a new image pos     | Yes           |
| POST   | `/api/v1/posts/all-posts`                | Get all feed posts         | No            |
| POST   | `/api/v1/posts/user-post/:id`            | Get posts by specific user | No            |
| POST   | `/api/v1/posts/post/:id`                 | Get a single post by id    | No            |
| POST   | `/api/v1/posts/save-unsave-post/:postId` | Save or unsave a post      | Yes           |
| DELETE | `/api/v1/posts/delete-post/:id`          | Delete a post              | Yes           |
| POST   | `/api/v1/posts/like-dislike/:id`         | Like or unlike a post      | Yes           |
| POST   | `/api/v1/posts/comment/:id`              | Add a comment to a post    | Yes           |

## Security

This backend includes multiple layers of protection

- Helmet: secure HTTP headers
- HPP: prevent HTTP parameter pollution
- Rate Limiting: throttle repeated requests
- Mongo Sanitize: prevent NoSQL injection
- JWT + HTTP‑only cookies: secure authentication

## License

ISC — © Cassidy Priestley
