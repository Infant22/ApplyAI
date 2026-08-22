# ApplyAI - Smart Job Application Tracker

An automated job search console, tracker, and ATS scoring engine built with Node.js/Express (backend) and Vanilla HTML/CSS/JS (frontend).

---

## 🚀 Deployment Instructions (Recommended Ordering)

To avoid CORS blockages and secure communications between your deployed frontend and backend, follow this precise deployment order:

### Step 1: Deploy the Backend
1. Host your Express backend on your preferred cloud platform (e.g. Render, Heroku, or AWS).
2. Set your environment variables in the cloud dashboard (refer to the variables defined in `backend/.env`):
   * `MONGO_URI`: Your production MongoDB Atlas connection string.
   * `JWT_SECRET`: A secure random hash key.
   * `GEMINI_API_KEY`: Your Google Gemini API key.
3. Note the live URL of your deployed backend server (e.g. `https://applyai-backend.onrender.com`).

### Step 2: Configure and Deploy the Frontend
1. Open `frontend/js/config.js` and update the production URL fallback:
   ```javascript
   window.API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
     ? "http://localhost:5000"
     : "https://your-deployed-backend-url.com"; // <-- REPLACE WITH YOUR LIVE BACKEND URL HERE
   ```
2. Host your frontend files (e.g. on Netlify, Vercel, or GitHub Pages).
3. Note the live URL of your deployed frontend client (e.g. `https://applyai.netlify.app`).

### Step 3: Link Frontend CORS Allowlist to Backend
1. Go back to your backend hosting dashboard and update your environment variables config to add:
   * `FRONTEND_URL`: `https://your-deployed-frontend-url.com` (replace with your live Netlify/Vercel URL).
2. Restart your backend server.

---

## 🔒 Security Auditing Tools
* **Brute-Force Protection**: Login and register endpoints are rate-limited to 15 authentication requests per 15 minutes.
* **HTTP Defenses**: `helmet` is configured with cross-origin policies enabled to secure page headers without blocking asset downloads (avatars & resumes).
