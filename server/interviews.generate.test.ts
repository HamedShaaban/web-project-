import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { invokeLLM } from "./_core/llm";
import type { TrpcContext } from "./_core/context";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const mockedInvokeLLM = vi.mocked(invokeLLM);

function createContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthenticatedContext(): TrpcContext {
  return {
    user: { id: 7, openId: "skill-test-user", name: "Skill Tester", email: "skill@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("interviews.generateQuestions", () => {
  beforeEach(() => {
    mockedInvokeLLM.mockReset();
  });

  it("turns a company research checklist into structured practice questions", async () => {
    mockedInvokeLLM.mockResolvedValue({
      id: "mock-response",
      created: Date.now(),
      model: "gpt-5-mini",
      choices: [{
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({
            questions: [{
              category: "Product + data",
              question: "How would you model the lifecycle from application to repayment?",
              why: "It tests whether the candidate can translate the product into entities and events.",
              followUp: "Which grain would you use for the first reporting mart?",
            }],
          }),
        },
      }],
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.interviews.generateQuestions({
      company: "Example BNPL",
      role: "Fintech Data Analyst",
      products: "Short-tenor installment payments",
      metrics: "Approval, first-payment success, outstanding exposure",
      risks: "Credit and fraud",
      reporting: "Bureau and regulatory submissions",
      questionType: "mixed",
      count: 5,
    });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.question).toContain("model the lifecycle");
    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
    expect(mockedInvokeLLM.mock.calls[0]?.[0]).toMatchObject({
      response_format: { type: "json_schema" },
      reasoning: { effort: "low" },
    });
    expect(JSON.stringify(mockedInvokeLLM.mock.calls[0]?.[0])).toContain("Example BNPL");
  });

  it("evaluates a written answer into actionable feedback", async () => {
    mockedInvokeLLM.mockResolvedValue({
      id: "feedback-response",
      created: Date.now(),
      model: "gpt-5-mini",
      choices: [{
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({
            score: 8,
            summary: "Clear answer with a strong control mindset.",
            strengths: ["Defines the business impact", "Mentions validation"],
            improvements: ["Name the grain earlier", "Add one concrete metric"],
            rewrittenAnswer: "I would start by defining the grain, then quantify the variance and validate the fix with control totals.",
          }),
        },
      }],
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.interviews.evaluateAnswer({
      question: "How would you investigate a reporting variance?",
      answer: "I would compare the source and report totals, trace the issue through the pipeline, and add a validation control.",
      role: "Data Analyst",
      field: "Banking",
    });

    expect(result.score).toBe(8);
    expect(result.improvements).toContain("Name the grain earlier");
    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
    expect(mockedInvokeLLM.mock.calls[0]?.[0]).toMatchObject({
      response_format: { type: "json_schema" },
      reasoning: { effort: "low" },
    });
  });

  it("recommends structured skills for a general data-career profile", async () => {
    mockedInvokeLLM.mockResolvedValue({
      id: "skills-response",
      created: Date.now(),
      model: "gpt-5-mini",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ recommendations: [{ skill: "Experiment design", category: "Analytics", why: "It helps connect product questions to measurable decisions.", practice: "Design and critique one A/B test brief.", priority: "Now", week: 3 }] }) } }],
    });
    const caller = appRouter.createCaller(createAuthenticatedContext());
    const result = await caller.skills.recommend({ role: "Product Data Analyst", field: "Healthcare", interests: "Patient experience and access", experience: "Some experience", goals: "Build a portfolio" });
    expect(result.recommendations[0]?.skill).toBe("Experiment design");
    expect(result.recommendations[0]?.week).toBe(3);
    expect(JSON.stringify(mockedInvokeLLM.mock.calls[0]?.[0])).toContain("Healthcare");
  });
});
