import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, interviewQuestions, skillProgressHistory, studySessions, users, workspaces } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWorkspace(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.userId, userId)).limit(1);
  return result[0];
}

export async function saveWorkspace(userId: number, data: {
  profileJson: string;
  skillsJson: string;
  projectsJson: string;
  sqlJson: string;
  studyLogJson: string;
  weeklyGoal: number;
  theme: string;
  timerRemaining: number;
  timerSessions: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(workspaces).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
  return getWorkspace(userId);
}

export async function listSavedQuestions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interviewQuestions).where(eq(interviewQuestions.userId, userId)).orderBy(desc(interviewQuestions.updatedAt));
}

export async function saveInterviewQuestion(userId: number, data: {
  questionKey: string;
  category: string;
  question: string;
  why: string;
  followUp: string;
  answerNote?: string | null;
  feedbackJson?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(interviewQuestions).values({ userId, ...data }).onDuplicateKeyUpdate({
    set: {
      category: data.category,
      question: data.question,
      why: data.why,
      followUp: data.followUp,
      ...(data.answerNote !== undefined ? { answerNote: data.answerNote } : {}),
      ...(data.feedbackJson !== undefined ? { feedbackJson: data.feedbackJson } : {}),
    },
  });
  const rows = await db.select().from(interviewQuestions).where(and(eq(interviewQuestions.userId, userId), eq(interviewQuestions.questionKey, data.questionKey))).limit(1);
  return rows[0];
}

export async function deleteSavedQuestion(userId: number, questionKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.delete(interviewQuestions).where(and(eq(interviewQuestions.userId, userId), eq(interviewQuestions.questionKey, questionKey)));
  return { success: true } as const;
}

export async function recordStudySession(userId: number, sessionDate: string, minutes = 25) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(studySessions).values({ userId, sessionDate, minutes });
  return { success: true } as const;
}

export async function listStudySessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(desc(studySessions.createdAt));
}

export async function recordSkillChanges(userId: number, changes: Array<{ skillId: number; skillName: string; status: string }>) {
  const db = await getDb();
  if (!db || changes.length === 0) return { success: true } as const;
  await db.insert(skillProgressHistory).values(changes.map(change => ({ userId, ...change })));
  return { success: true } as const;
}

export async function listSkillHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillProgressHistory).where(eq(skillProgressHistory.userId, userId)).orderBy(desc(skillProgressHistory.recordedAt));
}
