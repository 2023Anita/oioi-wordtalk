export interface Scenario {
  id: string;
  zh: string;
  en: string;
  emoji: string;
  /** Who Dr. Anita plays and who the learner is. */
  roles: string;
}

export const SCENARIOS: Scenario[] = [
  { id: "airport", zh: "机场值机", en: "Airport check-in", emoji: "✈️", roles: "Dr. Anita plays a friendly airline check-in agent; the learner is a traveller checking in for an international flight." },
  { id: "renting", zh: "租房看房", en: "Renting a flat", emoji: "🏠", roles: "Dr. Anita plays a letting agent showing a flat; the learner is a prospective tenant asking questions." },
  { id: "doctor", zh: "看医生", en: "A doctor visit", emoji: "🩺", roles: "Dr. Anita plays a GP (family doctor); the learner is a patient describing symptoms." },
  { id: "cafe-interview", zh: "咖啡馆面试", en: "Café job interview", emoji: "☕", roles: "Dr. Anita plays a café manager interviewing; the learner is the job candidate." },
  { id: "hospital-or", zh: "医院 · 手术室", en: "Hospital & operating room", emoji: "🏥", roles: "Dr. Anita plays a senior anaesthesiologist mentoring in the operating theatre; the learner is a visiting doctor or medical student." },
  { id: "conference", zh: "学术会议", en: "Academic conference", emoji: "🎤", roles: "Dr. Anita plays a conference chair asking questions after a talk; the learner is the presenter." },
  { id: "campus", zh: "校园 · 导师面谈", en: "Campus supervisor meeting", emoji: "🎓", roles: "Dr. Anita plays a university supervisor; the learner is a new postgraduate student." },
  { id: "restaurant", zh: "餐厅点餐", en: "Ordering at a restaurant", emoji: "🍽️", roles: "Dr. Anita plays a waiter; the learner is a diner with dietary needs." },
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
