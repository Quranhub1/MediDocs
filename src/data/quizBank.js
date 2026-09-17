export const QUIZ_PASS_PERCENT = 70;

const quizBank = [
  {
    id: 'anatomy-foundations',
    title: 'Anatomy Foundations',
    course: 'Anatomy',
    difficulty: 1,
    questions: [
      { id: 'af1', question: 'Which structure is the main site of gas exchange in the lungs?', options: ['Alveoli', 'Trachea', 'Pleura', 'Bronchi'], answer: 'Alveoli' },
      { id: 'af2', question: 'Which chamber pumps oxygenated blood into the systemic circulation?', options: ['Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle'], answer: 'Left ventricle' },
      { id: 'af3', question: 'Which bone is commonly called the collarbone?', options: ['Scapula', 'Clavicle', 'Sternum', 'Humerus'], answer: 'Clavicle' },
      { id: 'af4', question: 'What is the functional unit of the kidney?', options: ['Neuron', 'Nephron', 'Alveolus', 'Osteon'], answer: 'Nephron' },
      { id: 'af5', question: 'Which plane divides the body into left and right portions?', options: ['Transverse', 'Frontal', 'Sagittal', 'Oblique'], answer: 'Sagittal' }
    ]
  },
  {
    id: 'anatomy-understanding',
    title: 'Anatomy Understanding',
    course: 'Anatomy',
    difficulty: 2,
    questions: [
      { id: 'au1', question: 'Why does the left ventricular wall normally have more muscle than the right ventricular wall?', options: ['It pumps against higher systemic resistance', 'It receives less blood', 'It pumps only during exercise', 'It prevents venous return'], answer: 'It pumps against higher systemic resistance' },
      { id: 'au2', question: 'Which vessel carries oxygenated blood from the lungs toward the heart?', options: ['Pulmonary artery', 'Pulmonary vein', 'Superior vena cava', 'Coronary sinus'], answer: 'Pulmonary vein' },
      { id: 'au3', question: 'Which structure prevents food from entering the airway during swallowing?', options: ['Uvula', 'Epiglottis', 'Soft palate', 'Vocal cord'], answer: 'Epiglottis' },
      { id: 'au4', question: 'A patient has reduced nephron function. Which process would be directly affected?', options: ['Urine formation', 'Bile storage', 'Air filtration', 'Bone remodeling only'], answer: 'Urine formation' },
      { id: 'au5', question: 'Which anatomical term means closer to the midline of the body?', options: ['Lateral', 'Distal', 'Medial', 'Superficial'], answer: 'Medial' }
    ]
  },
  {
    id: 'anatomy-application',
    title: 'Anatomy Application Challenge',
    course: 'Anatomy',
    difficulty: 3,
    questions: [
      { id: 'aa1', question: 'A clot blocks a branch of the pulmonary artery. Which immediate problem is most directly expected?', options: ['Reduced blood flow to part of the lung', 'Increased bile secretion', 'Reduced filtration in the liver', 'Increased bone formation'], answer: 'Reduced blood flow to part of the lung' },
      { id: 'aa2', question: 'Injury to the radial nerve near the humerus would most directly threaten function in structures it supplies in the', options: ['Upper limb', 'Lower limb', 'Abdomen', 'Pelvis'], answer: 'Upper limb' },
      { id: 'aa3', question: 'If the diaphragm contracts and moves downward, what normally happens to thoracic volume?', options: ['It increases', 'It decreases', 'It remains fixed', 'It becomes zero'], answer: 'It increases' },
      { id: 'aa4', question: 'Damage to the mitral valve would interfere with normal blood flow between the', options: ['Left atrium and left ventricle', 'Right atrium and right ventricle', 'Right ventricle and pulmonary artery', 'Left ventricle and aorta'], answer: 'Left atrium and left ventricle' },
      { id: 'aa5', question: 'A lesion affecting the spinal cord can be especially serious because the cord carries pathways between the brain and', options: ['Peripheral nerves and the body', 'Only the stomach', 'Only the skin', 'Only the eyes'], answer: 'Peripheral nerves and the body' }
    ]
  },
  {
    id: 'anatomy-challenge',
    title: 'Anatomy Master Challenge',
    course: 'Anatomy',
    difficulty: 4,
    questions: [
      { id: 'ac1', question: 'A patient develops weakness and sensory changes after an injury affecting a peripheral nerve. Which principle best explains the pattern?', options: ['The nerve supplies a characteristic motor and sensory territory', 'All nerves supply identical territories', 'Peripheral nerves contain only sensory fibers', 'Peripheral nerves cannot be injured'], answer: 'The nerve supplies a characteristic motor and sensory territory' },
      { id: 'ac2', question: 'If venous return to the right atrium suddenly falls, which downstream chamber would initially receive less blood?', options: ['Right ventricle', 'Left atrium', 'Left ventricle', 'Aorta'], answer: 'Right ventricle' },
      { id: 'ac3', question: 'Why can obstruction of a major airway impair oxygenation even when the alveoli themselves are structurally intact?', options: ['Air cannot adequately reach ventilated gas-exchange surfaces', 'Alveoli become bones', 'Blood stops entering every artery', 'The diaphragm stops existing'], answer: 'Air cannot adequately reach ventilated gas-exchange surfaces' },
      { id: 'ac4', question: 'Which relationship correctly describes the pulmonary circulation?', options: ['Right ventricle → pulmonary arteries → lungs → pulmonary veins → left atrium', 'Left ventricle → pulmonary veins → lungs → pulmonary arteries → right atrium', 'Right atrium → aorta → lungs → vena cava → left ventricle', 'Left atrium → vena cava → lungs → aorta → right ventricle'], answer: 'Right ventricle → pulmonary arteries → lungs → pulmonary veins → left atrium' },
      { id: 'ac5', question: 'A structure located distal to the elbow is generally', options: ['Farther from the trunk along the limb', 'Closer to the trunk along the limb', 'Closer to the midline', 'Above the head'], answer: 'Farther from the trunk along the limb' }
    ]
  }
];

export default quizBank;
