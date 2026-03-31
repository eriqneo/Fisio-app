export const HPI_SUGGESTIONS = [
  { region: 'Spine', phrases: [
    'Patient reports gradual onset of dull aching pain in the lumbar region.',
    'Pain is localized to the lower back with occasional radiation to the right buttock.',
    'Symptoms are exacerbated by prolonged sitting and relieved by lying supine.',
    'Morning stiffness lasting approximately 30 minutes is reported.',
    'Sharp, stabbing pain experienced during trunk flexion.',
    'Patient describes a "locking" sensation in the cervical spine during rotation.',
    'Numbness and tingling noted in the L5 dermatome distribution.',
    'Pain intensity is rated as 6/10 at worst and 2/10 at best.',
    'Symptoms began after a lifting incident at work two weeks ago.',
    'Coughing or sneezing increases the intensity of the back pain.'
  ]},
  { region: 'Shoulder', phrases: [
    'Pain is felt primarily in the anterolateral aspect of the shoulder.',
    'Difficulty reaching overhead or behind the back due to sharp pain.',
    'Patient reports a "catching" sensation during mid-range abduction.',
    'Night pain is significant, often waking the patient from sleep.',
    'Weakness noted when attempting to lift heavy objects.',
    'Symptoms started after a fall onto an outstretched hand.',
    'Aching sensation persists after repetitive reaching activities.',
    'Pain radiates down the lateral arm to the elbow level.',
    'Shoulder feels "unstable" during certain movements.',
    'Crepitus is audible and palpable during circumduction.'
  ]},
  { region: 'Knee', phrases: [
    'Swelling and warmth noted around the knee joint after activity.',
    'Pain is localized to the medial joint line.',
    'Patient describes a "giving way" sensation during stairs.',
    'Stiffness is most prominent after periods of inactivity.',
    'Sharp pain behind the patella when squatting or lunging.',
    'Symptoms began following a twisting injury during sports.',
    'Knee feels "tight" and restricted in full extension.',
    'Aching pain increases with cold weather changes.',
    'Difficulty fully bending the knee due to posterior pressure.',
    'Locking episodes reported where the knee gets stuck in flexion.'
  ]},
  { region: 'Hip', phrases: [
    'Deep groin pain that increases with prolonged walking.',
    'Lateral hip pain that is tender to palpation over the trochanter.',
    'Patient reports a "clicking" or "snapping" sound in the hip.',
    'Difficulty putting on shoes and socks due to restricted ROM.',
    'Pain radiates into the anterior thigh but not below the knee.',
    'Symptoms are worse in the morning and improve with movement.',
    'Trendelenburg gait observed due to hip abductor weakness.',
    'Pain is sharp during sudden changes in direction.',
    'Hip feels stiff after sitting in a low chair.',
    'Aching sensation in the buttock region, worse with sitting.'
  ]},
  { region: 'Ankle/Foot', phrases: [
    'Sharp pain in the heel with the first few steps in the morning.',
    'Swelling around the lateral malleolus following an inversion injury.',
    'Aching along the Achilles tendon, worse with uphill walking.',
    'Numbness in the toes, suggestive of Morton\'s neuroma.',
    'Pain localized to the base of the 5th metatarsal.',
    'Ankle feels unstable on uneven surfaces.',
    'Burning sensation in the sole of the foot.',
    'Symptoms improve with supportive footwear.',
    'Difficulty with push-off phase of gait due to pain.',
    'Cramping in the arch of the foot during night.'
  ]}
];

export const TOP_MEDICATIONS = [
  { name: 'Ibuprofen', class: 'NSAID', warning: 'Caution with dry needling and deep tissue massage due to potential bruising.' },
  { name: 'Naproxen', class: 'NSAID', warning: 'Caution with dry needling and deep tissue massage due to potential bruising.' },
  { name: 'Aspirin', class: 'Analgesic/Anticoagulant', warning: 'Caution with dry needling and deep tissue massage due to potential bruising.' },
  { name: 'Warfarin', class: 'Anticoagulant', warning: 'Caution with dry needling and deep tissue massage. High risk of hematoma.' },
  { name: 'Rivaroxaban', class: 'Anticoagulant', warning: 'Caution with dry needling and deep tissue massage. High risk of hematoma.' },
  { name: 'Apixaban', class: 'Anticoagulant', warning: 'Caution with dry needling and deep tissue massage. High risk of hematoma.' },
  { name: 'Cyclobenzaprine', class: 'Muscle Relaxant', warning: 'May cause drowsiness; monitor patient during balance exercises.' },
  { name: 'Baclofen', class: 'Muscle Relaxant', warning: 'Monitor for hypotonia and fall risk.' },
  { name: 'Gabapentin', class: 'Anticonvulsant/Neuropathic', warning: 'May cause dizziness or ataxia.' },
  { name: 'Pregabalin', class: 'Anticonvulsant/Neuropathic', warning: 'May cause peripheral edema and dizziness.' },
  { name: 'Alendronate', class: 'Bisphosphonate', warning: 'Monitor for bone pain or atypical fractures.' },
  { name: 'Prednisone', class: 'Corticosteroid', warning: 'Long-term use may lead to tendon weakening and osteoporosis.' },
  { name: 'Methotrexate', class: 'DMARD', warning: 'Monitor for fatigue and joint swelling.' },
  { name: 'Tramadol', class: 'Opioid Analgesic', warning: 'Fall risk due to dizziness and sedation.' },
  { name: 'Oxycodone', class: 'Opioid Analgesic', warning: 'Significant fall risk and respiratory depression monitoring.' },
  { name: 'Metformin', class: 'Antidiabetic', warning: 'Monitor for hypoglycemia during intense exercise.' },
  { name: 'Lisinopril', class: 'ACE Inhibitor', warning: 'Monitor for orthostatic hypotension.' },
  { name: 'Atorvastatin', class: 'Statin', warning: 'Monitor for unexplained muscle pain or weakness (myopathy).' },
  { name: 'Levothyroxine', class: 'Thyroid Hormone', warning: 'Monitor heart rate during aerobic activity.' },
  { name: 'Amlodipine', class: 'Calcium Channel Blocker', warning: 'Monitor for peripheral edema.' }
];
