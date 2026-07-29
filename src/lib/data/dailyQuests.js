// src/lib/data/dailyQuests.js
// Pool of daily quest prompts shown in the sidebar.
// 3 quests are picked each day (one per category, seeded by date so they're
// consistent throughout the day but rotate daily).
//
// To add a new quest: add an entry to the array below with cat, icon, xp, text.
// To add a new category: add entries with a new cat value — it will be picked automatically.

export const QUEST_POOL = [
  // ── Art & Design ───────────────────────────────────────────────────────
  { cat: 'Art',         icon: '🎨', xp: 80,  text: 'Study the Bauhaus movement — how did it reshape modern design?' },
  { cat: 'Art',         icon: '🎨', xp: 70,  text: 'Sketch a still-life of 3 objects on your desk right now.' },
  { cat: 'Art',         icon: '🎨', xp: 75,  text: 'Look up one artwork by Katsushika Hokusai and note what draws your eye.' },
  { cat: 'Art',         icon: '🎨', xp: 80,  text: 'Draw your own pixel art character sprite in any tool.' },
  { cat: 'Art',         icon: '🎨', xp: 70,  text: 'Read about colour theory — learn the split-complementary scheme.' },

  // ── History ────────────────────────────────────────────────────────────
  { cat: 'History',     icon: '📜', xp: 75,  text: 'Read about the fall of Constantinople and its impact on Europe.' },
  { cat: 'History',     icon: '📜', xp: 70,  text: 'Learn the timeline of the Industrial Revolution in 10 minutes.' },
  { cat: 'History',     icon: '📜', xp: 80,  text: 'Who was Ada Lovelace and why does she matter to computing today?' },
  { cat: 'History',     icon: '📜', xp: 70,  text: 'Read about the Silk Road — what travelled along it beyond silk?' },
  { cat: 'History',     icon: '📜', xp: 75,  text: 'Explore the history of the printing press and its societal ripple effects.' },

  // ── Science ────────────────────────────────────────────────────────────
  { cat: 'Science',     icon: '🔬', xp: 85,  text: 'Read about CRISPR-Cas9 — what problem does it actually solve?' },
  { cat: 'Science',     icon: '🔬', xp: 80,  text: 'Learn what a mRNA vaccine is and how it differs from traditional vaccines.' },
  { cat: 'Science',     icon: '🔬', xp: 75,  text: 'Study the water cycle: evaporation, condensation, precipitation, collection.' },
  { cat: 'Science',     icon: '🔬', xp: 80,  text: 'Read about symbiosis — find one example of mutualism, commensalism, and parasitism.' },
  { cat: 'Science',     icon: '🔬', xp: 85,  text: 'Explore what dark matter is and why physicists think it exists.' },

  // ── Space ──────────────────────────────────────────────────────────────
  { cat: 'Space',       icon: '🚀', xp: 85,  text: 'Read about the James Webb Telescope — what can it see that Hubble could not?' },
  { cat: 'Space',       icon: '🚀', xp: 80,  text: 'Learn the difference between a neutron star and a black hole.' },
  { cat: 'Space',       icon: '🚀', xp: 75,  text: 'Study the Drake Equation — what does it try to estimate?' },
  { cat: 'Space',       icon: '🚀', xp: 85,  text: 'Read about the Voyager probes — where are they now and what have they taught us?' },
  { cat: 'Space',       icon: '🚀', xp: 80,  text: 'Learn what Lagrange points are and why satellites park there.' },

  // ── Engineering ────────────────────────────────────────────────────────
  { cat: 'Engineering', icon: '⚙️', xp: 90,  text: 'Read about how a bridge stays up — learn the role of compression vs tension.' },
  { cat: 'Engineering', icon: '⚙️', xp: 85,  text: 'Study how a transistor works at a conceptual level.' },
  { cat: 'Engineering', icon: '⚙️', xp: 80,  text: "Learn what PID controllers are and where they're used in everyday life." },
  { cat: 'Engineering', icon: '⚙️', xp: 90,  text: 'Explore how lithium-ion batteries store and release energy.' },
  { cat: 'Engineering', icon: '⚙️', xp: 85,  text: 'Read about the engineering behind the Panama Canal locks.' },

  // ── Physics ────────────────────────────────────────────────────────────
  { cat: 'Physics',     icon: '⚛️', xp: 90,  text: 'Learn what the Heisenberg Uncertainty Principle actually says (not just the meme).' },
  { cat: 'Physics',     icon: '⚛️', xp: 85,  text: "Read about Bernoulli's Principle — how does it explain how planes fly?" },
  { cat: 'Physics',     icon: '⚛️', xp: 95,  text: 'Study the formula E = mc² — what does each variable actually represent?' },
  { cat: 'Physics',     icon: '⚛️', xp: 90,  text: 'Learn about entropy — why does disorder naturally increase over time?' },
  { cat: 'Physics',     icon: '⚛️', xp: 85,  text: 'Explore the photoelectric effect — why did it prove light behaves as particles?' },

  // ── Biology ────────────────────────────────────────────────────────────
  { cat: 'Biology',     icon: '🧬', xp: 80,  text: 'Read about how mitochondria produce ATP — trace the electron transport chain.' },
  { cat: 'Biology',     icon: '🧬', xp: 75,  text: 'Learn how neurons transmit electrical signals across a synapse.' },
  { cat: 'Biology',     icon: '🧬', xp: 80,  text: 'Study the difference between DNA, RNA, and proteins and how they relate.' },
  { cat: 'Biology',     icon: '🧬', xp: 75,  text: 'Read about epigenetics — how can genes be switched on or off?' },
  { cat: 'Biology',     icon: '🧬', xp: 80,  text: 'Explore the microbiome — what role do gut bacteria play in health?' },

  // ── Technology ─────────────────────────────────────────────────────────
  { cat: 'Technology',  icon: '💻', xp: 80,  text: 'Read about how end-to-end encryption works in messaging apps.' },
  { cat: 'Technology',  icon: '💻', xp: 85,  text: 'Learn what a neural network is — trace data through one layer conceptually.' },
  { cat: 'Technology',  icon: '💻', xp: 80,  text: 'Study the difference between TCP and UDP — when would you choose each?' },
  { cat: 'Technology',  icon: '💻', xp: 75,  text: 'Read about WebAssembly — what problem does it solve that JS cannot?' },
  { cat: 'Technology',  icon: '💻', xp: 85,  text: 'Learn what a blockchain is structurally — ignore the hype, study the data structure.' },

  // ── Make / Build ───────────────────────────────────────────────────────
  { cat: 'Make',        icon: '🛠️', xp: 100, text: 'Write a script in any language that converts Celsius to Fahrenheit for any input.' },
  { cat: 'Make',        icon: '🛠️', xp: 100, text: 'Build a tiny CLI tool that outputs a random motivational quote from a hardcoded list.' },
  { cat: 'Make',        icon: '🛠️', xp: 110, text: 'Create a single-page HTML file with a working dark/light mode toggle.' },
  { cat: 'Make',        icon: '🛠️', xp: 100, text: 'Write a function that checks whether a string is a palindrome.' },
  { cat: 'Make',        icon: '🛠️', xp: 110, text: 'Make a small drawing: design your own map of an imaginary place.' },

  // ── Literature ─────────────────────────────────────────────────────────
  { cat: 'Literature',  icon: '📖', xp: 75,  text: "Read the first chapter of a book you've been meaning to start. Just one." },
  { cat: 'Literature',  icon: '📖', xp: 70,  text: 'Learn about magical realism as a genre — read a summary of "One Hundred Years of Solitude".' },
  { cat: 'Literature',  icon: '📖', xp: 75,  text: 'Read a short story by Ursula K. Le Guin — find one free online.' },
  { cat: 'Literature',  icon: '📖', xp: 70,  text: 'Study the structure of a haiku — then write three of your own.' },
  { cat: 'Literature',  icon: '📖', xp: 75,  text: 'Read about unreliable narrators in fiction — find two famous examples.' },

  // ── Law ────────────────────────────────────────────────────────────────
  { cat: 'Law',         icon: '⚖️', xp: 80,  text: 'Read about the difference between civil and criminal law.' },
  { cat: 'Law',         icon: '⚖️', xp: 75,  text: 'Learn what habeas corpus means and why it matters to individual rights.' },
  { cat: 'Law',         icon: '⚖️', xp: 80,  text: 'Study what GDPR requires from companies and what rights it gives individuals.' },
  { cat: 'Law',         icon: '⚖️', xp: 75,  text: "Read about intellectual property — what's the difference between a patent, trademark, and copyright?" },
  { cat: 'Law',         icon: '⚖️', xp: 80,  text: 'Explore what "innocent until proven guilty" means procedurally, not just philosophically.' },
];
