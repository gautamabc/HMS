-- =====================================================
-- MediCore HMS - Complete Database
-- HOW TO RUN:
--   mysql -u root -p < database.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS medicore_hms;
USE medicore_hms;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log, billing_charges, bills, ipd_notes, 
  prescriptions, lab_orders, lab_tests, procedures, admissions, 
  opd_appointments, beds, patients, doctors, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── USERS ──
CREATE TABLE users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(20) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('admin','receptionist','doctor','lab','billing') NOT NULL,
  full_name      VARCHAR(120) NOT NULL,
  phone          VARCHAR(15),
  is_first_login TINYINT(1) DEFAULT 1,
  is_active      TINYINT(1) DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── PATIENTS ──
CREATE TABLE patients (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_code    VARCHAR(10) UNIQUE NOT NULL,
  name            VARCHAR(120) NOT NULL,
  age             INT NOT NULL,
  gender          ENUM('Male','Female','Other') NOT NULL,
  phone           VARCHAR(15),
  address         TEXT,
  blood_group     VARCHAR(5),
  doctor_id       INT,
  visit_type      ENUM('OPD','IPD') DEFAULT 'OPD',
  ref_source      VARCHAR(30) DEFAULT 'Walk-in',
  status          ENUM('Active','Admitted','Discharged') DEFAULT 'Active',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── BEDS ──
CREATE TABLE beds (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  bed_code     VARCHAR(10) UNIQUE NOT NULL,
  bed_type     ENUM('General','Semi-Private','Private','ICU') NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  status       ENUM('free','occupied','maintenance') DEFAULT 'free',
  patient_name VARCHAR(120)
);

-- ── OPD APPOINTMENTS ──
CREATE TABLE opd_appointments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id  INT NOT NULL,
  appt_date  DATE NOT NULL,
  appt_time  VARCHAR(10) NOT NULL,
  reason     TEXT,
  status     ENUM('Scheduled','Waiting','In Progress','Completed') DEFAULT 'Waiting',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

-- ── IPD ADMISSIONS ──
CREATE TABLE admissions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT NOT NULL,
  doctor_id      INT NOT NULL,
  bed_id         INT NOT NULL,
  admit_date     DATE NOT NULL,
  discharge_date DATE,
  reason         TEXT,
  status         ENUM('Admitted','Discharged') DEFAULT 'Admitted',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id),
  FOREIGN KEY (bed_id)     REFERENCES beds(id)
);

-- ── IPD NOTES ──
CREATE TABLE ipd_notes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  doctor_id    INT NOT NULL,
  note_date    DATE NOT NULL,
  observations TEXT,
  plan         TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)    REFERENCES users(id)
);

-- ── PRESCRIPTIONS ──
CREATE TABLE prescriptions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  doctor_id    INT NOT NULL,
  diagnosis    TEXT,
  medications  TEXT,
  instructions TEXT,
  followup_date DATE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

-- ── LAB TESTS MASTER ──
CREATE TABLE lab_tests (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  test_code VARCHAR(20) UNIQUE NOT NULL,
  test_name VARCHAR(100) NOT NULL,
  price     DECIMAL(10,2) NOT NULL
);

-- ── PROCEDURES MASTER ──
CREATE TABLE procedures (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- ── LAB ORDERS ──
CREATE TABLE lab_orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  test_id      INT NOT NULL,
  ordered_by   INT NOT NULL,
  result_text  TEXT,
  status       ENUM('Pending','In Progress','Completed') DEFAULT 'Pending',
  completed_at DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (test_id)    REFERENCES lab_tests(id),
  FOREIGN KEY (ordered_by) REFERENCES users(id)
);

-- ── BILLS ──
CREATE TABLE bills (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_mode VARCHAR(20),
  status       ENUM('Pending','Paid') DEFAULT 'Pending',
  paid_at      DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ── AUDIT LOG ──
CREATE TABLE audit_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  action      TEXT NOT NULL,
  entity_type VARCHAR(50),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================
-- SEED DATA
-- All passwords = username@2026  (bcrypt hashed)
-- =====================================================
INSERT INTO users (username, password_hash, role, full_name, phone, is_first_login) VALUES
('ADM001','$2b$10$YmFzZTY0ZW5jb2RlZA.Kzb2GqFz2NMJkFbBdOVJGNQQVkLpRqeK','admin','Admin Kumar','9000000000',0),
('REC102','$2b$10$YmFzZTY0ZW5jb2RlZA.Kzb2GqFz2NMJkFbBdOVJGNQQVkLpRqeK','receptionist','Priya Sharma','9000000001',1),
('DR104', '$2b$10$YmFzZTY0ZW5jb2RlZA.Kzb2GqFz2NMJkFbBdOVJGNQQVkLpRqeK','doctor','Dr. Rajesh Mehta','9000000002',0),
('LAB201','$2b$10$YmFzZTY0ZW5jb2RlZA.Kzb2GqFz2NMJkFbBdOVJGNQQVkLpRqeK','lab','Sunita Patel','9000000004',0),
('BIL301','$2b$10$YmFzZTY0ZW5jb2RlZA.Kzb2GqFz2NMJkFbBdOVJGNQQVkLpRqeK','billing','Arun Verma','9000000005',0);

INSERT INTO lab_tests (test_code, test_name, price) VALUES
('CBC','Complete Blood Count',250),('LFT','Liver Function Test',400),
('LIPID','Lipid Profile',350),('BS','Blood Sugar',150),
('TFT','Thyroid Function Test',500),('URINE','Urine Routine',100),
('KFT','Kidney Function Test',450),('HBA1C','HbA1c',350);

INSERT INTO procedures (name, price) VALUES
('ECG',200),('X-Ray Chest',350),('USG Abdomen',1200),('2D Echo',2500);

INSERT INTO beds (bed_code, bed_type, price_per_day) VALUES
('G-01','General',500),('G-02','General',500),('G-03','General',500),
('G-04','General',500),('G-05','General',500),('G-06','General',500),
('SP-01','Semi-Private',1200),('SP-02','Semi-Private',1200),('SP-03','Semi-Private',1200),
('P-01','Private',2500),('P-02','Private',2500),('P-03','Private',2500),
('ICU-01','ICU',5000),('ICU-02','ICU',5000);

INSERT INTO patients (patient_code, name, age, gender, phone, blood_group, doctor_id, visit_type, status) VALUES
('P1001','Anita Joshi',34,'Female','9876543210','B+',3,'OPD','Active'),
('P1002','Ramesh Kumar',58,'Male','9123456789','O+',3,'IPD','Admitted'),
('P1003','Sushma Rao',45,'Female','9988776655','A+',3,'OPD','Active'),
('P1004','Vijay Singh',29,'Male','9876512345','B-',3,'IPD','Admitted');

UPDATE beds SET status='occupied', patient_name='Ramesh Kumar' WHERE bed_code='G-04';
UPDATE beds SET status='occupied', patient_name='Vijay Singh'  WHERE bed_code='P-02';

INSERT INTO admissions (patient_id, doctor_id, bed_id, admit_date, reason) VALUES
(2, 3, (SELECT id FROM beds WHERE bed_code='G-04'), '2026-02-25', 'Chest pain'),
(4, 3, (SELECT id FROM beds WHERE bed_code='P-02'), '2026-02-24', 'Fracture');

INSERT INTO opd_appointments (patient_id, doctor_id, appt_date, appt_time, reason, status) VALUES
(1, 3, CURDATE(), '09:00', 'Fever & Cough', 'Waiting'),
(3, 3, CURDATE(), '09:30', 'BP Check-up', 'In Progress');

INSERT INTO audit_log (user_id, action, entity_type) VALUES
(1, 'Database initialized with seed data', 'system');

SELECT 'MediCore HMS database ready!' AS Result;
