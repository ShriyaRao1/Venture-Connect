# Resume Guide: Venture Connect Platform

This document outlines the project overview, key features, technology stack, and professional resume bullet points for the **Venture Connect** platform.

---

## 1. Project Overview (What the Project is About)
**Venture Connect** is a full-stack, secure networking and matchmaking web platform designed to bridge the gap between startup founders and investors. It provides a centralized space where founders can showcase their startups (including details like taglines, funding targets, equity offers, and pitch descriptions) and investors can discover, filter, and request direct connections with high-potential ventures. 

The platform features role-based dashboards, a connection approval workflow, and a secure real-time messaging system, simplifying early-stage matchmaking and fostering investment opportunities.

---

## 2. Technology Stack & Key Skills
You can list these technologies directly under your "Technical Skills" section or under this project on your resume:

*   **Frontend**: React (v18+), Vite, Tailwind CSS, JavaScript (ES6+), HTML5, CSS3, Framer Motion (for animations).
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB, Mongoose (ODM).
*   **Authentication & Security**: JSON Web Tokens (JWT) for session management, HTTP-only cookies, Bcrypt for secure password hashing, CORS.
*   **State Management & Routing**: React Context API (AuthContext), React Router (v6).
*   **Tools & Utilities**: Axios (with custom interceptors), React Hot Toast, Git & GitHub.

---

## 3. High-Impact Resume Bullet Points
Use these statements in the **Projects** section of your resume. They use active verbs and focus on technical implementation and architectural decisions:

*   **Developed a secure Full-Stack Startup-Investor Matchmaking Web Application (Venture Connect)** using React, Node.js, Express, and MongoDB, facilitating seamless interactions between founders and angel investors.
*   **Engineered Role-Based Access Control (RBAC)** using JWT and custom Express middleware to isolate and secure dashboards, profile creation, and admin panels for Founder, Investor, and Administrator roles.
*   **Implemented a custom Connection Pipeline / State Machine** (`pending`, `accepted`, `rejected`, `withdrawn`) allowing investors to send connection requests and founders to review, accept, or decline in real time.
*   **Built a Secure Messaging System** with context-aware chat threads associated with specific startup profiles, enabling persistent direct communication between matched users.
*   **Designed a responsive, premium Dark-Mode UI** using React, Tailwind CSS, and Framer Motion, utilizing skeletal loaders and toast notifications to deliver a highly interactive, fluid user experience (UX).
*   **Optimized database performance** by indexing MongoDB schemas (User, Startup, Connection, Message) and writing optimized aggregation queries to fetch statistics and recommendations.
*   **Structured API requests** by creating a centralized Axios instance with interceptors to automatically attach JWT authorization headers and handle global error responses.

---

## 4. Detailed Feature Breakdown

### A. Role-Based Authentication & Authorization (RBAC)
*   **Registration & Login**: Secure user signup specifying roles (`founder`, `investor`, `admin`). Passwords are encrypted using **Bcrypt** with a salt factor of `12` before database storage.
*   **JWT Session Handling**: Login issues a stateless JSON Web Token containing user claims, which is stored in memory/context and sent in the header of API requests.
*   **Protected Routes**: Custom React wrappers block unauthorized users from accessing features like `/startups/new` (founder-only), `/admin` (admin-only), or `/dashboard` (all authenticated roles).

### B. Dynamic Startup & Investor Dashboards
*   **Founder View**: Features statistics on their startups, connection requests from interested investors, and a browse network tab to explore prospective investors.
*   **Investor View**: Features a curated list of startups, status updates on connection requests sent, and a browse startups section.
*   **Admin Panel**: Allows administrators to oversee network statistics, manage user accounts, and moderate startup profiles.

### C. Search & Discovery Engine
*   Founders and Investors can search and filter the network directory.
*   Startups can be queried and filtered by **Category** (e.g., *AI/ML*, *SaaS*, *FinTech*, *HealthTech*) and **Stage** (e.g., *Idea*, *MVP*, *Early Traction*, *Growth*).

### D. Direct Messaging & Real-Time Interaction
*   Allows direct messaging between authenticated users.
*   Keeps track of message read/unread statuses and links conversations directly to the relevant startup profile for context.
