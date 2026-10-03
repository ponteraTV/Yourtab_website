export type Video = { slug: string; title: string; creator: string; views: string; age: string; duration: string; accent: string; category: string; description: string };

export const videos: Video[] = [
  { slug: "the-quiet-power-of-small-projects", title: "The quiet power of small projects", creator: "Maya Chen", views: "124K views", age: "2 days ago", duration: "12:42", accent: "from-violet-700 to-fuchsia-500", category: "Design", description: "Why the projects we make for ourselves are often the ones that move us forward." },
  { slug: "building-a-better-creative-routine", title: "Building a better creative routine", creator: "The Workshop", views: "84K views", age: "5 days ago", duration: "18:06", accent: "from-teal-700 to-emerald-400", category: "Lifestyle", description: "A practical conversation about showing up for creative work, even on ordinary days." },
  { slug: "a-city-designed-for-walking", title: "A city designed for walking", creator: "Field Notes", views: "216K views", age: "1 week ago", duration: "9:20", accent: "from-amber-700 to-orange-400", category: "Travel", description: "A journey through the streets and public spaces that make a city feel human." },
  { slug: "the-art-of-asking-good-questions", title: "The art of asking good questions", creator: "Alex Rivers", views: "56K views", age: "1 week ago", duration: "14:31", accent: "from-sky-700 to-blue-500", category: "Education", description: "Curiosity is a practice. Here is how to make room for better questions." },
  { slug: "inside-an-independent-bakery", title: "Inside an independent bakery", creator: "Local Hours", views: "101K views", age: "2 weeks ago", duration: "11:58", accent: "from-rose-700 to-pink-400", category: "Food", description: "Before dawn, a small team makes a neighborhood's favorite loaf from scratch." },
  { slug: "designing-for-a-little-less-noise", title: "Designing for a little less noise", creator: "Maya Chen", views: "39K views", age: "3 weeks ago", duration: "8:45", accent: "from-indigo-700 to-violet-400", category: "Design", description: "The case for digital products that give your attention back." }
];

export const playlists = [
  { slug: "slow-saturday", title: "Slow Saturday", count: 18, description: "Unhurried stories for an unhurried day.", cover: "from-orange-500 to-rose-500" },
  { slug: "creative-spark", title: "Creative spark", count: 24, description: "Ideas, process, and the people making things.", cover: "from-violet-600 to-indigo-500" },
  { slug: "curious-minds", title: "Curious minds", count: 12, description: "Big questions and satisfying explanations.", cover: "from-emerald-600 to-teal-400" }
];
