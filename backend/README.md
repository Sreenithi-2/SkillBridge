# SkillBridge Backend - Node.js + Express.js + MySQL 8

This directory contains the **Node.js + Express.js REST API backend** and the **MySQL 8 relational schema** for the SkillBridge Platform.

---

## 1. Directory Structure

```text
backend/
├── .env.example          # Template for environment variables (copy to .env)
├── .gitignore            # Excludes node_modules, .env, and logs
├── package.json          # Node.js dependencies (express, mysql2, bcryptjs, cors, dotenv)
├── server.js             # Express application entrypoint (Port 5000)
├── schema.sql            # Complete 16-table MySQL relational database schema & seed data
├── config/
│   └── db.js             # MySQL 8 connection pool (mysql2/promise)
├── controllers/
│   ├── studentController.js     # Student CRUD & registration logic
│   ├── companyController.js     # Company registration & retrieval logic
│   ├── internshipController.js  # Internship listing, detail & creation logic
│   └── applicationController.js # Internship applications & status lifecycle logic
└── routes/
    ├── healthRoutes.js      # GET /api/health endpoint
    ├── studentRoutes.js     # Student REST API routes (/api/students)
    ├── companyRoutes.js     # Company REST API routes (/api/companies)
    ├── internshipRoutes.js  # Internship REST API routes (/api/internships)
    └── applicationRoutes.js # Application REST API routes (/api/applications)
```

---

## 2. Prerequisites

- **Node.js**: Version 18.x, 20.x, or 22.x installed
- **MySQL Server**: Version 8.0+ running on `localhost:3306`
- **Database**: `skillbridge_db` created (using `schema.sql`)

---

## 3. Getting Started

### Step 1: Install Dependencies
Open a terminal in this `backend` folder and run:
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy the template file `.env.example` to `.env`:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# Or on command prompt / bash:
cp .env.example .env
```
Open `.env` and set your local MySQL password:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=skillbridge_db

CLIENT_URL=http://localhost:3000
```

### Step 3: Start the Backend Server
```bash
# Start standard server:
npm start

# Or with automatic reload during development:
npm run dev
```

The server will launch on **http://localhost:5000/**.

---

## 4. API Endpoints

### 1. Root Info
- **URL:** `GET http://localhost:5000/`
- **Response:**
  ```json
  {
    "project": "SkillBridge Platform REST API",
    "version": "1.0.0",
    "status": "online",
    "endpoints": {
      "healthCheck": "/api/health"
    }
  }
  ```

### 2. Health & Database Diagnostic Check
- **URL:** `GET http://localhost:5000/api/health`
- **Response (When Connected):**
  ```json
  {
    "status": "healthy",
    "service": "SkillBridge Backend REST API",
    "timestamp": "2026-11-22T10:45:00.000Z",
    "uptimeSeconds": 12,
    "server": {
      "status": "running",
      "port": 5000,
      "environment": "development"
    },
    "database": {
      "status": "connected",
      "details": {
        "databaseName": "skillbridge_db",
        "serverTime": "2026-11-22T10:45:00.000Z",
        "latency": "4ms"
      }
    }
  }
  ```
- **Response (If MySQL is offline or password incorrect):**
  Returns HTTP 503 with `"database": { "status": "disconnected", "error": "...", "hint": "..." }`, while keeping the Express server running gracefully.

---

## 5. Student API Endpoints (`/api/students`)

### 1. List All Students
- **Method & URL:** `GET http://localhost:5000/api/students`
- **Query Parameters (Optional):**
  - `search` (string): Search by candidate name, email, or college (e.g. `?search=Anna`)
  - `college` (string): Filter by exact college name
  - `department` (string): Filter by department
  - `limit` (integer): Results per page (default: 50, max: 100)
  - `offset` (integer): Pagination offset (default: 0)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "stud-101",
        "full_name": "Yazh S",
        "email": "yazh.s@example.com",
        "mobile": "9876543210",
        "college": "Anna University",
        "degree": "B.E.",
        "department": "Computer Science & Engineering",
        "graduation_year": 2026,
        "cgpa": "8.85",
        "github_url": null,
        "linkedin_url": null,
        "portfolio_url": null,
        "profile_bio": "Pre-final year Computer Science student passionate about full stack Java microservices and enterprise software engineering.",
        "avatar_url": null,
        "created_at": "2026-11-22T04:30:00.000Z",
        "updated_at": "2026-11-22T04:30:00.000Z"
      }
    ]
  }
  ```

### 2. Fetch Single Student by ID
- **Method & URL:** `GET http://localhost:5000/api/students/stud-101`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "stud-101",
      "full_name": "Yazh S",
      "email": "yazh.s@example.com",
      "mobile": "9876543210",
      "college": "Anna University",
      "degree": "B.E.",
      "department": "Computer Science & Engineering",
      "graduation_year": 2026,
      "cgpa": "8.85",
      "profile_bio": "..."
    }
  }
  ```
- **Error Response (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Student with ID 'stud-999' not found"
  }
  ```

### 3. Register a New Student
- **Method & URL:** `POST http://localhost:5000/api/students`
- **Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "full_name": "Rahul Verma",
    "email": "rahul.verma@example.com",
    "mobile": "9876543211",
    "college": "IIT Madras",
    "degree": "B.Tech",
    "department": "Computer Science",
    "graduation_year": 2026,
    "cgpa": 8.90,
    "github_url": "https://github.com/rahulverma",
    "linkedin_url": "https://linkedin.com/in/rahulverma",
    "profile_bio": "Passionate backend engineer with expertise in Node.js and MySQL."
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Student registered successfully",
    "data": {
      "id": "stud-123456-a1b2",
      "full_name": "Rahul Verma",
      "email": "rahul.verma@example.com",
      "mobile": "9876543211",
      "college": "IIT Madras",
      "degree": "B.Tech",
      "department": "Computer Science",
      "graduation_year": 2026,
      "cgpa": "8.90",
      "github_url": "https://github.com/rahulverma",
      "linkedin_url": "https://linkedin.com/in/rahulverma",
      "portfolio_url": null,
      "profile_bio": "Passionate backend engineer with expertise in Node.js and MySQL.",
      "avatar_url": null
    }
  }
  ```
- **Duplicate Email Response (409 Conflict):**
  ```json
  {
    "success": false,
    "error": "Conflict: A student with this email address already exists"
  }
  ```
- **Validation Failure Response (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation Error: Missing required fields",
    "missingFields": ["college", "degree"]
  }
  ```

### 4. Update Existing Student Profile
- **Method & URL:** `PUT http://localhost:5000/api/students/:id`
- **Path Parameter:** `id` (e.g. `stud-101`)
- **Headers:** `Content-Type: application/json`
- **Request Body (JSON - Provide only the fields you wish to update):**
  ```json
  {
    "cgpa": 9.20,
    "github_url": "https://github.com/yazh-dev",
    "linkedin_url": "https://linkedin.com/in/yazh-s",
    "profile_bio": "Senior year Computer Science student specializing in distributed systems, microservices, and high-performance databases."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Student profile updated successfully",
    "data": {
      "id": "stud-101",
      "full_name": "Yazh S",
      "email": "yazh.s@example.com",
      "mobile": "9876543210",
      "college": "Anna University",
      "degree": "B.E.",
      "department": "Computer Science & Engineering",
      "graduation_year": 2026,
      "cgpa": "9.20",
      "github_url": "https://github.com/yazh-dev",
      "linkedin_url": "https://linkedin.com/in/yazh-s",
      "portfolio_url": null,
      "profile_bio": "Senior year Computer Science student specializing in distributed systems, microservices, and high-performance databases.",
      "avatar_url": null,
      "created_at": "2026-11-22T04:30:00.000Z",
      "updated_at": "2026-11-22T11:30:00.000Z"
    }
  }
  ```
- **Student Not Found Response (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Student with ID 'stud-999' not found"
  }
  ```
- **Duplicate Email Conflict (409 Conflict):**
  ```json
  {
    "success": false,
    "error": "Conflict: A student with this email address already exists"
  }
  ```
- **No Fields Provided (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation Error: No valid fields provided for update"
  }
  ```

### 5. Delete Student Record
- **Method & URL:** `DELETE http://localhost:5000/api/students/:id`
- **Path Parameter:** `id` (e.g. `stud-798616-00e1`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Student deleted successfully",
    "data": {
      "id": "stud-798616-00e1"
    }
  }
  ```
- **Student Not Found Response (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Student with ID 'stud-999' not found"
  }
  ```
- **Missing Student ID in URL (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Bad Request: Student ID must be provided in the URL path (e.g. DELETE /api/students/stud-101)"
  }
  ```

---

## 6. Company API Endpoints

### 1. Register a New Company / Recruiter
- **Method & URL:** `POST http://localhost:5000/api/companies`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "company_name": "Tech Solutions",
    "official_email": "hr@techsolutions.com",
    "contact_person": "Priya Sharma",
    "phone_number": "9876543210",
    "website_url": "https://techsolutions.example.com",
    "industry_domain": "Information Technology",
    "company_size": "50-200",
    "location": "Chennai, Tamil Nadu",
    "description": "Leading cloud solutions and enterprise software provider.",
    "password": "Password123!"
  }
  ```
  *(Note: Supports both snake_case and camelCase field keys, e.g., `company_name` or `companyName`)*
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Company registered successfully",
    "data": {
      "id": "comp-798616-00e1",
      "company_name": "Tech Solutions",
      "official_email": "hr@techsolutions.com"
    }
  }
  ```
- **Validation Failure Response (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: Missing required fields [company_name, password]",
    "missingFields": ["company_name", "password"]
  }
  ```
- **Invalid Email Format (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: Invalid official email format",
    "field": "official_email"
  }
  ```
- **Password Too Short (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: Password must be at least 8 characters long",
    "field": "password"
  }
  ```
- **Duplicate Company Name / Email (409 Conflict):**
  ```json
  {
    "success": false,
    "error": "Official email 'hr@techsolutions.com' is already registered",
    "conflictField": "official_email"
  }
  ```

### 2. List Registered Companies
- **Method & URL:** `GET http://localhost:5000/api/companies`
- **Query Parameters (Optional):**
  - `search`: Filter by name, email, or location
  - `domain`: Filter by industry domain
  - `limit`: Default `50` (max 100)
  - `offset`: Default `0`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "comp-101",
        "company_name": "Tech Solutions",
        "official_email": "hr@techsolutions.com",
        "contact_person": "Priya Sharma",
        "industry_domain": "Information Technology",
        "location": "Chennai, Tamil Nadu"
      }
    ]
  }
  ```

---

## 7. Internship API Endpoints

### 1. List All Internships
- **Method & URL:** `GET http://localhost:5000/api/internships`
- **Query Parameters (Optional):**
  - `domain`: Filter by domain (e.g., `Backend`, `Frontend`, `Data`, `DevOps`)
  - `workplace_mode`: Filter by workplace mode (`Remote`, `Hybrid`, `On-site`)
  - `location`: Search location by keyword
  - `min_stipend`: Filter by minimum monthly stipend amount (e.g., `35000`)
  - `company_id`: Filter by specific company ID
  - `search`: Full text search across title, company, domain, and description
  - `limit`: Page size (default 50, max 100)
  - `offset`: Pagination offset (default 0)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 8,
    "data": [
      {
        "id": "int-101",
        "company_id": "comp-101",
        "title": "Full Stack Java Developer Intern",
        "company_name": "CloudScale Solutions",
        "company_logo_text": "CS",
        "logo_bg_color": "#4f46e5",
        "domain": "Backend",
        "workplace_mode": "Hybrid",
        "location": "Bengaluru, Karnataka (Hybrid)",
        "stipend_amount": 35000,
        "stipend_display": "₹35,000 / month",
        "duration": "6 Months",
        "openings_count": 4,
        "application_deadline": "2026-11-30",
        "is_active": 1
      }
    ]
  }
  ```

### 2. Fetch Single Internship by ID
- **Method & URL:** `GET http://localhost:5000/api/internships/:id`
- **Path Parameter:** `id` (e.g., `int-101`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "int-101",
      "company_id": "comp-101",
      "title": "Full Stack Java Developer Intern",
      "company_name": "CloudScale Solutions",
      "domain": "Backend",
      "workplace_mode": "Hybrid",
      "location": "Bengaluru, Karnataka (Hybrid)",
      "stipend_amount": 35000,
      "stipend_display": "₹35,000 / month",
      "duration": "6 Months",
      "openings_count": 4,
      "application_deadline": "2026-11-30",
      "description": "Join CloudScale's SaaS engineering team...",
      "eligibility_criteria": "B.E. / B.Tech in CSE, IT with min 7.0 CGPA.",
      "required_skills": ["Java", "Spring Boot", "MySQL", "REST APIs"],
      "responsibilities": ["Develop microservices", "Optimize SQL queries"],
      "perks": ["Flexible hours", "Pre-placement offer (PPO) eligible"]
    }
  }
  ```
- **Not Found Response (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Internship with ID 'int-999' not found"
  }
  ```

### 3. Create a New Internship
- **Method & URL:** `POST http://localhost:5000/api/internships`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "company_id": "comp-101",
    "title": "React Frontend Developer Intern",
    "domain": "Frontend",
    "workplace_mode": "Remote",
    "location": "Remote, India",
    "stipend_amount": 30000,
    "duration": "3 Months",
    "openings_count": 2,
    "application_deadline": "2026-12-15",
    "description": "Develop scalable UI components using React, Redux, and modern styling libraries.",
    "eligibility_criteria": "Proficiency in JavaScript (ES6+), React, HTML5, and CSS3.",
    "skills": ["React.js", "JavaScript", "HTML/CSS", "Git"],
    "responsibilities": [
      "Build modular reusable components",
      "Integrate RESTful backend endpoints"
    ],
    "perks": [
      "Certificate of Completion",
      "Letter of Recommendation",
      "Flexible Working Hours"
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Internship created successfully",
    "data": {
      "id": "int-798616-00e1",
      "company_id": "comp-101",
      "company_name": "CloudScale Solutions",
      "title": "React Frontend Developer Intern",
      "domain": "Frontend",
      "workplace_mode": "Remote",
      "location": "Remote, India",
      "stipend_amount": 30000,
      "stipend_display": "₹30,000 / month",
      "duration": "3 Months",
      "openings_count": 2,
      "application_deadline": "2026-12-15",
      "skills_count": 4
    }
  }
  ```
- **Validation Failure Response (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: Missing required fields [title, domain]",
    "missingFields": ["title", "domain"]
  }
  ```
- **Company Not Found / Foreign Key Error (404 / 400):**
  ```json
  {
    "success": false,
    "error": "Foreign key validation failed: Company with ID 'comp-999' not found",
    "field": "company_id"
  }
  ```

---

## 8. Application API Endpoints

### 1. Submit an Application
- **Method & URL:** `POST http://localhost:5000/api/applications`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "student_id": "stud-101",
    "internship_id": "int-106",
    "cover_note": "I have extensive experience with FastAPI, Node.js, and SQL databases.",
    "ai_match_score": 92
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Application submitted successfully",
    "data": {
      "id": "app-798616-00e1",
      "student_id": "stud-101",
      "student_name": "Arun Kumar",
      "internship_id": "int-106",
      "internship_title": "Junior Python Backend Intern",
      "company_name": "Synthetix AI Systems",
      "status": "Applied",
      "ai_match_score": 92,
      "applied_at": "2026-11-22T12:00:00.000Z"
    }
  }
  ```
- **Duplicate Application Error (409 Conflict):**
  ```json
  {
    "success": false,
    "error": "Conflict: Student 'stud-101' has already applied for internship 'int-101'",
    "existingApplicationId": "app-201",
    "currentStatus": "Interview Scheduled"
  }
  ```
- **Foreign Key Not Found (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Foreign key validation failed: Student with ID 'stud-999' does not exist",
    "field": "student_id"
  }
  ```

### 2. Retrieve All Applications
- **Method & URL:** `GET http://localhost:5000/api/applications`
- **Query Parameters (Optional):**
  - `student_id`: Filter applications by student
  - `internship_id`: Filter applications by internship
  - `status`: Filter by status (`Applied`, `Under Review`, `Shortlisted`, `Interview Scheduled`, `Selected`, `Rejected`)
  - `company_id`: Filter applications submitted to a company's internships
  - `limit`: Default `50` (max 100)
  - `offset`: Default `0`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 6,
    "data": [
      {
        "id": "app-201",
        "student_id": "stud-101",
        "internship_id": "int-101",
        "status": "Interview Scheduled",
        "ai_match_score": 94,
        "interview_date": "25 Nov 2026 • 11:00 AM IST",
        "interview_link": "https://meet.google.com/abc-skillbridge-demo",
        "student_name": "Arun Kumar",
        "student_email": "arun.kumar@annauniv.edu",
        "internship_title": "Full Stack Java Developer Intern",
        "company_name": "CloudScale Solutions"
      }
    ]
  }
  ```

### 3. Retrieve Single Application by ID
- **Method & URL:** `GET http://localhost:5000/api/applications/:id`
- **Path Parameter:** `id` (e.g. `app-201`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "app-201",
      "student_id": "stud-101",
      "internship_id": "int-101",
      "status": "Interview Scheduled",
      "ai_match_score": 94,
      "student_name": "Arun Kumar",
      "internship_title": "Full Stack Java Developer Intern",
      "company_name": "CloudScale Solutions"
    }
  }
  ```
- **Not Found (404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Application with ID 'app-999' not found"
  }
  ```

### 4. Update Application Status
- **Method & URL:** `PATCH http://localhost:5000/api/applications/:id/status`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "status": "Shortlisted",
    "notes": "Candidate profile matches required criteria."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Application status updated to 'Shortlisted' successfully",
    "data": {
      "id": "app-201",
      "previous_status": "Applied",
      "status": "Shortlisted"
    }
  }
  ```
- **Invalid Status Error (400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: Invalid status 'Pending'. Allowed values are: 'Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'",
    "allowedStatuses": [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Interview Scheduled",
      "Selected",
      "Rejected"
    ]
  }
  ```






