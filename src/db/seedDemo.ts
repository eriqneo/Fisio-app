import { db } from './schema';
import { authLib } from '../lib/auth';
import { 
  Patient, Appointment, SOAPNote, TreatmentPlan, 
  HEPProgram, Feedback, User, Tenant, ICD10_DIAGNOSES, TREATMENT_MODALITIES 
} from '../types';
import { subDays, addDays, format, startOfDay, setHours, setMinutes } from 'date-fns';

export async function seedDemoClinic() {
  const slug = 'restore-physio';
  
  return await db.transaction('rw', [
    db.tenants, db.users, db.patients, db.appointments, 
    db.soapNotes, db.treatmentPlans, db.hepPrograms, db.feedback, db.billingItems
  ], async () => {
    const existing = await db.tenants.where('slug').equals(slug).first();
    if (existing) {
      console.log('Restore Physio Clinic already exists. Skipping seed.');
      return;
    }

    console.log('Seeding Restore Physio Clinic...');

    // 1. Create Tenant
    const tenantId = await db.tenants.add({
      slug,
      name: 'Restore Physio Clinic',
      plan: 'pro',
      createdAt: Date.now()
    });

    const passwordHash = await authLib.hashPassword('password123');

    // 2. Create 3 Therapists
    const therapistsData: Omit<User, 'id'>[] = [
      {
        tenantId,
        name: 'Dr. Antonio Santos',
        email: 'antonio@restorephysio.com',
        passwordHash,
        role: 'therapist',
        workingHours: { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5, 6] } // Mon-Sat
      },
      {
        tenantId,
        name: 'Dr. Maria Clara Reyes',
        email: 'maria@restorephysio.com',
        passwordHash,
        role: 'therapist',
        workingHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] } // Mon-Fri
      },
      {
        tenantId,
        name: 'Dr. Juan Dela Cruz',
        email: 'juan@restorephysio.com',
        passwordHash,
        role: 'therapist',
        workingHours: { start: '10:00', end: '19:00', days: [2, 3, 4, 5, 6] } // Tue-Sat
      }
    ];

    const therapistIds = await Promise.all(therapistsData.map(t => db.users.add(t as User)));

    // 3. Create 25 Patients
    const firstNames = ['Jose', 'Juan', 'Andres', 'Emilio', 'Manuel', 'Corazon', 'Benigno', 'Rodrigo', 'Manny', 'Pia', 'Catriona', 'Lea', 'Vilma', 'Nora', 'Sharon', 'Vic', 'Joey', 'Tito', 'Kris', 'Anne', 'Marian', 'Dingdong', 'Kathryn', 'Daniel', 'Liza'];
    const lastNames = ['Rizal', 'Luna', 'Bonifacio', 'Aguinaldo', 'Quezon', 'Aquino', 'Duterte', 'Pacquiao', 'Wurtzbach', 'Gray', 'Salonga', 'Santos', 'Aunor', 'Cuneta', 'Sotto', 'de Leon', 'Curtis', 'Rivera', 'Dantes', 'Bernardo', 'Padilla', 'Soberano', 'Gil', 'Reid', 'Lustre'];
    
    const conditions = [
      { diag: 'Low Back Pain (M54.5)', history: 'Chronic LBP for 2 years, aggravated by sitting.' },
      { diag: 'Rotator Cuff Tear (M75.101)', history: 'Right shoulder pain after lifting heavy objects.' },
      { diag: 'ACL Post-Op (S83.241A)', history: 'Post-ACL reconstruction (Right), 4 weeks out.' },
      { diag: 'Cervicalgia (M54.2)', history: 'Neck stiffness and tension headaches due to desk work.' },
      { diag: 'Plantar Fasciitis (M72.2)', history: 'Sharp heel pain in the morning, worse with first steps.' }
    ];

    const patientsData: Omit<Patient, 'id'>[] = Array.from({ length: 25 }).map((_, i) => {
      const condition = conditions[i % conditions.length];
      return {
        tenantId,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        dob: format(subDays(new Date(), 365 * (20 + (i % 50))), 'yyyy-MM-dd'),
        phone: `0917-${1000000 + i}`,
        email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}${i}@example.com`,
        type: (['NP', 'NR', 'Booked', 'WalkIn'][i % 4]) as any,
        insuranceInfo: i % 2 === 0 ? 'Maxicare' : 'PhilHealth / Intellicare',
        medicalHistory: condition.history,
        consentSigned: true,
        createdAt: subDays(new Date(), 40).getTime()
      };
    });

    const patientIds = await Promise.all(patientsData.map(p => db.patients.add(p as Patient)));

    // 4. Create 60 Appointments (past 30 days, next 14 days)
    const appointmentsData: Omit<Appointment, 'id'>[] = [];
    const now = new Date();
    
    for (let i = 0; i < 60; i++) {
      const isPast = i < 45; // More past appointments to link SOAP notes
      const dayOffset = isPast ? -Math.floor(Math.random() * 30) : Math.floor(Math.random() * 14);
      const patientId = patientIds[i % patientIds.length];
      const therapistId = therapistIds[i % therapistIds.length];
      
      const date = addDays(startOfDay(now), dayOffset);
      const hour = 8 + (i % 10);
      const startTime = setHours(date, hour).getTime();
      const endTime = startTime + 3600000; // 1 hour duration

      appointmentsData.push({
        tenantId,
        patientId,
        therapistId,
        startTime,
        endTime,
        status: isPast ? 'completed' : 'scheduled',
        type: i % 5 === 0 ? 'Initial Assessment' : 'Follow-up Treatment',
        notes: isPast ? 'Patient responded well to manual therapy.' : 'Focus on strengthening exercises.'
      });
    }

    const appointmentIds = await Promise.all(appointmentsData.map(a => db.appointments.add(a as Appointment)));

    // 5. Create 40 SOAP Notes for completed appointments
    const completedAppointments = await db.appointments
      .where('tenantId').equals(tenantId)
      .and(a => a.status === 'completed')
      .limit(40)
      .toArray();

    const soapNotesData: Omit<SOAPNote, 'id'>[] = completedAppointments.map((app, i) => {
      const patient = patientsData[patientIds.indexOf(app.patientId)];
      const diag = patient.medicalHistory.split(',')[0];
      
      return {
        tenantId,
        appointmentId: app.id!,
        patientId: app.patientId,
        therapistId: app.therapistId,
        subjective: `Patient reports ${diag.toLowerCase()}. Pain level is ${4 + (i % 4)}/10. Feeling slightly better after previous session.`,
        objective: `ROM: Flexion ${100 + (i % 20)}°, Extension ${30 + (i % 10)}°. Palpation reveals trigger points in paraspinal muscles. Strength 4/5.`,
        assessment: `Patient shows progress in mobility. ${diag} is resolving but still requires stabilization exercises.`,
        plan: `Continue manual therapy (Grade II/III mobilization). Progress HEP to include eccentric loading. Next session in 3 days.`,
        createdAt: app.startTime + 3600000,
        updatedAt: app.startTime + 3600000
      };
    });

    await db.soapNotes.bulkAdd(soapNotesData as SOAPNote[]);

    // 6. Create 15 Treatment Plans
    const treatmentPlansData: Omit<TreatmentPlan, 'id'>[] = Array.from({ length: 15 }).map((_, i) => {
      const patientId = patientIds[i];
      return {
        tenantId,
        patientId,
        modalities: TREATMENT_MODALITIES.slice(0, 2 + (i % 5)),
        goals: '1. Reduce pain to 2/10. 2. Increase ROM by 20%. 3. Return to ADLs without discomfort.',
        progressNotes: ['Initial assessment completed.', 'Patient showing good compliance with HEP.'],
        status: 'active'
      };
    });

    await db.treatmentPlans.bulkAdd(treatmentPlansData as TreatmentPlan[]);

    // 7. Create 10 HEP Programs
    const hepProgramsData: Omit<HEPProgram, 'id'>[] = Array.from({ length: 10 }).map((_, i) => {
      const patientId = patientIds[i];
      return {
        tenantId,
        patientId,
        exercises: [
          { id: 'ex1', name: 'Cat-Cow Stretch', description: 'On all fours, arch and round your back.', sets: 3, reps: 10, frequency: 'Daily' },
          { id: 'ex2', name: 'Bird-Dog', description: 'Opposite arm and leg extension.', sets: 3, reps: 12, frequency: 'Daily' },
          { id: 'ex3', name: 'Plank', description: 'Hold core tight in pushup position.', sets: 3, reps: 30, frequency: 'Daily', notes: 'Hold for 30 seconds.' }
        ],
        adherenceLog: {
          [format(subDays(now, 1), 'yyyy-MM-dd')]: 'Yes',
          [format(subDays(now, 2), 'yyyy-MM-dd')]: 'Partially'
        }
      };
    });

    await db.hepPrograms.bulkAdd(hepProgramsData as HEPProgram[]);

    // 8. Create 30 Feedback entries
    const feedbackData: Omit<Feedback, 'id'>[] = completedAppointments.slice(0, 30).map((app, i) => {
      return {
        tenantId,
        patientId: app.patientId,
        sessionId: app.id!,
        ratings: { Overall: 4 + (i % 2), Therapist: 5, Facility: 4 + (i % 2), 'Ease of Booking': 4 },
        comments: i % 3 === 0 ? 'Very professional staff.' : 'Feeling much better after the session.',
        submittedAt: app.startTime + 7200000
      };
    });

    await db.feedback.bulkAdd(feedbackData as Feedback[]);

    // 9. Create Billing Items
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

    console.log('Restore Physio Clinic seeded successfully!');
  });
}
