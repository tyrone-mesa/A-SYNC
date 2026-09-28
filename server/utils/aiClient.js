const Anthropic = require("@anthropic-ai/sdk");

// Configurable so the model can be bumped in .env as Anthropic ships new versions, without a
// code change. Defaults to a stable Claude Sonnet model.
const AI_MODEL = process.env.AI_MODEL || "claude-3-5-sonnet-20241022";

let client = null;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client)
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
};

const parseJson = (text) => {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned || "{}");
};

const buildFallbackQuestions = ({ jobTitle, department }) => {
  const title = String(jobTitle || "this role").trim();
  const field = String(department || "General").trim();
  const lowerTitle = title.toLowerCase();

  const genericQuestions = [
    `Tell me about yourself and why you are interested in the ${title} role.`,
    `What skills or experiences do you believe make you a strong fit for ${title}?`,
    `Describe a time when you worked with a team to solve a problem or complete a task.`,
    `How do you handle deadlines, pressure, or multiple priorities at the same time?`,
    `What do you hope to learn or improve in this ${field || "role"} opportunity?`,
  ];

  if (
    lowerTitle.includes("software") ||
    lowerTitle.includes("developer") ||
    lowerTitle.includes("programmer")
  ) {
    genericQuestions.splice(
      2,
      0,
      "How do you approach debugging or fixing a problem in your code when the issue is not obvious?",
    );
    genericQuestions.splice(
      4,
      0,
      "What is your process when learning a new technology or programming tool for a project?",
    );
  }

  if (
    lowerTitle.includes("marketing") ||
    lowerTitle.includes("social media") ||
    lowerTitle.includes("digital")
  ) {
    genericQuestions.splice(
      2,
      0,
      "How would you create or improve a campaign to attract more attention for a product or service?",
    );
  }

  if (
    lowerTitle.includes("data") ||
    lowerTitle.includes("analyst") ||
    lowerTitle.includes("research")
  ) {
    genericQuestions.splice(
      2,
      0,
      "How do you ensure the data or information you use is accurate and relevant to a decision?",
    );
  }

  return genericQuestions.slice(0, 5);
};

const normalizeWords = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const scoreBasicAnswer = (answer = "", question = "", jobTitle = "") => {
  const text = String(answer || "").trim();
  if (!text) return 1;

  const words = normalizeWords(text);
  const questionWords = normalizeWords(`${question} ${jobTitle}`);
  const uniqueQuestionWords = [
    ...new Set(questionWords.filter((w) => w.length > 3)),
  ];
  const overlap = words.filter((word) => uniqueQuestionWords.includes(word));
  const relevanceRatio =
    uniqueQuestionWords.length === 0
      ? 1
      : overlap.length / uniqueQuestionWords.length;

  const hasExample =
    /(example|for instance|when i|i remember|i once|during|last time)/i.test(
      text,
    );
  const hasStructure =
    /(first|second|because|therefore|in addition|also|however|then)/i.test(
      text,
    );
  const hasActionVerb =
    /(i worked|i handled|i helped|i improved|i learned|i solved|i collaborated|i managed|i created|i assisted)/i.test(
      text,
    );

  let score = 1;

  if (words.length < 8) {
    score = 1;
  } else if (relevanceRatio < 0.05) {
    score = 2;
  } else {
    score = 3;
    if (relevanceRatio >= 0.15) score += 1;
    if (words.length >= 20) score += 1;
    if (words.length >= 35) score += 1;
    if (hasExample) score += 2;
    if (hasStructure) score += 1;
    if (hasActionVerb) score += 1;
  }

  if (relevanceRatio < 0.05 && words.length >= 12) score = 1;
  if (relevanceRatio < 0.1 && words.length >= 8) score = Math.min(score, 3);

  return Math.min(10, Math.max(1, score));
};

const getFallbackFeedback = (score, answer = "", question = "") => {
  if (!String(answer || "").trim()) {
    return "Your answer is missing content. Try giving a clearer example and explain your actions and results.";
  }

  const questionText = String(question || "").toLowerCase();
  const answerText = String(answer || "").toLowerCase();
  const isOffTopic =
    answerText.length > 8 &&
    !questionText
      .split(/\s+/)
      .some((word) => word.length > 3 && answerText.includes(word));

  if (isOffTopic || score <= 2) {
    return "This answer is not directly relevant to the question. Focus on the actual role, the situation, and the specific actions you took.";
  }

  if (score >= 8) {
    return "Strong response. You explained your point clearly, included relevant details, and showed good self-awareness.";
  }
  if (score >= 6) {
    return "Solid answer. You have the right idea, but adding a clearer example and more specific results would make it stronger.";
  }
  if (score >= 4) {
    return "Your answer shows potential. Try focusing on concrete examples, actions you took, and what outcome came from them.";
  }
  return "This response needs more detail. Describe the situation, your actions, and the result in a more structured way.";
};

const generateInterviewQuestions = async ({ jobTitle, department }) => {
  const anthropic = getClient();
  if (!anthropic) {
    return buildFallbackQuestions({ jobTitle, department });
  }

  const prompt = `You are helping a Philippine OJT/internship student practice for a job interview.
Job title: "${jobTitle}"
Department/field: "${department || "General"}"

Generate between 3 and 5 realistic interview questions an entry-level candidate for this exact
role would likely be asked. Mix behavioral and role-specific/technical questions appropriate for
an OJT student or fresh graduate — nothing overly advanced.

Respond with ONLY a JSON array of strings, nothing else, no markdown fences, e.g.:
["Question one?", "Question two?", "Question three?"]`;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "[]";
  const questions = parseJson(text);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error(
      "The AI did not return a valid list of questions. Please try again.",
    );
  }
  return questions.slice(0, 5);
};

const scoreInterviewAnswers = async ({ jobTitle, department, questions }) => {
  const anthropic = getClient();
  if (!anthropic) {
    const scores = questions.map((q) => {
      const answer = String(q.answer || "").trim();
      const score = scoreBasicAnswer(answer, q.question, jobTitle);
      return {
        score,
        feedback: getFallbackFeedback(score, answer, q.question),
      };
    });

    const average =
      scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
    const overallFeedback = `You showed a good foundation for the ${jobTitle} role. Your responses would be stronger with more concrete examples, clearer structure, and brief explanations of the results you achieved. Focus on describing your actions, the challenge, and the outcome to make your answers more confident and job-ready.`;

    return {
      scores,
      overallFeedback:
        average >= 6
          ? `Overall, your answers are promising for the ${jobTitle} role. You have a solid base of skills and communication, and with more specific examples and clearer structure, you can make your responses even stronger.`
          : overallFeedback,
    };
  }

  const qaBlock = questions
    .map(
      (q, i) =>
        `${i + 1}. Q: ${q.question}\n   A: ${q.answer || "(no answer given)"}`,
    )
    .join("\n\n");

  const prompt = `You are an experienced hiring interviewer evaluating a candidate for an
entry-level "${jobTitle}" role (${department || "General"} field) in the Philippines. Below are
the interview questions and the candidate's answers.

${qaBlock}

For each answer, give a score from 1 to 10 (10 = excellent, role-ready answer; 1 = missing or
irrelevant) and one or two sentences of constructive feedback. Then write a short overall
feedback summary (3-4 sentences) covering the candidate's strengths and what to improve.

Respond with ONLY JSON in this exact shape, nothing else, no markdown fences:
{
  "scores": [{"score": 8, "feedback": "..."}, ...],
  "overallFeedback": "..."
}
The "scores" array must have exactly ${questions.length} items, in the same order as the
questions above.`;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  const result = parseJson(text);
  if (!result.scores || !Array.isArray(result.scores)) {
    throw new Error(
      "The AI did not return valid scoring data. Please try again.",
    );
  }
  return result;
};

module.exports = { generateInterviewQuestions, scoreInterviewAnswers };
