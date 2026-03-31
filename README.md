# PhysioFlow - Comprehensive Clinic Management System

## Overview
PhysioFlow is a modern, full-stack clinic management system designed specifically for physiotherapy and rehabilitation clinics. It streamlines patient intake, appointment scheduling, clinical documentation, and real-time patient flow monitoring.

## Key Features

### 1. Real-Time Patient Flow (Live Queue Board)
- **Dynamic Monitoring**: Real-time tracking of patient status (Waiting, In Progress, Completed).
- **Therapist-Specific Queues**: Each therapist has a dedicated column to manage their daily patient flow.
- **Clinical Review Workflow**: Doctors and therapists can "Start Review" directly from the queue, opening an integrated clinical notes area.
- **Wait Time Tracking**: Automatic calculation and display of patient wait times with visual alerts for long delays.

### 2. Clinical Documentation (Doctor's Module)
- **Clinical Encounters**: Structured documentation for initial consultations and follow-ups.
- **SOAP Notes**: Comprehensive Subjective, Objective, Assessment, and Plan notes.
- **Physical Examinations**: Detailed recording of vital signs, posture, gait, neurological, and musculoskeletal exams.
- **Clinical Impressions**: ICD-10 integrated diagnosis and prognosis tracking.
- **Digital Signing**: Secure signing and locking of clinical records.

### 3. Appointment & Schedule Management
- **Interactive Calendar**: Full-featured calendar for booking and managing appointments.
- **Therapist Schedules**: View and manage individual therapist working hours and availability.
- **Check-In System**: Receptionist-facing interface for arriving patients and moving them into the live queue.

### 4. Patient Engagement
- **Digital Intake**: Paperless patient registration and medical history collection.
- **Treatment Plans**: Goal-oriented treatment planning with progress tracking.
- **Home Exercise Programs (HEP)**: Interactive exercise builder with patient-facing views and adherence logging.
- **Telehealth**: Integrated video consultation capabilities with real-time chat.
- **Feedback System**: Automated patient satisfaction surveys and reporting.

### 5. Administrative Controls
- **Staff Management**: Role-based access control (Admin, Doctor, Therapist, Receptionist).
- **Audit Logs**: Comprehensive tracking of all system actions for security and compliance.
- **Clinic Settings**: Customizable clinic information, working hours, and branding.

## Technical Architecture
- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS.
- **State Management**: Zustand for global state and React Query for server-state/caching.
- **Database**: Dexie.js (IndexedDB) for robust client-side storage with multi-tenant support.
- **Styling**: Modern, responsive design using Tailwind CSS utility classes and Framer Motion for animations.
- **Icons**: Lucide-React for a consistent and crisp visual language.

## User Roles
- **Admin**: Full system access, staff management, and clinic configuration.
- **Doctor/Therapist**: Clinical documentation, queue management, and patient care.
- **Receptionist**: Appointment booking, patient check-in, and front-desk operations.
- **Patient**: Digital intake, HEP access, and telehealth consultations.

---
*PhysioFlow - Empowering clinics to deliver exceptional patient care.*
