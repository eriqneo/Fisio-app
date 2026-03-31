/**
 * PhysioFlow Database Types & Interfaces
 */

export type EntityId = number;

export interface Tenant {
  id?: EntityId;
  slug: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
  createdAt: number;
}

export interface User {
  id?: EntityId;
  tenantId: EntityId;
  role: 'admin' | 'therapist' | 'receptionist' | 'patient' | 'doctor';
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  specialties?: string[];
  permissions?: string[];
  workingHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    lunchStart?: string; // "12:00"
    lunchEnd?: string;   // "13:00"
    days: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)
  };
  isDeleted?: boolean;
  requiresPasswordChange?: boolean;
  createdAt?: number;
}

export interface Patient {
  id?: EntityId;
  tenantId: EntityId;
  type: 'NP' | 'NR' | 'Booked' | 'WalkIn';
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  insuranceInfo: string;
  medicalHistory: string;
  consentSigned: boolean;
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    preferredReminderTime: string; // "08:00"
  };
  createdAt: number;
  isDeleted?: boolean;
}

export interface Appointment {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  therapistId: EntityId;
  startTime: number;
  endTime: number;
  arrivedAt?: number;
  status: 'scheduled' | 'arrived' | 'in-progress' | 'completed' | 'cancelled' | 'noShow';
  type: string;
  notes?: string;
  isDeleted?: boolean;
}

export interface SOAPNote {
  id?: EntityId;
  tenantId: EntityId;
  appointmentId: EntityId;
  patientId: EntityId;
  therapistId: EntityId;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10_2016_version?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface SOAPNoteDraft {
  id?: EntityId;
  tenantId: EntityId;
  appointmentId: EntityId;
  patientId: EntityId;
  therapistId: EntityId;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10_2016_version?: string;
  updatedAt: number;
}

export interface TreatmentPlan {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  modalities: string[]; // JSON array
  goals: string;
  progressNotes: string[]; // JSON array
  status: 'active' | 'completed' | 'on-hold';
  isDeleted?: boolean;
}

export interface HEPProgram {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  exercises: {
    id: string;
    name: string;
    description: string;
    sets: number;
    reps: number;
    frequency?: string;
    notes?: string;
    videoUrl?: string;
    imageUrl?: string;
    muscleGroup?: string;
  }[]; // JSON array
  adherenceLog: Record<string, 'Yes' | 'Partially' | 'No'>; // Date string -> status
  isDeleted?: boolean;
}

export interface Notification {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  type: 'appointment_reminder' | 'hep_reminder' | 'follow_up_due' | 'progress_report';
  scheduledAt: number;
  sentAt?: number;
  readAt?: number;
  isRead: boolean;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  isDeleted?: boolean;
}

export interface Feedback {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  sessionId: EntityId;
  ratings: Record<string, number>; // e.g., { "Overall": 5, "Therapist": 4 }
  comments: string;
  submittedAt: number;
  isDeleted?: boolean;
}

export interface ChatMessage {
  id?: EntityId;
  tenantId: EntityId;
  senderId: EntityId;
  receiverId: EntityId;
  content: string;
  timestamp: number;
  isRead: boolean;
  isDeleted?: boolean;
}

export interface ExerciseVideo {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  therapistId: EntityId;
  title: string;
  videoData: string; // base64 or object URL
  comments: {
    timestamp: number; // video time in seconds
    text: string;
    authorId: EntityId;
    authorName: string;
    createdAt: number;
  }[];
  createdAt: number;
  isDeleted?: boolean;
}

export interface AuditLog {
  id?: EntityId;
  tenantId: EntityId;
  userId: EntityId;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'export';
  entityType: string;
  entityId?: EntityId;
  details: string; // JSON string or text
  timestamp: number;
}

export interface SyncQueueItem {
  id?: EntityId;
  operation: 'create' | 'update' | 'delete';
  table: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export interface WaitlistEntry {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  preferredTherapistId?: EntityId;
  preferredDate?: string; // "YYYY-MM-DD"
  status: 'pending' | 'notified' | 'booked' | 'expired';
  createdAt: number;
  isDeleted?: boolean;
}

export interface PatientDocument {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  encounterId?: EntityId;
  name: string;
  type: string; // e.g. 'CT Scan', 'Lab Report', 'X-Ray'
  fileData: string; // base64
  mimeType: string;
  uploadedAt: number;
  isDeleted?: boolean;
}

/**
 * Billing Module Types
 */
export interface BillingItem {
  id?: EntityId;
  tenantId: EntityId;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  category: 'Service' | 'Product' | 'Other';
  isDeleted?: boolean;
}

export interface Invoice {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  appointmentId?: EntityId;
  invoiceNumber: string;
  currency?: string;
  items: {
    itemId: EntityId;
    name: string;
    quantity: number;
    price: number;
    total: number;
    icd10_2016_version?: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  dueDate: number;
  createdAt: number;
  isDeleted?: boolean;
}

export interface Receipt {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  appointmentId?: EntityId;
  invoiceId?: EntityId; // Link to invoice if this receipt pays an invoice
  receiptNumber: string;
  currency?: string;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Insurance';
  amount: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  createdAt: number;
  isDeleted?: boolean;
  notes?: string;
}

/**
 * Physiotherapy Doctor Profile
 */
export interface Doctor {
  id?: EntityId;
  tenantId: EntityId;
  userId: EntityId; // FK to users
  licenseNumber: string;
  specialization: ('Orthopedic' | 'Sports' | 'Neurological' | 'Pediatric' | 'Geriatric' | 'Cardiopulmonary')[];
  qualifications: {
    degree: string;
    institution: string;
    year: number;
  }[];
  signature?: string; // base64 dataURL
  stampImage?: string; // base64
  consultationFee: number;
  availableSlots?: string[]; // JSON array of time slots
  isDeleted?: boolean;
}

/**
 * Clinical Encounter - The root of a doctor's visit
 */
export interface ClinicalEncounter {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  appointmentId?: EntityId;
  encounterDate: number;
  encounterType: 'InitialConsultation' | 'FollowUp' | 'Referral' | 'Telehealth' | 'Emergency';
  chiefComplaint: string;
  icd10_2016_version?: string;
  status: 'Draft' | 'Signed' | 'Amended';
  signedAt?: number;
  signedBy?: EntityId;
  amendmentHistory?: {
    amendedAt: number;
    amendedBy: EntityId;
    reason: string;
    previousData: any;
  }[];
  isDeleted?: boolean;
}

/**
 * Comprehensive Medical History
 */
export interface MedicalHistory {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  recordedAt: number;
  presentingComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  pastSurgicalHistory: string;
  familyHistory: string;
  socialHistory: {
    occupation: string;
    lifestyle: string;
    smoking: 'Never' | 'Former' | 'Current';
    alcohol: 'None' | 'Occasional' | 'Regular';
    activityLevel: string;
  };
  allergies: {
    substance: string;
    reaction: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
  }[];
  currentMedications: {
    name: string;
    dose: string;
    frequency: string;
    prescribedBy?: string;
  }[];
  reviewOfSystems: Record<string, string>; // e.g. { "Cardiovascular": "Normal", "Respiratory": "Shortness of breath on exertion" }
}

/**
 * Detailed Physical Examination
 */
export interface PhysicalExamination {
  id?: EntityId;
  tenantId: EntityId;
  encounterId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  examinedAt: number;
  vitalSigns: {
    bp: string;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    weight: number;
    height: number;
    bmi: number;
  };
  generalAppearance: string;
  posture: string;
  gait: string;
  neurologicalExam: any; // JSON object
  musculoskeletalExam: Record<string, any>; // JSON per region
  specialTests: {
    testName: string;
    side: 'Left' | 'Right' | 'Bilateral' | 'N/A';
    result: string;
    interpretation: string;
  }[];
  functionalAssessment: string;
}

/**
 * Clinical Impression and Diagnosis
 */
export interface ClinicalImpression {
  id?: EntityId;
  tenantId: EntityId;
  encounterId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  primaryDiagnosis: {
    icd10Code: string;
    description: string;
    laterality: 'Left' | 'Right' | 'Bilateral' | 'N/A';
    severity: 'Mild' | 'Moderate' | 'Severe';
    onset: 'Acute' | 'Subacute' | 'Chronic';
  };
  differentialDiagnoses: string[];
  comorbidities: string[];
  functionalLimitations: string;
  prognosis: 'Excellent' | 'Good' | 'Fair' | 'Guarded' | 'Poor';
  prognosisNotes: string;
}

/**
 * Doctor's Orders
 */
export interface DoctorOrder {
  id?: EntityId;
  tenantId: EntityId;
  encounterId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  issuedAt: number;
  orderType: 'PhysioReferral' | 'Imaging' | 'LabWork' | 'Medication' | 'Orthotics' | 'Splinting' | 'SpecialistReferral';
  orderDetails: any; // JSON
  priority: 'Routine' | 'Urgent' | 'STAT';
  status: 'Pending' | 'Acknowledged' | 'InProgress' | 'Completed' | 'Cancelled';
  fulfilledBy?: EntityId;
  fulfilledAt?: number;
}

/**
 * Medical Prescription
 */
export interface Prescription {
  id?: EntityId;
  tenantId: EntityId;
  encounterId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  issuedAt: number;
  medications: {
    drugName: string;
    genericName: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    quantity: number;
    refills: number;
    instructions: string;
  }[];
  prescriptionNumber: string;
  dispensedAt?: number;
  dispensedBy?: string;
  status: 'Active' | 'Dispensed' | 'Cancelled' | 'Expired';
}

/**
 * Medical Certificate
 */
export interface MedicalCertificate {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  encounterId?: EntityId;
  issuedAt: number;
  certificateType: 'FitnessToWork' | 'SickLeave' | 'SportsClearance' | 'SchoolClearance' | 'InsuranceClaim' | 'DisabilityCert' | 'ReferralLetter';
  validFrom: number;
  validTo: number;
  restrictions: string;
  recommendations: string;
  certBody: string; // rich text
  signedAt: number;
  documentUrl?: string;
}

/**
 * Imaging Request
 */
export interface ImagingRequest {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  encounterId: EntityId;
  requestedAt: number;
  modality: 'XRay' | 'MRI' | 'CTScan' | 'Ultrasound' | 'DEXA' | 'EMG' | 'NCV';
  bodyPart: string;
  clinicalIndication: string;
  urgency: 'Routine' | 'Urgent' | 'STAT';
  results?: string; // text
  resultDate?: number;
  attachments?: string[]; // array of base64 or blob URLs
}

/**
 * Progress Report
 */
export interface ProgressReport {
  id?: EntityId;
  tenantId: EntityId;
  patientId: EntityId;
  doctorId: EntityId;
  reportDate: number;
  reportType: 'Interim' | 'Discharge' | 'Insurance' | 'MedicoLegal' | 'ReferralReply';
  functionalOutcomes: {
    painScore: number;
    romImprovements: string;
    strengthGains: string;
    functionalMilestones: string;
  };
  treatmentSummary: string;
  recommendationsForContinuedCare: string;
  returnToActivityDate?: number;
  reportBody: string; // rich text
  recipientName: string;
  recipientOrganization: string;
}

/**
 * Atomic Encounter Bundle for rendering/processing
 */
export interface EncounterBundle {
  encounter: ClinicalEncounter;
  medicalHistory?: MedicalHistory;
  physicalExam?: PhysicalExamination;
  clinicalImpression?: ClinicalImpression;
  orders: DoctorOrder[];
  prescriptions: Prescription[];
  imagingRequests: ImagingRequest[];
}

export const PERMISSIONS = [
  'view_patients',
  'manage_patients',
  'view_appointments',
  'manage_appointments',
  'view_billing',
  'manage_billing',
  'manage_staff',
  'view_audit_logs',
  'manage_settings',
  'view_medical_records',
  'manage_medical_records',
  'view_reports',
  'manage_reports'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'admin',
  'therapist',
  'receptionist',
  'doctor'
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],
  therapist: [
    'view_patients',
    'view_appointments',
    'manage_appointments',
    'view_medical_records',
    'manage_medical_records',
    'view_reports'
  ],
  receptionist: [
    'view_patients',
    'manage_patients',
    'view_appointments',
    'manage_appointments',
    'view_billing',
    'manage_billing'
  ],
  doctor: [
    'view_patients',
    'view_appointments',
    'manage_appointments',
    'view_medical_records',
    'manage_medical_records',
    'view_reports'
  ]
};
export const ICD10_DIAGNOSES = [
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M54.2', description: 'Cervicalgia (Neck pain)' },
  { code: 'M25.561', description: 'Pain in right knee' },
  { code: 'M25.562', description: 'Pain in left knee' },
  { code: 'M25.511', description: 'Pain in right shoulder' },
  { code: 'M25.512', description: 'Pain in left shoulder' },
  { code: 'M77.11', description: 'Lateral epicondylitis, right elbow (Tennis elbow)' },
  { code: 'M77.12', description: 'Lateral epicondylitis, left elbow' },
  { code: 'M75.101', description: 'Rotator cuff tear or rupture, right' },
  { code: 'M75.102', description: 'Rotator cuff tear or rupture, left' },
  { code: 'S83.241A', description: 'Other tear of medial meniscus, current injury, right knee' },
  { code: 'M76.811', description: 'Patellar tendinitis, right' },
  { code: 'M76.812', description: 'Patellar tendinitis, left' },
  { code: 'M79.601', description: 'Pain in right arm' },
  { code: 'M79.602', description: 'Pain in left arm' },
  { code: 'M79.641', description: 'Pain in right hand' },
  { code: 'M79.642', description: 'Pain in left hand' },
  { code: 'M79.671', description: 'Pain in right foot' },
  { code: 'M79.672', description: 'Pain in left foot' },
  { code: 'M25.551', description: 'Pain in right hip' },
  { code: 'M25.552', description: 'Pain in left hip' },
  { code: 'M54.16', description: 'Radiculopathy, lumbar region (Sciatica)' },
  { code: 'M54.12', description: 'Radiculopathy, cervical region' },
  { code: 'G56.01', description: 'Carpal tunnel syndrome, right upper limb' },
  { code: 'G56.02', description: 'Carpal tunnel syndrome, left upper limb' },
  { code: 'M72.2', description: 'Plantar fascial fibromatosis (Plantar fasciitis)' },
  { code: 'S93.411A', description: 'Sprain of calcaneofibular ligament, right ankle' },
  { code: 'M17.11', description: 'Unilateral primary osteoarthritis, right knee' },
  { code: 'M17.12', description: 'Unilateral primary osteoarthritis, left knee' },
  { code: 'M16.11', description: 'Unilateral primary osteoarthritis, right hip' },
  { code: 'M16.12', description: 'Unilateral primary osteoarthritis, left hip' },
];

export const TREATMENT_MODALITIES = [
  'Manual Therapy',
  'TENS',
  'EMS',
  'Ultrasound',
  'Heat',
  'Cold',
  'Traction',
  'Dry Needling',
  'Taping',
  'Laser',
  'Aquatic',
  'Therapeutic Exercises',
  'Neuromuscular Re-education',
  'Gait Training'
];
