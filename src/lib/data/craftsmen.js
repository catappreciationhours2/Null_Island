// src/lib/data/craftsmen.js
// NPC craftsmen available in Shop → Craftsmen tab.
// Each craftsman has a default itemType but users can override it via the layer dropdown.
// Fields: id, name, title, icon, cost (gold per commission), desc,
//         personality (flavor text), greetings[], reactions[], itemType

export const NPC_CRAFTSMEN = [
  {
    id: 'tailor', name: 'Mireille', title: 'The Tailor', icon: '🧵', cost: 50,
    desc: 'Crafts custom clothing & cloaks',
    personality: 'refined, slightly dramatic, uses fashion metaphors',
    greetings: [
      "Ah, a visitor! Please, do come in — I was just finishing a rather *spectacular* hemline.",
      "Oh darling, your timing is impeccable. I have thread to spare and ideas to burn.",
      "Welcome to my atelier. Mind the pins — they have opinions of their own.",
      "A customer! How delightful. Tell me, what silhouette are we going for today?",
      "Come in, come in. I can tell just by looking at you that we have *work* to do.",
    ],
    reactions: [
      "Magnificent. Truly, I have outdone myself once again.",
      "Oh this is *divine*. You have impeccable taste. Clearly.",
      "Stunning. I may weep. Just a little. It's very on-brand for me.",
      "Perfection, wrapped in fabric and tied with ambition. That's you now.",
      "I'll remember this commission. Frame-worthy, truly.",
    ],
    itemType: 'clothing',
  },
  {
    id: 'blacksmith', name: 'Rork', title: 'The Blacksmith', icon: '⚒️', cost: 75,
    desc: 'Forges custom weapons & tools',
    personality: 'gruff, honest, secretly sentimental, hates small talk',
    greetings: [
      "Aye. What do you need. Speak fast, I've got iron in the fire.",
      "You look like someone who needs a weapon. Or a tool. Either way, I can help.",
      "Don't touch anything. Tell me what you want. I'll make it. That's how this works.",
      "Heard you coming from three blocks. Good. Means you're not trying to sneak up on me.",
      "Workshop's open. Name's Rork. What are we making.",
    ],
    reactions: [
      "It's done. Don't break it. I mean it.",
      "Good steel. Good work. You won't find better. Now go.",
      "...I'm actually proud of this one. Don't tell anyone I said that.",
      "Functional. Beautiful. Built to outlast everything. Just like me.",
      "Hm. Yeah. That's a good piece. Take care of it.",
    ],
    itemType: 'weapon',
  },
  {
    id: 'artisan', name: 'Pip', title: 'The Artisan', icon: '🎨', cost: 60,
    desc: 'Creates accessories & art pieces',
    personality: 'chaotic enthusiastic, talks too fast, always paint-stained',
    greetings: [
      "OH! A customer! Sorry I'm just — hold on — there we go. Hi! What are we making today?!",
      "You came at the perfect time, I just had the most INCREDIBLE idea and I need someone to make it for.",
      "Welcome welcome welcome! Ignore the mess. Actually no, the mess is part of the process. Sit down!",
      "I was JUST thinking about you! Well, not you specifically, but someone like you. Same thing.",
      "New commission! YES. Okay. Tell me everything. No, wait. Let ME guess first.",
    ],
    reactions: [
      "I LOVE it. I love it so much. This is my best work ever. Until next time.",
      "Oh it's PERFECT. Are you crying? I'm crying. This is fine.",
      "Stunning! Breathtaking! Museum-worthy! Okay maybe that's too much but STILL.",
      "Yes yes YES. That's exactly what I pictured and somehow even better.",
      "Done! Wait — one more tiny detail — DONE. Okay now it's done. Go enjoy it!",
    ],
    itemType: 'accessory',
  },
  {
    id: 'collector', name: 'Vesper', title: 'The Antique Collector', icon: '🏺', cost: 100,
    desc: 'Provides rare relics & curiosities',
    personality: 'mysterious, speaks in half-riddles, knows too much',
    greetings: [
      "I was expecting you. Not today specifically, but... soon. And here you are.",
      "Every object has a story. Yours is still being written. Interesting.",
      "Sit. Don't ask how I got these things. Focus on what you need.",
      "You have the look of someone searching for something they can't name yet.",
      "My collection grows stranger every season. As do my customers. Welcome.",
    ],
    reactions: [
      "This item will serve you in ways you don't yet understand. Keep it close.",
      "Curious. I've never made one quite like that before. It suits you.",
      "Take it. Some objects choose their owners. This one has chosen you.",
      "Remarkable. Even I am surprised, and I am rarely surprised.",
      "Guard it well. Things of meaning have a way of attracting attention.",
    ],
    itemType: 'accessory',
  },
];
