const clinicalCases = [
  {
    id: 'cr-malaria-01',
    title: 'Fever in a malaria-endemic setting',
    focus: 'Fever / infectious disease',
    difficulty: 'Foundational',
    stages: [
      {
        id: 'presentation',
        title: '1. First assessment',
        prompt: 'A 22-year-old student presents with 2 days of fever, chills and headache. They live in a malaria-endemic area. What is the most appropriate early approach?',
        options: [
          'Assess severity, exposure history and test for malaria while considering other causes',
          'Assume malaria and skip assessment',
          'Order a lipid profile only',
          'Wait several days before taking vital signs'
        ],
        answer: 0,
        explanation: 'Start with a structured assessment, vital signs and relevant exposure history. In an endemic setting malaria should be considered and appropriately tested, while other causes of fever remain possible.'
      },
      {
        id: 'differential',
        title: '2. Differential diagnosis',
        prompt: 'Which additional information is most useful for narrowing the differential diagnosis?',
        options: [
          'Medication history, local exposures, focal symptoms and examination findings',
          'Favourite food only',
          'Shoe size',
          'Hair colour'
        ],
        answer: 0,
        explanation: 'History and examination should be directed toward infectious exposures, medications, focal symptoms and signs that distinguish different causes of fever.'
      },
      {
        id: 'investigation',
        title: '3. Investigation',
        prompt: 'If malaria is suspected, which investigation is appropriate where available?',
        options: [
          'A validated malaria diagnostic test such as microscopy or an appropriate rapid diagnostic test',
          'Chest X-ray for every patient regardless of symptoms',
          'Lipid profile as the primary test',
          'No diagnostic testing is ever useful'
        ],
        answer: 0,
        explanation: 'Malaria diagnosis can use microscopy or an appropriate rapid diagnostic test according to local protocols and availability.'
      },
      {
        id: 'reassessment',
        title: '4. Reassessment',
        prompt: 'The patient becomes confused and hypotensive. What should happen next?',
        options: [
          'Escalate urgently, reassess ABCs and treat this as a potentially severe illness',
          'Continue routine outpatient observation without reassessment',
          'Focus only on diet',
          'Delay care until the next day'
        ],
        answer: 0,
        explanation: 'Altered mental status and hypotension are danger signs. Urgent reassessment and escalation are required while the cause is investigated and treated under local clinical guidance.'
      }
    ]
  },
  {
    id: 'cr-asthma-01',
    title: 'Recurrent wheeze',
    focus: 'Respiratory',
    difficulty: 'Intermediate',
    stages: [
      {
        id: 'presentation',
        title: '1. Pattern recognition',
        prompt: 'A 19-year-old has recurrent episodes of wheeze, cough and chest tightness that vary over time. What diagnosis should be considered strongly?',
        options: ['Asthma', 'Appendicitis', 'Nephrotic syndrome', 'Iron deficiency'],
        answer: 0,
        explanation: 'Variable respiratory symptoms with variable expiratory airflow limitation are characteristic of asthma.'
      },
      {
        id: 'history',
        title: '2. Focused history',
        prompt: 'Which history feature is particularly useful?',
        options: [
          'Triggers, nocturnal symptoms, exercise symptoms and previous exacerbations',
          'Only the patient’s shoe size',
          'Favourite television programme',
          'Handedness alone'
        ],
        answer: 0,
        explanation: 'Triggers, symptom timing, exercise-related symptoms and previous exacerbations help characterize variable airway disease and risk.'
      },
      {
        id: 'investigation',
        title: '3. Objective assessment',
        prompt: 'Which approach can help demonstrate variable airflow limitation?',
        options: [
          'Appropriate spirometry or other validated objective respiratory testing',
          'Routine abdominal ultrasound only',
          'Serum sodium alone',
          'No objective assessment is ever useful'
        ],
        answer: 0,
        explanation: 'Objective respiratory testing can support diagnosis and should be interpreted with the clinical history and applicable guidelines.'
      },
      {
        id: 'reassessment',
        title: '4. Acute deterioration',
        prompt: 'The patient develops severe breathlessness and cannot speak comfortably in full sentences. What is the priority?',
        options: [
          'Urgent assessment of severity and escalation according to the acute asthma protocol',
          'Send the patient home without reassessment',
          'Delay assessment for 24 hours',
          'Offer only dietary advice'
        ],
        answer: 0,
        explanation: 'Severe breathlessness can indicate a significant exacerbation. Assess severity promptly and escalate according to local emergency guidance.'
      }
    ]
  }
];

export default clinicalCases;
