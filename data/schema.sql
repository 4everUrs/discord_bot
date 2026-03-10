-- ===============================
-- Student Management System Schema
-- Simple Grades Version
-- ===============================

-- 1. Students
CREATE TABLE Students (
    id INT PRIMARY KEY AUTO_INCREMENT,    -- internal DB primary key
    student_id INT NOT NULL UNIQUE,       -- manual student number
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE
);

-- 2. Classes
CREATE TABLE Classes (
    class_id INT PRIMARY KEY AUTO_INCREMENT,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL
);

-- 3. Subjects
CREATE TABLE Subjects (
    subject_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(50) NOT NULL
);

-- 4. Linking Classes and Subjects (Many-to-Many)
CREATE TABLE ClassSubjects (
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    PRIMARY KEY (class_id, subject_id),
    FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE CASCADE
);

-- 5. Enrollments (Students in Classes)
CREATE TABLE Enrollments (
    enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,   -- references Students.id
    class_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    FOREIGN KEY (student_id) REFERENCES Students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE
);

-- 6. Grades (simplified: prelim, midterm, final)
CREATE TABLE Grades (
    grade_id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL,   -- student-class link
    subject_id INT NOT NULL,      -- which subject
    prelim DECIMAL(5,2),          -- prelim grade (0-100)
    midterm DECIMAL(5,2),         -- midterm grade (0-100)
    finals DECIMAL(5,2),          -- final grade (0-100)
    FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES Subjects(subject_id) ON DELETE CASCADE,
    UNIQUE (enrollment_id, subject_id) -- ensures only one record per student per subject
);