-- ============================================================================
-- SkillBridge Platform - Complete MySQL Relational Database Schema & Seed Data
-- Database: skillbridge_db
-- Compatibility: MySQL 8.0+
-- Architecture: Node.js + Express.js + MySQL 8 (InnoDB Engine)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS skillbridge_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillbridge_db;

-- ----------------------------------------------------------------------------
-- 1. Students Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    college VARCHAR(200) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    graduation_year INT NOT NULL,
    cgpa DECIMAL(3,2) DEFAULT 8.50,
    github_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    profile_bio TEXT,
    avatar_url VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'ROLE_STUDENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_email (email),
    INDEX idx_student_college (college)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Companies Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL UNIQUE,
    official_email VARCHAR(150) NOT NULL UNIQUE,
    contact_person VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    website_url VARCHAR(255) NOT NULL,
    industry_domain VARCHAR(100) NOT NULL,
    company_size VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    logo_url VARCHAR(255),
    logo_text VARCHAR(10) NOT NULL,
    logo_bg_color VARCHAR(20) DEFAULT '#4f46e5',
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'ROLE_RECRUITER',
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_email (official_email),
    INDEX idx_company_domain (industry_domain)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Recruiters Table (Team Members & Hiring Managers under Companies)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recruiters (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Talent Acquisition Manager',
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'HR Manager', 'Recruiter') DEFAULT 'Recruiter',
    avatar_url VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_recruiter_email (email),
    INDEX idx_recruiter_company (company_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Skills Master Catalog Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Technical', -- Backend, Frontend, Database, Cloud, General
    icon_class VARCHAR(50) DEFAULT 'bi-code-slash',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_skill_name (skill_name),
    INDEX idx_skill_category (category)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Student Skills Table (Verified via Assessments & Self-Reported)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    skill_id INT NULL,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) DEFAULT 'Intermediate', -- Beginner, Intermediate, Advanced
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
    UNIQUE KEY uq_student_skill (student_id, skill_name),
    INDEX idx_student_skills_student (student_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Assessments Table (Technical MCQ & Coding Challenges Catalog)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    technology VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Backend, Frontend, Database, Cloud, Core
    difficulty ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Intermediate',
    duration_minutes INT NOT NULL DEFAULT 10,
    total_questions INT NOT NULL DEFAULT 10,
    passing_percentage INT NOT NULL DEFAULT 70,
    description TEXT,
    icon_class VARCHAR(50) DEFAULT 'bi-patch-check-fill',
    badge_color VARCHAR(20) DEFAULT '#4f46e5',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assessment_tech (technology)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. Assessment Results Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessment_results (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    assessment_id VARCHAR(50) NULL,
    technology VARCHAR(100) NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    percentage INT NOT NULL,
    proficiency_tier VARCHAR(50) NOT NULL, -- Master, Proficient, Needs Practice
    time_taken_seconds INT NOT NULL,
    certificate_code VARCHAR(100) UNIQUE NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
    INDEX idx_results_student (student_id),
    INDEX idx_results_tech (technology)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. Internships Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internships (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    posted_by VARCHAR(50) NULL,
    title VARCHAR(200) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    company_logo_text VARCHAR(10) NOT NULL,
    logo_bg_color VARCHAR(20) DEFAULT '#4f46e5',
    domain VARCHAR(50) NOT NULL, -- Backend, Frontend, FullStack, Data, Database, DevOps
    workplace_mode ENUM('Remote', 'Hybrid', 'On-site') NOT NULL,
    location VARCHAR(150) NOT NULL,
    stipend_amount INT NOT NULL,
    stipend_display VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    openings_count INT DEFAULT 1,
    application_deadline DATE NOT NULL,
    description TEXT NOT NULL,
    eligibility_criteria TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (posted_by) REFERENCES recruiters(id) ON DELETE SET NULL,
    INDEX idx_internship_company (company_id),
    INDEX idx_domain (domain),
    INDEX idx_workplace (workplace_mode),
    INDEX idx_stipend (stipend_amount)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8b. Internship Required Skills
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internship_required_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    internship_id VARCHAR(50) NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    INDEX idx_req_skill_internship (internship_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8c. Internship Responsibilities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internship_responsibilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    internship_id VARCHAR(50) NOT NULL,
    responsibility_text VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    INDEX idx_resp_internship (internship_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8d. Internship Perks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internship_perks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    internship_id VARCHAR(50) NOT NULL,
    perk_text VARCHAR(200) NOT NULL,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    INDEX idx_perk_internship (internship_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. Applications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    internship_id VARCHAR(50) NOT NULL,
    status ENUM('Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected') DEFAULT 'Applied',
    ai_match_score INT DEFAULT 85,
    cover_note TEXT,
    interview_date VARCHAR(100),
    interview_link VARCHAR(255),
    offer_details TEXT,
    notes TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    UNIQUE KEY uq_student_application (student_id, internship_id),
    INDEX idx_app_student (student_id),
    INDEX idx_app_internship (internship_id),
    INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. Interviews Table (Scheduling, Rounds, Rescheduling & Feedback)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interviews (
    id VARCHAR(50) PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    internship_id VARCHAR(50) NOT NULL,
    recruiter_id VARCHAR(50) NULL,
    round_type VARCHAR(100) NOT NULL DEFAULT 'Technical Round 1',
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    interview_mode ENUM('Google Meet', 'Zoom', 'MS Teams', 'In-Person') DEFAULT 'Google Meet',
    meeting_link VARCHAR(255),
    interviewer_name VARCHAR(150) NOT NULL,
    interviewer_email VARCHAR(150),
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Scheduled',
    technical_score INT DEFAULT NULL, -- 1-10 or 1-100
    soft_skills_score INT DEFAULT NULL,
    recommendation ENUM('Strong Hire', 'Hire', 'Hold', 'No Hire') DEFAULT NULL,
    feedback_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    FOREIGN KEY (recruiter_id) REFERENCES recruiters(id) ON DELETE SET NULL,
    INDEX idx_interview_app (application_id),
    INDEX idx_interview_student (student_id),
    INDEX idx_interview_status (status),
    INDEX idx_interview_date (interview_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. Offers Table (Offer Generation, PDF, Status Tracking & Candidate Responses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(50) PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50) NOT NULL,
    internship_id VARCHAR(50) NOT NULL,
    recruiter_id VARCHAR(50) NULL,
    offered_role VARCHAR(150) NOT NULL,
    monthly_stipend INT NOT NULL,
    duration VARCHAR(50) NOT NULL,
    joining_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    work_location VARCHAR(150) NOT NULL,
    terms_and_conditions TEXT,
    offer_letter_url VARCHAR(255),
    status ENUM('Draft', 'Released', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Withdrawn') DEFAULT 'Draft',
    released_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    candidate_response_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
    FOREIGN KEY (recruiter_id) REFERENCES recruiters(id) ON DELETE SET NULL,
    INDEX idx_offer_application (application_id),
    INDEX idx_offer_student (student_id),
    INDEX idx_offer_company (company_id),
    INDEX idx_offer_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 12. Messages Table (Real-Time Recruiter <-> Candidate Messaging)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    sender_type ENUM('Recruiter', 'Student') NOT NULL,
    recruiter_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    internship_id VARCHAR(50) NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recruiter_id) REFERENCES recruiters(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE SET NULL,
    INDEX idx_msg_conversation (conversation_id),
    INDEX idx_msg_recruiter_student (recruiter_id, student_id),
    INDEX idx_msg_created (created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 13. Notifications Table (Student & Recruiter Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    recipient_type ENUM('Student', 'Recruiter') NOT NULL,
    recipient_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- ApplicationStatus, InterviewInvite, OfferReleased, ChatMessage, AssessmentComplete
    reference_id VARCHAR(50) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_recipient (recipient_type, recipient_id),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB;


-- ============================================================================
-- SEED DATA: Complete Demo Dataset Synchronized with Frontend
-- ============================================================================

-- 1. Seed Default Demo Student (Yazh S)
INSERT INTO students (id, full_name, email, mobile, college, degree, department, graduation_year, cgpa, profile_bio)
VALUES ('stud-101', 'Yazh S', 'yazh.s@example.com', '9876543210', 'Anna University', 'B.E.', 'Computer Science & Engineering', 2026, 8.85, 'Pre-final year Computer Science student passionate about full stack Java microservices and enterprise software engineering.')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 2. Seed Verified Demo Companies
INSERT INTO companies (id, company_name, official_email, contact_person, phone_number, website_url, industry_domain, company_size, location, description, logo_text, logo_bg_color, password_hash, role)
VALUES 
('comp-101', 'CloudScale Solutions', 'recruiter@cloudscale.io', 'Priya Sharma', '9876543220', 'https://cloudscale.io', 'Cloud & SaaS', '201-500 Employees', 'Bengaluru, Karnataka (Hybrid)', 'CloudScale builds high-throughput cloud microservices, distributed SaaS platforms, and enterprise data infrastructure for global clients.', 'CS', '#4f46e5', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-102', 'DataMatrix Analytics', 'hiring@datamatrix.ai', 'Vikramaditya Verma', '9876543221', 'https://datamatrix.ai', 'Data & AI', '51-200 Employees', 'Hyderabad, Telangana (Remote)', 'DataMatrix specializes in real-time streaming ETL pipelines, predictive AI intelligence, and high-performance financial data marts.', 'DM', '#059669', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-103', 'FinTech Orbit Systems', 'careers@fintechorbit.com', 'Karthik Raja', '9876543222', 'https://fintechorbit.com', 'FinTech', '501-1000 Employees', 'Chennai, Tamil Nadu (Onsite)', 'FinTech Orbit powers ultra-low latency transaction processing, digital banking gateways, and ACID microservices for tier-1 financial institutions.', 'FO', '#d97706', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-104', 'NextGen Digital Labs', 'talent@nextgendigital.io', 'Ananya Iyer', '9876543223', 'https://nextgendigital.io', 'Digital Transformation', '100-250 Employees', 'Bengaluru, Karnataka (Remote)', 'NextGen Digital designs cutting-edge web user interfaces, cloud portals, and developer experience tools.', 'ND', '#dc2626', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-105', 'Apex Infotech Services', 'hr@apexinfotech.com', 'Rohan Mehta', '9876543224', 'https://apexinfotech.com', 'Database & Enterprise Solutions', '500-1000 Employees', 'Pune, Maharashtra (Hybrid)', 'Apex Infotech provides enterprise database optimization, cloud migration, and secure multi-tier infrastructure.', 'AI', '#0284c7', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-106', 'Synthetix AI Systems', 'careers@synthetix.ai', 'Sneha Kapoor', '9876543225', 'https://synthetix.ai', 'Artificial Intelligence', '50-100 Employees', 'Remote, India', 'Synthetix develops asynchronous Python microservices, distributed model serving APIs, and intelligent copilots.', 'SX', '#7c3aed', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-107', 'Zoho Enterprise Cloud', 'recruitment@zoho.com', 'Arun Kumar', '9876543226', 'https://zoho.com', 'Enterprise Cloud & SaaS', '10000+ Employees', 'Chennai, Tamil Nadu (Onsite)', 'Zoho builds a comprehensive suite of cloud business applications, serving over 100 million users globally.', 'ZE', '#ea580c', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER'),
('comp-108', 'ThoughtWorks Engineering', 'campus@thoughtworks.com', 'Divya Nair', '9876543227', 'https://thoughtworks.com', 'Agile Software Consultancy', '5000+ Employees', 'Bengaluru, Karnataka (Hybrid)', 'ThoughtWorks is a leading global technology consultancy that integrates strategy, design, and engineering.', 'TW', '#0d9488', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'ROLE_RECRUITER')
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);

-- 3. Seed Recruiters
INSERT INTO recruiters (id, company_id, full_name, email, phone, designation, password_hash, role, bio)
VALUES
('rec-101', 'comp-101', 'Priya Sharma', 'recruiter@cloudscale.io', '9876543220', 'Head of Campus Talent Acquisition', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'Admin', 'Directing campus talent acquisition for CloudScale Solutions. Focused on cloud platforms and distributed systems engineering talent.'),
('rec-102', 'comp-102', 'Vikramaditya Verma', 'hiring@datamatrix.ai', '9876543221', 'Lead Technical Recruiter', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'HR Manager', 'Leading talent sourcing across Big Data, AI pipelines, and distributed analytics.'),
('rec-103', 'comp-103', 'Karthik Raja', 'careers@fintechorbit.com', '9876543222', 'Talent Acquisition Specialist', '$2a$12$e8ZbzKk11s5P2rB6tGhy8eW2Nl8C0Bw9KxP3u4V7m8A9B0C1D2E3F', 'Recruiter', 'Specializing in hiring Java and high-performance backend engineers for payment systems.')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 4. Seed Master Skills Catalog
INSERT INTO skills (skill_name, category, icon_class, description) VALUES
('Java', 'Backend', 'bi-cup-hot-fill', 'Core Java, OOP principles, Collections, Concurrency and JVM fundamentals.'),
('Spring Boot', 'Backend', 'bi-gear-wide-connected', 'Production-grade enterprise Java REST APIs, Spring Security, and JPA.'),
('Python', 'Backend', 'bi-filetype-py', 'Python scripting, asynchronous APIs, FastAPI, and data manipulation.'),
('MySQL', 'Database', 'bi-database-fill', 'Relational database architecture, complex SQL queries, and transaction tuning.'),
('JavaScript', 'Frontend', 'bi-filetype-js', 'Modern ECMAScript (ES6+), DOM manipulation, async/await, and APIs.'),
('HTML5', 'Frontend', 'bi-filetype-html', 'Semantic web structure, accessibility, and modern responsive elements.'),
('CSS3', 'Frontend', 'bi-filetype-css', 'Flexbox, CSS Grid, animations, and Bootstrap responsive frameworks.'),
('REST APIs', 'Backend', 'bi-cloud-arrow-up-fill', 'RESTful architectural constraints, HTTP status codes, and JSON payload modeling.'),
('Git', 'General', 'bi-git', 'Distributed version control, branch management, pull requests, and merge resolution.'),
('Docker', 'Cloud', 'bi-box-seam-fill', 'Containerization, Dockerfile authoring, and multi-container Docker Compose.'),
('Data Structures', 'Core', 'bi-diagram-3-fill', 'Arrays, linked lists, stacks, queues, hash maps, trees, and algorithmic complexity.'),
('FastAPI', 'Backend', 'bi-lightning-charge-fill', 'High-performance modern Python web framework based on standard type hints.'),
('Database Design', 'Database', 'bi-table', 'Normalization (1NF to BCNF), indexing strategy, and ER modeling.')
ON DUPLICATE KEY UPDATE category=VALUES(category);

-- 5. Seed Candidate Verified Skills
INSERT IGNORE INTO student_skills (student_id, skill_name, proficiency_level, is_verified) VALUES
('stud-101', 'Java', 'Advanced', TRUE),
('stud-101', 'Spring Boot', 'Advanced', TRUE),
('stud-101', 'MySQL', 'Advanced', TRUE),
('stud-101', 'Python', 'Intermediate', TRUE),
('stud-101', 'JavaScript', 'Intermediate', TRUE),
('stud-101', 'HTML5', 'Advanced', TRUE),
('stud-101', 'CSS3', 'Advanced', TRUE),
('stud-101', 'REST APIs', 'Advanced', TRUE),
('stud-101', 'Git', 'Advanced', TRUE),
('stud-101', 'Data Structures', 'Intermediate', TRUE);

-- 6. Seed Assessments Catalog
INSERT INTO assessments (id, title, technology, category, difficulty, duration_minutes, total_questions, passing_percentage, description, icon_class, badge_color) VALUES
('assess-java', 'Java Core & OOP Assessment', 'Java', 'Backend', 'Intermediate', 10, 10, 70, 'Evaluates OOP concepts, Collections Framework, Multithreading, and Exception Handling.', 'bi-cup-hot-fill', '#4f46e5'),
('assess-spring', 'Spring Boot & Microservices Test', 'Spring Boot', 'Backend', 'Advanced', 15, 12, 70, 'Tests RESTful APIs, Spring Security OAuth2/JWT, and Spring Data JPA repositories.', 'bi-gear-wide-connected', '#059669'),
('assess-python', 'Python Programming & Scripting', 'Python', 'Backend', 'Intermediate', 10, 10, 70, 'Assesses Python syntax, data structures, generator expressions, and file I/O.', 'bi-filetype-py', '#d97706'),
('assess-mysql', 'Relational Database & SQL Tuning', 'MySQL', 'Database', 'Intermediate', 10, 10, 70, 'Focuses on DDL/DML, complex JOIN operations, ACID transactions, and query plans.', 'bi-database-fill', '#0284c7'),
('assess-web', 'Modern Web Development (HTML/CSS/JS)', 'JavaScript', 'Frontend', 'Intermediate', 12, 10, 70, 'Validates modern ES6+ JavaScript, responsive layouts, and REST API integration.', 'bi-filetype-js', '#7c3aed')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 7. Seed Assessment Results
INSERT INTO assessment_results (id, student_id, assessment_id, technology, score, total_questions, percentage, proficiency_tier, time_taken_seconds, certificate_code)
VALUES
('res-101', 'stud-101', 'assess-java', 'Java', 9, 10, 90, 'Master', 360, 'SKB-CERT-JAVA-2026-90'),
('res-102', 'stud-101', 'assess-spring', 'Spring Boot', 9, 10, 90, 'Master', 420, 'SKB-CERT-SB-2026-90'),
('res-103', 'stud-101', 'assess-mysql', 'MySQL', 8, 10, 80, 'Proficient', 310, 'SKB-CERT-SQL-2026-80')
ON DUPLICATE KEY UPDATE score=VALUES(score);

-- 8. Seed Internships (Linked to verified Companies via company_id)
INSERT INTO internships (id, company_id, posted_by, title, company_name, company_logo_text, logo_bg_color, domain, workplace_mode, location, stipend_amount, stipend_display, duration, openings_count, application_deadline, description, eligibility_criteria) VALUES
('int-101', 'comp-101', 'rec-101', 'Full Stack Java Developer Intern', 'CloudScale Solutions', 'CS', '#4f46e5', 'Backend', 'Hybrid', 'Bengaluru, Karnataka (Hybrid)', 35000, '₹35,000 / month', '6 Months', 4, '2026-11-30', 'Join CloudScale\'s SaaS engineering team to develop high-throughput microservices using Spring Boot, optimize relational MySQL databases, and write modular RESTful endpoints.', 'B.E. / B.Tech in CSE, IT (2025/2026 graduating batch) with minimum 7.0 CGPA.'),
('int-102', 'comp-102', 'rec-102', 'Python & Data Engineering Intern', 'DataMatrix Analytics', 'DM', '#059669', 'Data', 'Remote', 'Hyderabad, Telangana (Remote)', 38000, '₹38,000 / month', '6 Months', 3, '2026-12-05', 'Assist in architecting automated batch and streaming data pipelines, writing performant SQL transformations, and preparing data structures for machine learning and BI dashboards.', 'B.E. / B.Tech / M.C.A. with strong background in Python scripting and SQL queries.'),
('int-103', 'comp-103', 'rec-103', 'Backend Engineering Intern (Spring Boot)', 'FinTech Orbit Systems', 'FO', '#d97706', 'Backend', 'On-site', 'Chennai, Tamil Nadu (Onsite)', 40000, '₹40,000 / month', '6 Months', 5, '2026-12-02', 'Contribute to secure payment gateways and core transaction processing microservices, ensuring sub-50ms latency and high ACID transaction consistency.', 'B.E. / B.Tech with proficient knowledge of Java collections, OOP, and multi-threading.'),
('int-104', 'comp-104', NULL, 'Frontend Web Developer Intern', 'NextGen Digital Labs', 'ND', '#dc2626', 'Frontend', 'Remote', 'Bengaluru, Karnataka (Remote)', 30000, '₹30,000 / month', '3 Months', 2, '2026-12-10', 'Build clean, accessible, and responsive user interfaces for student career portals, collaborate with UI/UX designers, and integrate dynamic RESTful APIs.', 'Proficient in modern JavaScript (ES6+), semantic HTML5, CSS3, and Bootstrap 5.'),
('int-105', 'comp-105', NULL, 'Database Administrator & SQL Intern', 'Apex Infotech Services', 'AI', '#0284c7', 'Database', 'Hybrid', 'Pune, Maharashtra (Hybrid)', 32000, '₹32,000 / month', '6 Months', 2, '2026-12-15', 'Work closely with senior DBAs to analyze query execution plans, design indexing architectures, monitor deadlock occurrences, and configure automated backups.', 'Strong knowledge of relational algebra, ACID properties, and SQL execution tuning.'),
('int-106', 'comp-106', NULL, 'Junior Python Backend Intern', 'Synthetix AI Systems', 'SX', '#7c3aed', 'Backend', 'Remote', 'Remote, India', 36000, '₹36,000 / month', '4 Months', 3, '2026-12-18', 'Design low-latency asynchronous API services using Python and FastAPI, manage database models with SQLAlchemy, and integrate Redis caching layers.', 'Computer science students with hands-on Python backend projects and REST API architecture knowledge.'),
('int-107', 'comp-107', NULL, 'Full Stack Web Developer Intern', 'Zoho Enterprise Cloud', 'ZE', '#ea580c', 'FullStack', 'On-site', 'Chennai, Tamil Nadu (Onsite)', 42000, '₹42,000 / month', '6 Months', 6, '2026-12-08', 'Develop end-to-end enterprise collaboration modules, bridging clean Java Spring Boot REST APIs with responsive, interactive web interfaces.', 'B.E./B.Tech graduates with solid foundation in Data Structures, Java, and JavaScript.'),
('int-108', 'comp-108', NULL, 'Cloud & DevOps Associate Intern', 'ThoughtWorks Engineering', 'TW', '#0d9488', 'DevOps', 'Hybrid', 'Bengaluru, Karnataka (Hybrid)', 45000, '₹45,000 / month', '6 Months', 2, '2026-12-12', 'Work with agile infrastructure teams to automate CI/CD build pipelines, manage containerized services, and monitor cloud server reliability.', 'Candidates with knowledge of Linux shell commands, Git version control, and container fundamentals.')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 8b. Seed Required Skills
INSERT IGNORE INTO internship_required_skills (internship_id, skill_name) VALUES
('int-101', 'Java'), ('int-101', 'Spring Boot'), ('int-101', 'MySQL'), ('int-101', 'REST APIs'), ('int-101', 'Git'),
('int-102', 'Python'), ('int-102', 'MySQL'), ('int-102', 'Pandas'), ('int-102', 'ETL Pipelines'), ('int-102', 'Git'),
('int-103', 'Java'), ('int-103', 'Spring Boot'), ('int-103', 'MySQL'), ('int-103', 'Docker'), ('int-103', 'Data Structures'),
('int-104', 'JavaScript'), ('int-104', 'HTML5'), ('int-104', 'CSS3'), ('int-104', 'Bootstrap'), ('int-104', 'REST APIs'),
('int-105', 'MySQL'), ('int-105', 'Database Design'), ('int-105', 'Performance Tuning'), ('int-105', 'Python'),
('int-106', 'Python'), ('int-106', 'FastAPI'), ('int-106', 'MySQL'), ('int-106', 'REST APIs'), ('int-106', 'Git'),
('int-107', 'Java'), ('int-107', 'Spring Boot'), ('int-107', 'JavaScript'), ('int-107', 'HTML5'), ('int-107', 'MySQL'),
('int-108', 'Docker'), ('int-108', 'Git'), ('int-108', 'Python'), ('int-108', 'Linux'), ('int-108', 'REST APIs');

-- 8c. Seed Responsibilities
INSERT IGNORE INTO internship_responsibilities (internship_id, responsibility_text, display_order) VALUES
('int-101', 'Design and implement REST APIs using Spring Boot and Spring Data JPA.', 1),
('int-101', 'Collaborate on database schema design, index optimization, and transaction management in MySQL.', 2),
('int-101', 'Write robust unit and integration tests using JUnit 5 and Mockito.', 3),
('int-101', 'Participate in daily Agile scrums, Git code reviews, and Dockerized local deployments.', 4),
('int-103', 'Implement secure Spring Security OAuth2 and JWT authentication filters.', 1),
('int-103', 'Benchmark database queries and tune execution plans under high concurrency.', 2),
('int-103', 'Containerize microservices using Docker and configure local Docker Compose environments.', 3),
('int-103', 'Resolve latency bottlenecks and participate in system load testing.', 4);

-- 8d. Seed Perks
INSERT IGNORE INTO internship_perks (internship_id, perk_text) VALUES
('int-101', 'Pre-Placement Offer (PPO) opportunity based on performance'),
('int-101', 'Flexible hybrid schedule (2 days remote)'),
('int-101', 'Senior engineering mentorship'),
('int-101', 'Certificate of Completion'),
('int-103', 'Competitive stipend in FinTech domain'),
('int-103', 'Free catered lunch and shuttle transport'),
('int-103', 'Fast-track full-time offer review');

-- 9. Seed Synchronized Candidate Applications
INSERT INTO applications (id, student_id, internship_id, status, ai_match_score, applied_at, interview_date, interview_link, offer_details, notes) VALUES
('app-201', 'stud-101', 'int-101', 'Interview Scheduled', 94, '2026-11-16 10:30:00', '25 Nov 2026 • 11:00 AM IST', 'https://meet.google.com/abc-skillbridge-demo', NULL, 'Candidate cleared technical screening with 90% Java assessment score. Live coding interview is scheduled on Google Meet.'),
('app-202', 'stud-101', 'int-102', 'Shortlisted', 91, '2026-11-14 14:15:00', 'Expected 28 Nov 2026', 'https://zoom.us/j/skillbridge-datamatrix', NULL, 'Candidate shortlisted for technical round. Recruitment team is currently finalizing interview panel availability for next week.'),
('app-203', 'stud-101', 'int-104', 'Selected', 97, '2026-11-10 09:45:00', 'Completed 18 Nov 2026', NULL, 'Stipend: ₹30,000 / month • Duration: 3 Months • Joining: 15 Dec 2026', 'Congratulations! Official offer letter released with ₹30,000/mo stipend. Orientation starts 15 Dec 2026.'),
('app-204', 'stud-101', 'int-103', 'Under Review', 88, '2026-11-19 11:00:00', NULL, NULL, NULL, 'Your resume and verified Spring Boot assessment credentials are under evaluation by the backend engineering team.'),
('app-205', 'stud-101', 'int-107', 'Applied', 90, '2026-11-20 08:30:00', NULL, NULL, NULL, 'Application received and queued for HR screening. You will receive an update within 5 business days.'),
('app-206', 'stud-101', 'int-105', 'Rejected', 82, '2026-11-02 16:20:00', NULL, NULL, NULL, 'Thank you for taking the time to apply. For this cohort, the team moved forward with candidates who had direct production NoSQL experience.')
ON DUPLICATE KEY UPDATE status=VALUES(status), notes=VALUES(notes);

-- 10. Seed Interviews Table (Detailed relational interview schedules)
INSERT INTO interviews (id, application_id, student_id, internship_id, recruiter_id, round_type, interview_date, interview_time, interview_mode, meeting_link, interviewer_name, interviewer_email, status, technical_score, recommendation, feedback_notes)
VALUES
('intv-301', 'app-201', 'stud-101', 'int-101', 'rec-101', 'Technical Round 1 (Spring Boot & MySQL)', '2026-11-25', '11:00:00', 'Google Meet', 'https://meet.google.com/abc-skillbridge-demo', 'Priya Sharma & Backend Lead', 'recruiter@cloudscale.io', 'Scheduled', NULL, NULL, 'Live coding round on Spring Boot, JPA entities, and database transactions.'),
('intv-302', 'app-203', 'stud-101', 'int-104', NULL, 'Technical & Portfolio Review', '2026-11-18', '14:00:00', 'Google Meet', 'https://meet.google.com/nextgen-interview', 'Ananya Iyer', 'talent@nextgendigital.io', 'Completed', 9, 'Strong Hire', 'Demonstrated exceptional JavaScript, clean semantic HTML5, and responsive CSS execution.')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 11. Seed Offers Table (Official corporate offer records)
INSERT INTO offers (id, application_id, student_id, company_id, internship_id, recruiter_id, offered_role, monthly_stipend, duration, joining_date, expiry_date, work_location, terms_and_conditions, status, released_at)
VALUES
('ofr-401', 'app-203', 'stud-101', 'comp-104', 'int-104', NULL, 'Frontend Web Developer Intern', 30000, '3 Months', '2026-12-15', '2026-12-05', 'Bengaluru, Karnataka (Remote)', 'Offer contingent upon successful completion of university pre-final semester examinations and adherence to company code of conduct.', 'Accepted', '2026-11-20 12:00:00'),
('ofr-402', 'app-201', 'stud-101', 'comp-101', 'int-101', 'rec-101', 'Full Stack Java Developer Intern', 35000, '6 Months', '2026-12-20', '2026-12-10', 'Bengaluru, Karnataka (Hybrid)', 'Standard 6-month internship agreement with pre-placement review option based on performance metrics.', 'Draft', NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 12. Seed Messages Table (Recruiter <-> Candidate Two-Panel Messaging)
INSERT INTO messages (id, conversation_id, sender_type, recruiter_id, student_id, internship_id, message_text, is_read, created_at)
VALUES
('msg-501', 'conv-rec101-stud101', 'Recruiter', 'rec-101', 'stud-101', 'int-101', 'Hello Yazh! We were very impressed with your 90% score on the Java Core & OOP assessment and your Spring Boot projects.', TRUE, '2026-11-16 10:00:00'),
('msg-502', 'conv-rec101-stud101', 'Student', 'rec-101', 'stud-101', 'int-101', 'Thank you Priya! I really appreciate the feedback and I am excited about CloudScale\'s SaaS architecture.', TRUE, '2026-11-16 10:15:00'),
('msg-503', 'conv-rec101-stud101', 'Recruiter', 'rec-101', 'stud-101', 'int-101', 'We have scheduled your Technical Round for 25 Nov at 11:00 AM IST via Google Meet. Please make sure you have your local IDE ready for live coding.', TRUE, '2026-11-16 10:35:00'),
('msg-504', 'conv-rec101-stud101', 'Student', 'rec-101', 'stud-101', 'int-101', 'Confirmed! I have my environment set up with Java 21, Spring Boot, and MySQL ready. Looking forward to the discussion.', FALSE, '2026-11-16 10:40:00')
ON DUPLICATE KEY UPDATE message_text=VALUES(message_text);

-- 13. Seed Notifications Table (System Notifications)
INSERT INTO notifications (id, recipient_type, recipient_id, title, message, notification_type, reference_id, is_read)
VALUES
('notif-601', 'Student', 'stud-101', 'Interview Scheduled', 'Your Technical Round with CloudScale Solutions is scheduled for 25 Nov 2026 at 11:00 AM IST.', 'InterviewInvite', 'intv-301', FALSE),
('notif-602', 'Student', 'stud-101', 'Offer Letter Released', 'Congratulations! NextGen Digital Labs has released an official internship offer letter for Frontend Web Developer Intern.', 'OfferReleased', 'ofr-401', TRUE),
('notif-603', 'Student', 'stud-101', 'Skill Assessment Completed', 'You scored 90% in Java Core & OOP Assessment and earned the Master skill badge.', 'AssessmentComplete', 'res-101', TRUE),
('notif-604', 'Recruiter', 'rec-101', 'New Applicant', 'Yazh S applied for Full Stack Java Developer Intern with a 94% AI Skill Match Score.', 'ApplicationStatus', 'app-201', FALSE)
ON DUPLICATE KEY UPDATE title=VALUES(title);
