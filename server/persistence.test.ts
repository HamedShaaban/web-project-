import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { getWorkspace, listSavedQuestions, listSkillHistory, listStudySessions, recordSkillChanges, recordStudySession, saveInterviewQuestion, saveWorkspace } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  deleteSavedQuestion: vi.fn(),
  getWorkspace: vi.fn(),
  listSavedQuestions: vi.fn(),
  listSkillHistory: vi.fn(),
  listStudySessions: vi.fn(),
  recordSkillChanges: vi.fn(),
  recordStudySession: vi.fn(),
  saveInterviewQuestion: vi.fn(),
  saveWorkspace: vi.fn(),
}));

const mockedGetWorkspace = vi.mocked(getWorkspace);
const mockedListSavedQuestions = vi.mocked(listSavedQuestions);
const mockedListSkillHistory = vi.mocked(listSkillHistory);
const mockedListStudySessions = vi.mocked(listStudySessions);
const mockedRecordSkillChanges = vi.mocked(recordSkillChanges);
const mockedRecordStudySession = vi.mocked(recordStudySession);
const mockedSaveInterviewQuestion = vi.mocked(saveInterviewQuestion);
const mockedSaveWorkspace = vi.mocked(saveWorkspace);

function createContext(): TrpcContext {
  return {
    user: { id: 42 } as TrpcContext["user"],
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("authenticated persistence procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetWorkspace.mockResolvedValue(undefined);
    mockedListSavedQuestions.mockResolvedValue([]);
    mockedListSkillHistory.mockResolvedValue([]);
    mockedListStudySessions.mockResolvedValue([]);
    mockedRecordSkillChanges.mockResolvedValue({ success: true });
    mockedSaveWorkspace.mockResolvedValue(undefined);
    mockedSaveInterviewQuestion.mockResolvedValue(undefined);
    mockedRecordStudySession.mockResolvedValue({ success: true });
  });

  it("loads and saves a user workspace snapshot without exposing another user id", async () => {
    mockedGetWorkspace.mockResolvedValue({
      id: 1,
      userId: 42,
      profileJson: JSON.stringify({ targetField: "Climate" }),
      skillsJson: "[]",
      projectsJson: "[]",
      sqlJson: "[]",
      studyLogJson: JSON.stringify({ Mon: 2 }),
      weeklyGoal: 6,
      theme: "dark",
      timerRemaining: 1200,
      timerSessions: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createContext());
    const loaded = await caller.workspace.load();
    expect(loaded?.profile).toEqual({ targetField: "Climate" });
    expect(mockedGetWorkspace).toHaveBeenCalledWith(42);

    await caller.workspace.save({
      profile: { targetField: "Climate", targetJob: "Data Analyst" },
      skills: [],
      projects: [],
      sql: [],
      studyLog: { Mon: 2 },
      weeklyGoal: 6,
      theme: "dark",
      timerRemaining: 1200,
      timerSessions: 3,
    });
    expect(mockedSaveWorkspace).toHaveBeenCalledWith(42, expect.objectContaining({
      profileJson: JSON.stringify({ targetField: "Climate", targetJob: "Data Analyst" }),
      weeklyGoal: 6,
      theme: "dark",
    }));
  });

  it("scopes saved interview practice and study records to the authenticated user", async () => {
    mockedListSavedQuestions.mockResolvedValue([{
      id: 9,
      userId: 42,
      questionKey: "abc",
      category: "Technical",
      question: "How do you define the grain?",
      why: "Tests modeling judgment.",
      followUp: "What control would you add?",
      answerNote: "I define the output row first.",
      feedbackJson: JSON.stringify({ score: 8 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    mockedListStudySessions.mockResolvedValue([{
      id: 3,
      userId: 42,
      sessionDate: "2026-09-18",
      minutes: 25,
      createdAt: new Date(),
    }]);

    const caller = appRouter.createCaller(createContext());
    const saved = await caller.interviews.saved();
    expect(saved[0]?.feedback).toEqual({ score: 8 });
    expect(mockedListSavedQuestions).toHaveBeenCalledWith(42);

    await caller.interviews.save({
      category: "Technical",
      question: "How do you define the grain?",
      why: "Tests modeling judgment.",
      followUp: "What control would you add?",
      answerNote: "I define the output row first.",
      feedback: { score: 8 },
    });
    expect(mockedSaveInterviewQuestion).toHaveBeenCalledWith(42, expect.objectContaining({ question: "How do you define the grain?" }));

    const summary = await caller.study.summary();
    expect(summary.sessions).toHaveLength(1);
    expect(summary.byDay["2026-09-18"]).toBe(25);
    await caller.study.record({ sessionDate: "2026-09-18", minutes: 25 });
    expect(mockedRecordStudySession).toHaveBeenCalledWith(42, "2026-09-18", 25);
  });

  it("scopes skill history to the authenticated user", async () => {
    mockedListSkillHistory.mockResolvedValue([{
      id: 4,
      userId: 42,
      skillId: 1,
      skillName: "Business SQL",
      status: "Comfortable",
      recordedAt: new Date(),
    }]);
    const caller = appRouter.createCaller(createContext());
    const history = await caller.skills.history();
    expect(history[0]?.skillName).toBe("Business SQL");
    expect(mockedListSkillHistory).toHaveBeenCalledWith(42);
    await caller.skills.record({ changes: [{ skillId: 1, skillName: "Business SQL", status: "Interview ready" }] });
    expect(mockedRecordSkillChanges).toHaveBeenCalledWith(42, [{ skillId: 1, skillName: "Business SQL", status: "Interview ready" }]);
  });
});
