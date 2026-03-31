import { db } from './schema';
import { authLib } from '../lib/auth';
import { seedDemoClinic } from './seedDemo';

let isSeeding = false;

export async function createDemoTenant() {
  if (isSeeding) return;
  isSeeding = true;

  try {
    // Seed the original demo tenant
    await seedOriginalDemo();
    
    // Seed the new Restore Physio Clinic
    await seedDemoClinic();
  } finally {
    isSeeding = false;
  }
}

async function seedOriginalDemo() {
  return await db.transaction('rw', [
    db.tenants, db.users, db.patients, db.appointments, 
    db.notifications, db.feedback, db.auditLogs,
    db.doctors, db.clinicalEncounters, db.physicalExaminations, db.clinicalImpressions,
    db.billingItems
  ], async () => {
    // Check if demo tenant already exists
    const existing = await db.tenants.where('slug').equals('demo').first();
    if (existing) return;

    console.log('Seeding demo tenant...');

    // 1. Create Tenant
    const tenantId = await db.tenants.add({
      slug: 'demo',
      name: 'PhysioFlow Demo Clinic',
      plan: 'pro',
      createdAt: Date.now()
    });

    // 2. Create Users
    const passwordHash = await authLib.hashPassword('password123');
    
    await db.users.bulkAdd([
      {
        tenantId,
        name: 'Admin User',
        email: 'admin@demo.com',
        passwordHash,
        role: 'admin'
      },
      {
        tenantId,
        name: 'Sarah Therapist',
        email: 'sarah@demo.com',
        passwordHash,
        role: 'therapist',
        workingHours: {
          start: '09:00',
          end: '17:00',
          lunchStart: '12:00',
          lunchEnd: '13:00',
          days: [1, 2, 3, 4, 5]
        }
      },
      {
        tenantId,
        name: 'John Receptionist',
        email: 'john@demo.com',
        passwordHash,
        role: 'receptionist'
      },
      {
        tenantId,
        name: 'Dr. Sarah Smith',
        email: 'doctor@demo.com',
        passwordHash,
        role: 'doctor'
      }
    ]);

    // 3. Create Patients
    await db.patients.bulkAdd([
      {
        tenantId,
        firstName: 'Michael',
        lastName: 'Jordan',
        dob: '1963-02-17',
        phone: '555-0101',
        email: 'mj@example.com',
        type: 'Booked',
        insuranceInfo: 'Nike Health Plan',
        medicalHistory: 'Chronic knee issues',
        consentSigned: true,
        createdAt: Date.now()
      },
      {
        tenantId,
        firstName: 'Serena',
        lastName: 'Williams',
        dob: '1981-09-26',
        phone: '555-0202',
        email: 'serena@example.com',
        type: 'WalkIn',
        insuranceInfo: 'Grand Slam Insurance',
        medicalHistory: 'Shoulder strain',
        consentSigned: true,
        createdAt: Date.now()
      }
    ]);

    // 4. Create initial appointments
    const sarah = await db.users.where('email').equals('sarah@demo.com').first();
    const mj = await db.patients.where('email').equals('mj@example.com').first();
    
    if (sarah && mj) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await db.appointments.bulkAdd([
        {
          tenantId,
          patientId: mj.id!,
          therapistId: sarah.id!,
          startTime: today.getTime() + (9 * 3600000), // 9 AM
          endTime: today.getTime() + (10 * 3600000), // 10 AM
          status: 'scheduled',
          type: 'Initial Assessment (Telehealth)',
          notes: 'First session for knee issues'
        },
        {
          tenantId,
          patientId: mj.id!,
          therapistId: sarah.id!,
          startTime: today.getTime() + (11 * 3600000), // 11 AM
          endTime: today.getTime() + (12 * 3600000), // 12 AM
          status: 'arrived',
          type: 'Follow-up Treatment',
          notes: 'Regular checkup'
        }
      ]);
    }

    // 5. Create initial notifications
    const patient = await db.patients.where('tenantId').equals(tenantId).first();
    if (patient) {
      await db.notifications.bulkAdd([
        {
          tenantId,
          patientId: patient.id!,
          type: 'appointment_reminder',
          scheduledAt: Date.now() - 3600000, // 1 hour ago
          status: 'sent',
          sentAt: Date.now() - 3600000,
          message: 'Reminder: Your appointment is in 1 hour.',
          isRead: false
        },
        {
          tenantId,
          patientId: patient.id!,
          type: 'hep_reminder',
          scheduledAt: Date.now() - 7200000, // 2 hours ago
          status: 'sent',
          sentAt: Date.now() - 7200000,
          message: 'Time for your daily exercises!',
          isRead: true
        },
        {
          tenantId,
          patientId: patient.id!,
          type: 'follow_up_due',
          scheduledAt: Date.now() + 86400000, // Tomorrow
          status: 'pending',
          message: 'Your follow-up appointment is due tomorrow.',
          isRead: false
        }
      ]);
    }

    // 5. Create initial feedback
    await db.feedback.bulkAdd([
      {
        tenantId,
        patientId: patient.id!,
        sessionId: 1,
        ratings: { Overall: 5, Therapist: 5, Facility: 4, 'Ease of Booking': 5 },
        comments: 'Excellent service, Sarah was very helpful with my knee pain.',
        submittedAt: Date.now() - 86400000
      },
      {
        tenantId,
        patientId: patient.id!,
        sessionId: 2,
        ratings: { Overall: 4, Therapist: 4, Facility: 5, 'Ease of Booking': 3 },
        comments: 'Great treatment but the booking process was a bit slow.',
        submittedAt: Date.now() - 172800000
      }
    ]);

    // 6. Create initial audit logs
    const admin = await db.users.where('role').equals('admin').first();
    if (admin) {
      await db.auditLogs.bulkAdd([
        {
          tenantId,
          userId: admin.id!,
          userName: admin.name,
          action: 'login',
          entityType: 'user',
          details: 'Admin logged in from 192.168.1.1',
          timestamp: Date.now() - 3600000
        },
        {
          tenantId,
          userId: admin.id!,
          userName: admin.name,
          action: 'update',
          entityType: 'tenant_settings',
          details: 'Updated clinic working hours',
          timestamp: Date.now() - 7200000
        }
      ]);
    }

    // 7. Seed Doctor Module Data
    const doctorUser = await db.users.where('email').equals('doctor@demo.com').first();
    if (doctorUser && mj) {
      const doctorId = await db.doctors.add({
        tenantId,
        userId: doctorUser.id!,
        licenseNumber: 'MD-12345-PF',
        specialization: ['Orthopedic', 'Sports'],
        qualifications: [{ degree: 'MBBS', institution: 'Medical University', year: 2010 }],
        consultationFee: 150,
        availableSlots: []
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.clinicalEncounters.bulkAdd([
        {
          tenantId,
          patientId: mj.id!,
          doctorId,
          appointmentId: 1,
          encounterDate: today.getTime() + (9 * 3600000),
          encounterType: 'InitialConsultation',
          chiefComplaint: 'Acute lower back pain after lifting heavy boxes.',
          status: 'Draft'
        },
        {
          tenantId,
          patientId: mj.id!,
          doctorId,
          appointmentId: 2,
          encounterDate: today.getTime() + (14 * 3600000),
          encounterType: 'FollowUp',
          chiefComplaint: 'Review of knee progress.',
          status: 'Signed',
          signedAt: Date.now(),
          signedBy: doctorId
        }
      ]);

      // Add a physical exam for the first encounter
      await db.physicalExaminations.add({
        tenantId,
        encounterId: 1,
        patientId: mj.id!,
        doctorId,
        vitalSigns: {
          bp: '120/80',
          hr: 72,
          temp: 36.6,
          rr: 16,
          spo2: 98,
          weight: 85,
          height: 180,
          bmi: 26.2
        },
        generalAppearance: 'Healthy male in mild distress due to pain.',
        posture: 'Antalgic lean to the right.',
        gait: 'Slow, cautious.',
        neurologicalExam: {
          reflexes: 'Normal',
          sensation: 'Intact',
          motorPower: '5/5'
        },
        musculoskeletalExam: {
          palpation: 'Tenderness at L4-L5',
          rom: 'Limited flexion',
          strength: 'Good'
        }
      } as any);

      // Add a clinical impression
      await db.clinicalImpressions.add({
        tenantId,
        encounterId: 1,
        patientId: mj.id!,
        doctorId,
        primaryDiagnosis: {
          icd10Code: 'M54.5',
          description: 'Low back pain',
          onset: 'Acute',
          severity: 'Moderate'
        },
        differentialDiagnoses: ['Lumbar strain', 'Disc herniation'],
        prognosis: 'Good',
        prognosisNotes: 'Expected recovery in 4-6 weeks with physiotherapy.'
      } as any);

      // 8. Seed Billing Items
      await db.billingItems.bulkAdd([
        {
          tenantId,
          name: 'Initial Physiotherapy Consultation',
          description: 'Comprehensive initial assessment and treatment plan',
          price: 450.00,
          currency: 'BWP',
          category: 'Service'
        },
        {
          tenantId,
          name: 'Follow-up Treatment Session',
          description: 'Standard follow-up physiotherapy treatment',
          price: 350.00,
          currency: 'BWP',
          category: 'Service'
        },
        {
          tenantId,
          name: 'Home Visit Physiotherapy',
          description: 'Physiotherapy session conducted at patient home',
          price: 650.00,
          currency: 'BWP',
          category: 'Service'
        },
        {
          tenantId,
          name: 'Sports Massage (45 mins)',
          description: 'Focused sports massage for recovery',
          price: 400.00,
          currency: 'BWP',
          category: 'Service'
        },
        {
          tenantId,
          name: 'Dry Needling Add-on',
          description: 'Dry needling therapy as part of a session',
          price: 150.00,
          currency: 'BWP',
          category: 'Service'
        },
        {
          tenantId,
          name: 'Resistance Band (Medium)',
          description: 'Latex-free resistance band for home exercises',
          price: 85.00,
          currency: 'BWP',
          category: 'Product'
        },
        {
          tenantId,
          name: 'Kinesiology Tape (Roll)',
          description: 'High-quality kinesiology tape for support',
          price: 120.00,
          currency: 'BWP',
          category: 'Product'
        }
      ]);
    }

    console.log('Demo tenant seeded successfully!');
  });
}
