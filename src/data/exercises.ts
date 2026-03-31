export interface Exercise {
  id: string;
  name: string;
  description: string;
  defaultSets: number;
  defaultReps: number;
  muscleGroup: string;
  imageUrl: string;
  videoUrl: string;
}

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: '1',
    name: 'Ankle Pumps',
    description: 'Move your feet up and down as if you are pressing on a gas pedal.',
    defaultSets: 2,
    defaultReps: 20,
    muscleGroup: 'Ankle/Calf',
    imageUrl: 'https://picsum.photos/seed/ankle/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '2',
    name: 'Quad Sets',
    description: 'Tighten the muscle on the top of your thigh by pushing the back of your knee down into the bed.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Quadriceps',
    imageUrl: 'https://picsum.photos/seed/quad/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '3',
    name: 'Glute Squeezes',
    description: 'Squeeze your buttock muscles together and hold for 5 seconds.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Glutes',
    imageUrl: 'https://picsum.photos/seed/glute/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '4',
    name: 'Hamstring Curls',
    description: 'While standing, bend your knee and bring your heel toward your buttock.',
    defaultSets: 3,
    defaultReps: 12,
    muscleGroup: 'Hamstrings',
    imageUrl: 'https://picsum.photos/seed/hamstring/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '5',
    name: 'Wall Slides',
    description: 'Lean against a wall and slowly slide down until your knees are bent at a 45-degree angle.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Quadriceps/Glutes',
    imageUrl: 'https://picsum.photos/seed/wallslide/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '6',
    name: 'Shoulder External Rotation',
    description: 'With your elbow at your side, rotate your hand outward away from your body.',
    defaultSets: 3,
    defaultReps: 15,
    muscleGroup: 'Rotator Cuff',
    imageUrl: 'https://picsum.photos/seed/shoulder/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '7',
    name: 'Bicep Curls',
    description: 'Bend your elbow and bring your hand toward your shoulder.',
    defaultSets: 3,
    defaultReps: 12,
    muscleGroup: 'Biceps',
    imageUrl: 'https://picsum.photos/seed/bicep/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '8',
    name: 'Tricep Extensions',
    description: 'Straighten your arm overhead or behind you.',
    defaultSets: 3,
    defaultReps: 12,
    muscleGroup: 'Triceps',
    imageUrl: 'https://picsum.photos/seed/tricep/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '9',
    name: 'Calf Raises',
    description: 'Stand on your toes and slowly lower your heels back to the floor.',
    defaultSets: 3,
    defaultReps: 15,
    muscleGroup: 'Calves',
    imageUrl: 'https://picsum.photos/seed/calfraise/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '10',
    name: 'Bird Dog',
    description: 'On all fours, extend your opposite arm and leg simultaneously.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Core/Back',
    imageUrl: 'https://picsum.photos/seed/birddog/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '11',
    name: 'Dead Bug',
    description: 'On your back, lower opposite arm and leg toward the floor while keeping your back flat.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Core',
    imageUrl: 'https://picsum.photos/seed/deadbug/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '12',
    name: 'Plank',
    description: 'Hold a push-up position with your weight on your forearms.',
    defaultSets: 3,
    defaultReps: 30, // seconds
    muscleGroup: 'Core',
    imageUrl: 'https://picsum.photos/seed/plank/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '13',
    name: 'Side Plank',
    description: 'Hold your body up on one forearm while lying on your side.',
    defaultSets: 3,
    defaultReps: 20, // seconds
    muscleGroup: 'Core/Obliques',
    imageUrl: 'https://picsum.photos/seed/sideplank/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '14',
    name: 'Bridges',
    description: 'Lying on your back with knees bent, lift your hips toward the ceiling.',
    defaultSets: 3,
    defaultReps: 12,
    muscleGroup: 'Glutes/Hamstrings',
    imageUrl: 'https://picsum.photos/seed/bridge/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '15',
    name: 'Clamshells',
    description: 'Lying on your side with knees bent, lift your top knee while keeping your feet together.',
    defaultSets: 3,
    defaultReps: 15,
    muscleGroup: 'Hip Abductors',
    imageUrl: 'https://picsum.photos/seed/clamshell/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '16',
    name: 'Straight Leg Raise',
    description: 'Lying on your back, lift one leg straight up to about 45 degrees.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Hip Flexors/Quads',
    imageUrl: 'https://picsum.photos/seed/slr/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '17',
    name: 'Scapular Squeezes',
    description: 'Squeeze your shoulder blades together as if you are trying to hold a pencil between them.',
    defaultSets: 3,
    defaultReps: 15,
    muscleGroup: 'Upper Back',
    imageUrl: 'https://picsum.photos/seed/scapula/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '18',
    name: 'Chin Tucks',
    description: 'Gently tuck your chin toward your neck without tilting your head down.',
    defaultSets: 3,
    defaultReps: 10,
    muscleGroup: 'Neck',
    imageUrl: 'https://picsum.photos/seed/chintuck/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '19',
    name: 'Cat-Cow Stretch',
    description: 'On all fours, alternate between arching your back and rounding it.',
    defaultSets: 2,
    defaultReps: 10,
    muscleGroup: 'Spine',
    imageUrl: 'https://picsum.photos/seed/catcow/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: '20',
    name: 'Child\'s Pose',
    description: 'Kneel on the floor and sit back on your heels, then lean forward and stretch your arms out.',
    defaultSets: 2,
    defaultReps: 30, // seconds
    muscleGroup: 'Lower Back',
    imageUrl: 'https://picsum.photos/seed/childspose/400/300',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }
];
