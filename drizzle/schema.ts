import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  profileJson: text("profileJson").notNull(),
  skillsJson: text("skillsJson").notNull(),
  projectsJson: text("projectsJson").notNull(),
  sqlJson: text("sqlJson").notNull(),
  studyLogJson: text("studyLogJson").notNull(),
  weeklyGoal: int("weeklyGoal").notNull().default(5),
  theme: varchar("theme", { length: 16 }).notNull().default("light"),
  timerRemaining: int("timerRemaining").notNull().default(1500),
  timerSessions: int("timerSessions").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const interviewQuestions = mysqlTable("interviewQuestions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionKey: varchar("questionKey", { length: 64 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  question: text("question").notNull(),
  why: text("why").notNull(),
  followUp: text("followUp").notNull(),
  answerNote: text("answerNote"),
  feedbackJson: text("feedbackJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ ownerQuestionIdx: uniqueIndex("interview_owner_question_idx").on(table.userId, table.questionKey) }));

export const studySessions = mysqlTable("studySessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionDate: varchar("sessionDate", { length: 10 }).notNull(),
  minutes: int("minutes").notNull().default(25),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const skillProgressHistory = mysqlTable("skillProgressHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  skillId: int("skillId").notNull(),
  skillName: varchar("skillName", { length: 180 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type SkillProgressHistory = typeof skillProgressHistory.$inferSelect;
