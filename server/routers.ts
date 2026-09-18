import { createHash } from "node:crypto";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { deleteSavedQuestion, getWorkspace, listSavedQuestions, listSkillHistory, listStudySessions, recordSkillChanges, recordStudySession, saveInterviewQuestion, saveWorkspace, upsertUser } from "./db";

const questionSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          question: { type: "string" },
          why: { type: "string" },
          followUp: { type: "string" },
        },
        required: ["category", "question", "why", "followUp"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

const answerFeedbackSchema = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 10 },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    rewrittenAnswer: { type: "string" },
  },
  required: ["score", "summary", "strengths", "improvements", "rewrittenAnswer"],
  additionalProperties: false,
} as const;

const skillRecommendationSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          category: { type: "string" },
          why: { type: "string" },
          practice: { type: "string" },
          priority: { type: "string", enum: ["Now", "Next", "Later"] },
          week: { type: "integer", minimum: 1, maximum: 12 },
        },
        required: ["skill", "category", "why", "practice", "priority", "week"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
} as const;

const roadmapGenerationSchema = {
  type: "object",
  properties: {
    weeks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "integer", minimum: 1, maximum: 12 },
          title: { type: "string" },
          label: { type: "string" },
          color: { type: "string", enum: ["mint", "blue", "violet", "orange", "pink"] },
          focus: { type: "string" },
          deliverable: { type: "string" },
          questions: { type: "string" },
          resources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                provider: { type: "string" },
                use: { type: "string" },
              },
              required: ["title", "url", "provider", "use"],
              additionalProperties: false,
            },
          },
        },
        required: ["n", "title", "label", "color", "focus", "deliverable", "questions", "resources"],
        additionalProperties: false,
      },
    },
  },
  required: ["weeks"],
  additionalProperties: false,
} as const;

const resourcesGenerationSchema = {
  type: "object",
  properties: {
    resources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string" },
          title: { type: "string" },
          provider: { type: "string" },
          href: { type: "string" },
          use: { type: "string" },
        },
        required: ["area", "title", "provider", "href", "use"],
        additionalProperties: false,
      },
    },
  },
  required: ["resources"],
  additionalProperties: false,
} as const;

const skillsGenerationSchema = {
  type: "object",
  properties: {
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          area: { type: "string" },
          priority: { type: "string", enum: ["P0", "P1", "P2"] },
          week: { type: "integer", minimum: 1, maximum: 12 },
          evidence: { type: "string" },
        },
        required: ["name", "area", "priority", "week", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["skills"],
  additionalProperties: false,
} as const;

const questionKeyFor = (question: string) => createHash("sha256").update(question.trim()).digest("hex");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ name: z.string().optional(), email: z.string().optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        const openId = "dev-user-001";
        const name = input?.name || "Demo User";
        const email = input?.email || "user@example.com";
        try {
          await upsertUser({
            openId,
            name,
            email,
            loginMethod: "local",
            lastSignedIn: new Date(),
          });
        } catch {
          // ignore if DB is not available
        }
        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, openId, name, email };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      const row = await getWorkspace(ctx.user.id);
      if (!row) return null;
      return {
        profile: JSON.parse(row.profileJson),
        skills: JSON.parse(row.skillsJson),
        projects: JSON.parse(row.projectsJson),
        sql: JSON.parse(row.sqlJson),
        studyLog: JSON.parse(row.studyLogJson),
        weeklyGoal: row.weeklyGoal,
        theme: row.theme as "light" | "dark",
        timerRemaining: row.timerRemaining,
        timerSessions: row.timerSessions,
      };
    }),
    save: protectedProcedure
      .input(z.object({
        profile: z.record(z.string(), z.string()),
        skills: z.array(z.unknown()),
        projects: z.array(z.unknown()),
        sql: z.array(z.unknown()),
        studyLog: z.record(z.string(), z.number()),
        weeklyGoal: z.number().int().min(1).max(40),
        theme: z.enum(["light", "dark"]),
        timerRemaining: z.number().int().min(0).max(86400),
        timerSessions: z.number().int().min(0),
      }))
      .mutation(async ({ ctx, input }) => saveWorkspace(ctx.user.id, {
        profileJson: JSON.stringify(input.profile),
        skillsJson: JSON.stringify(input.skills),
        projectsJson: JSON.stringify(input.projects),
        sqlJson: JSON.stringify(input.sql),
        studyLogJson: JSON.stringify(input.studyLog),
        weeklyGoal: input.weeklyGoal,
        theme: input.theme,
        timerRemaining: input.timerRemaining,
        timerSessions: input.timerSessions,
      })),
  }),
  interviews: router({
    generateQuestions: publicProcedure
      .input(z.object({
        company: z.string().min(1).max(160),
        role: z.string().min(1).max(120),
        products: z.string().max(800).default(""),
        metrics: z.string().max(800).default(""),
        risks: z.string().max(800).default(""),
        reporting: z.string().max(800).default(""),
        questionType: z.enum(["mixed", "technical", "domain", "behavioral", "case"]),
        count: z.number().int().min(3).max(8).default(5),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a senior interview coach. Create practical, role-specific questions for a candidate. Avoid generic trivia. Test product-to-data translation, technical judgment, domain understanding, risk, controls, stakeholder judgment, and business understanding as relevant to the selected field. Return JSON only." },
            { role: "user", content: `Generate ${input.count} ${input.questionType} mock interview questions for this profile.\nCompany or organization: ${input.company}\nRole: ${input.role}\nProducts and lifecycle: ${input.products || "Not provided"}\nKey metrics: ${input.metrics || "Not provided"}\nMain risks: ${input.risks || "Not provided"}\nReporting obligations: ${input.reporting || "Not provided"}\nFor each question include category, exact interviewer question, why it matters, and one probing follow-up.` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "mock_interview_questions", strict: true, schema: questionSchema } },
          reasoning: { effort: "low" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("The interview generator returned no usable content.");
        return JSON.parse(content) as { questions: Array<{ category: string; question: string; why: string; followUp: string }> };
      }),
    evaluateAnswer: publicProcedure
      .input(z.object({ question: z.string().min(1).max(1400), answer: z.string().min(20).max(5000), role: z.string().max(120).default(""), field: z.string().max(120).default("") }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a precise interview coach. Evaluate a written answer fairly and constructively for clarity, structure, technical accuracy, business relevance, and evidence. Do not invent facts about an employer. Return JSON only with a score from 1 to 10, a concise summary, three strengths, three improvements, and a rewritten answer that preserves the candidate's voice." },
            { role: "user", content: `Evaluate this answer for a ${input.role || "professional"} candidate in ${input.field || "their target field"}.\nQuestion: ${input.question}\nWritten answer: ${input.answer}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "answer_feedback", strict: true, schema: answerFeedbackSchema } },
          reasoning: { effort: "low" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("The feedback service returned no usable content.");
        return JSON.parse(content) as { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string };
      }),
    saved: protectedProcedure.query(async ({ ctx }) => {
      const rows = await listSavedQuestions(ctx.user.id);
      return rows.map(row => ({ ...row, feedback: row.feedbackJson ? JSON.parse(row.feedbackJson) : null }));
    }),
    save: protectedProcedure
      .input(z.object({ category: z.string().max(120), question: z.string().min(1).max(1400), why: z.string().max(1400), followUp: z.string().max(1400), answerNote: z.string().max(5000).nullable().optional(), feedback: z.unknown().nullable().optional() }))
      .mutation(async ({ ctx, input }) => saveInterviewQuestion(ctx.user.id, { questionKey: questionKeyFor(input.question), category: input.category, question: input.question, why: input.why, followUp: input.followUp, answerNote: input.answerNote, feedbackJson: input.feedback == null ? null : JSON.stringify(input.feedback) })),
    remove: protectedProcedure.input(z.object({ question: z.string().min(1).max(1400) })).mutation(({ ctx, input }) => deleteSavedQuestion(ctx.user.id, questionKeyFor(input.question))),
  }),
  study: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await listStudySessions(ctx.user.id);
      const byDay: Record<string, number> = {};
      for (const session of sessions) byDay[session.sessionDate] = (byDay[session.sessionDate] || 0) + session.minutes;
      return { sessions, byDay };
    }),
    record: protectedProcedure.input(z.object({ sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), minutes: z.number().int().min(1).max(240).default(25) })).mutation(({ ctx, input }) => recordStudySession(ctx.user.id, input.sessionDate, input.minutes)),
  }),
  skills: router({
    history: protectedProcedure.query(({ ctx }) => listSkillHistory(ctx.user.id)),
    record: protectedProcedure.input(z.object({ changes: z.array(z.object({ skillId: z.number().int(), skillName: z.string().max(180), status: z.string().max(40) })).max(50) })).mutation(({ ctx, input }) => recordSkillChanges(ctx.user.id, input.changes)),
    recommend: publicProcedure
      .input(z.object({ role: z.string().min(1).max(160), field: z.string().min(1).max(160), interests: z.string().max(800).default(""), experience: z.string().max(120).default(""), goals: z.string().max(800).default("") }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a practical data-career coach. Recommend transferable and role-relevant data skills for any industry, not only banking. Balance technical foundations, analytical thinking, communication, domain fluency, and portfolio evidence. Avoid duplicating generic buzzwords; make each recommendation observable and practiceable. Return JSON only." },
            { role: "user", content: `Recommend 6 specific skills for this data-career profile.\nTarget role: ${input.role}\nTarget field or industry: ${input.field}\nInterests: ${input.interests || "Not provided"}\nExperience: ${input.experience || "Not provided"}\nGoals: ${input.goals || "Not provided"}\nFor each skill provide a category, why it matters for this profile, one concrete practice activity, priority (Now/Next/Later), and a suggested roadmap week from 1 to 12.` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "data_career_skill_recommendations", strict: true, schema: skillRecommendationSchema } },
          reasoning: { effort: "low" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("The skill recommender returned no usable content.");
        return JSON.parse(content) as { recommendations: Array<{ skill: string; category: string; why: string; practice: string; priority: string; week: number }> };
      }),
    generate: publicProcedure
      .input(z.object({ role: z.string().min(1).max(160), field: z.string().min(1).max(160), interests: z.string().max(800).default(""), experience: z.string().max(120).default("") }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a career skills architect. Generate a complete, prioritised skill plan of 14 to 17 skills for the exact role and industry specified. Skills must be specific, observable, and actionable — not generic buzzwords. Assign each a clear area, a priority (P0 = critical, P1 = important, P2 = nice to have), a target roadmap week (1-12), and a one-sentence evidence template. Return JSON only." },
            { role: "user", content: `Generate a full skill plan for:\nTarget role: ${input.role}\nTarget field or industry: ${input.field}\nInterests: ${input.interests || "Not provided"}\nExperience level: ${input.experience || "Not provided"}\nFor each skill provide: name, area (category), priority (P0/P1/P2), week (1-12), evidence (one sentence template for how to prove this skill).` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "skills_generation", strict: true, schema: skillsGenerationSchema } },
          reasoning: { effort: "medium" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Skills generation returned no content.");
        return JSON.parse(content) as { skills: Array<{ name: string; area: string; priority: string; week: number; evidence: string }> };
      }),
  }),
  roadmap: router({
    generate: publicProcedure
      .input(z.object({
        role: z.string().min(1).max(160),
        field: z.string().min(1).max(160),
        interests: z.string().max(800).default(""),
        experience: z.string().max(120).default(""),
        goals: z.string().max(800).default(""),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a practical career design coach. Generate a 12-week, week-by-week learning roadmap tailored exactly to the user's role and industry. Each week must have a concrete hands-on deliverable, a specific interview question, and exactly 2 real resources with working URLs from reputable sources (official docs, top universities, industry bodies, well-known MOOCs). Make week labels short (MAX 8 chars). Return JSON only." },
            { role: "user", content: `Create a 12-week career roadmap for:\nTarget role: ${input.role}\nTarget field or industry: ${input.field}\nInterests: ${input.interests || "Not provided"}\nExperience: ${input.experience || "Not provided"}\nGoals: ${input.goals || "Not provided"}\n\nFor each of 12 weeks provide: n (1-12), title, label (short tag like START/BUILD/MODEL), color (one of mint/blue/violet/orange/pink cycling), focus (what to do that week), deliverable (concrete artifact), questions (one interview question), resources (exactly 2 items each with title, url, provider, use).` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "roadmap_generation", strict: true, schema: roadmapGenerationSchema } },
          reasoning: { effort: "medium" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Roadmap generation returned no content.");
        return JSON.parse(content) as { weeks: Array<{ n: number; title: string; label: string; color: string; focus: string; deliverable: string; questions: string; resources: Array<{ title: string; url: string; provider: string; use: string }> }> };
      }),
  }),
  resources: router({
    generate: publicProcedure
      .input(z.object({
        role: z.string().min(1).max(160),
        field: z.string().min(1).max(160),
        interests: z.string().max(800).default(""),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a learning resource curator. Recommend 8 to 12 specific, real, publicly accessible learning resources tailored to the user's exact career profile. Include official documentation, reputable MOOCs, open-access books, industry standards bodies, and community references. All URLs must be real and functional. Return JSON only." },
            { role: "user", content: `Recommend curated resources for:\nTarget role: ${input.role}\nTarget field: ${input.field}\nInterests: ${input.interests || "Not provided"}\n\nFor each resource provide: area (topic/skill area), title, provider, href (full working URL), use (how to use it, one sentence).` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "resources_generation", strict: true, schema: resourcesGenerationSchema } },
          reasoning: { effort: "low" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Resources generation returned no content.");
        return JSON.parse(content) as { resources: Array<{ area: string; title: string; provider: string; href: string; use: string }> };
      }),
  }),
});

export type AppRouter = typeof appRouter;
