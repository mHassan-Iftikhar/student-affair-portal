import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

interface ContentModerationRequest {
  topic: string;
  content: string;
  title?: string;
  imageUrl?: string;
}

interface ModerationResponse {
  isAuthentic: boolean;
  confidenceScore: number;
  reason: string;
  flags?: string[];
  hateSpeechDetected?: boolean;
  hateSpeechReason?: string;
  imageAnalysis?: {
    isAppropriate: boolean;
    isRelevant: boolean;
    description: string;
    confidence: number;
  };
}

/**
 * Lightweight rule-based checks — only catch very serious issues
 */
function detectHateSpeechRuleBased(
  content: string,
  title?: string,
): { isHateSpeech: boolean; reason?: string; flags: string[] } {
  const fullText = (title ? `${title} ${content}` : content).toLowerCase();
  const flags: string[] = [];

  // Only the most severe / clearly problematic terms
  const severeProfanityAndSlurs = [
    "nigger", "nigga", "faggot", "fag", "retard", "retarded", "cunt",
    "madarchod", "behenchod", "bhosdike", "chutiya", "randi", "harami",
    "kys", "kill yourself", "die bitch", "rape", "molest",
  ];

  for (const word of severeProfanityAndSlurs) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "gi").test(fullText)) {
      flags.push("severe_language");
      return {
        isHateSpeech: true,
        reason: `Contains severe/hateful language`,
        flags: ["hate_speech", "severe_language"],
      };
    }
  }

  // Keep threat & extreme hate patterns
  const threatPatterns = [
    /\b(i\s+will\s+(kill|hurt|stab|shoot|rape)|i\s+am\s+going\s+to\s+(kill|hurt))/gi,
    /\b(kill\s+all|genocide|die\s+(all|you)|kys)/gi,
  ];

  for (const pattern of threatPatterns) {
    if (pattern.test(fullText)) {
      flags.push("threat");
      return {
        isHateSpeech: true,
        reason: "Contains threats or extreme violent language",
        flags: ["threat", "violent_content"],
      };
    }
  }

  return { isHateSpeech: false, flags };
}

/**
 * Gemini image analysis (university-appropriate content)
 */
async function analyzeImageWithGemini(
  imageUrl: string,
  title: string,
  content: string,
  topic: string,
): Promise<{
  isAppropriate: boolean;
  isRelevant: boolean;
  description: string;
  confidence: number;
  reason?: string;
}> {
  try {
    // Use model name from env or fallback to a known working model
    const geminiModelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-1.5-pro";
    const model = genAI.getGenerativeModel({ model: geminiModelName });

    const base64Data = imageUrl.split(",")[1] || imageUrl;
    const mimeType = imageUrl.split(";")[0].split(":")[1] || "image/jpeg";

    const prompt = `
        You are an AI content verification system for a university student portal.
        Your task is to analyze the submitted content and determine whether it is authentic, appropriate, and suitable for publishing on a university platform.

        Content to evaluate:
        Title: ${title}
        Description: ${content}
        Type: ${topic}
        ${imageUrl ? `Image provided: Yes` : `Image provided: No`}

        Evaluation Criteria:
        1. The title must be clear, relevant, and non-misleading.
        2. The description must match the title and should not contain false, spam, abusive, or irrelevant information.
        3. The content must not include hate speech, explicit language, or inappropriate material.
        4. The content should appear realistic and related to university activities such as lost & found, events, or academic resources.
        5. If an image is provided, evaluate whether it appears relevant to the title and description (based on context provided).

        Important: Do NOT reject or penalize content based on length. Short titles and short descriptions are acceptable. Only evaluate authenticity, appropriateness, relevance, and policy compliance—not word count or character count.

        Response Format (JSON only, no markdown formatting):
        {
          "isAuthentic": true | false,
          "confidenceScore": 0-100,
          "reason": "Short explanation of the decision"
        }

        Be strict, professional, and unbiased in your evaluation.
      `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } },
    ]);

    const text = (await result.response).text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);

    throw new Error("Invalid response format");
  } catch (err) {
    console.error("Gemini image error:", err);
    return {
      isAppropriate: true,
      isRelevant: true,
      description: "analysis failed",
      confidence: 40,
      reason: "Image check unavailable — passed by default",
    };
  }
}

/**
 * Hugging Face toxicity check — relaxed threshold
 */
async function moderateWithHuggingFace(
  content: string,
  title?: string,
): Promise<{ isHateSpeech: boolean; reason?: string; flags: string[] }> {
  // Quick rule-based first (only severe cases)
  const ruleResult = detectHateSpeechRuleBased(content, title);
  if (ruleResult.isHateSpeech) return ruleResult;

  const fullText = title ? `${title}\n${content}` : content;

  try {
    const model = "cardiffnlp/twitter-roberta-base-offensive";
    const res = await fetch(`https://router.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HUGGINGFACE_API_KEY ? { "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}` } : {})
      },
      body: JSON.stringify({ inputs: fullText }),
    });

    if (!res.ok) {
      console.error("HF API error:", await res.text());
      return { isHateSpeech: false, reason: "HF API unavailable", flags: [] };
    }

    const data = await res.json();
    const predictions = Array.isArray(data) ? data[0] : data;

    let maxToxicScore = 0;
    let toxicLabel = "";

    if (Array.isArray(predictions)) {
      for (const pred of predictions) {
        const label = (pred.label || "").toLowerCase();
        const score = pred.score || 0;
        if (label.includes("offensive") || label.includes("toxic") || label === "LABEL_1") {
          if (score > maxToxicScore) {
            maxToxicScore = score;
            toxicLabel = label;
          }
        }
      }
    }

    // Relaxed threshold — only flag if clearly toxic
    if (maxToxicScore > 0.55) {
      return {
        isHateSpeech: true,
        reason: `Offensive/toxic content detected (${Math.round(maxToxicScore * 100)}%)`,
        flags: ["toxic_content"],
      };
    }

    return { isHateSpeech: false, flags: [] };
  } catch (err) {
    console.error("HF moderation failed, using rule-based only", err);
    return { isHateSpeech: false, reason: "HF API error", flags: [] };
  }
}

/**
 * Light university/community appropriateness check
 */
function checkUniversityAppropriateness(
  topic: string,
  content: string,
  title?: string,
): { isAuthentic: boolean; confidenceScore: number; reason: string; flags: string[] } {
  const fullText = (title || "") + " " + content;
  const flags: string[] = [];
  let score = 100;

  // Only very clear spam patterns
  const spamPatterns = [
    /(http[s]?:\/\/[^\s]+){3,}/gi,
    /\b(viagra|onlyfans|cashapp|crypto\s+giveaway|earn\s+\$\d+)/gi,
  ];

  if (spamPatterns.some(p => p.test(fullText.toLowerCase()))) {
    flags.push("spam");
    score -= 45;
  }

  // Very soft topic relevance (optional small penalty)
  let isRelevant = true;
  const topicLower = topic.toLowerCase();

  if (topicLower.includes("lost") || topicLower.includes("found")) {
    isRelevant = /lost|found|item|phone|wallet|bag|keys|campus/i.test(fullText);
  } else if (topicLower.includes("event")) {
    isRelevant = /event|meet|party|workshop|date|time|location|join/i.test(fullText);
  }

  if (!isRelevant) {
    // flags.push("low_relevance"); // ← optional
    score -= 10;
  }

  const isAuthentic = score >= 35 && !flags.includes("spam");

  let reason = isAuthentic
    ? "Looks appropriate for university community"
    : flags.includes("spam")
      ? "Appears to be spam/promotional"
      : "Below quality threshold for posting";

  return {
    isAuthentic,
    confidenceScore: Math.max(0, Math.min(100, score)),
    reason,
    flags: flags,
  };
}

/**
 * Main moderation pipeline — relaxed combination
 */
async function moderateContent(
  topic: string,
  content: string,
  title?: string,
  imageUrl?: string,
): Promise<ModerationResponse> {
  const hateResult = await moderateWithHuggingFace(content, title);
  const uniCheck = checkUniversityAppropriateness(topic, content, title);

  let imageResult = null;
  if (imageUrl?.startsWith("data:image")) {
    imageResult = await analyzeImageWithGemini(imageUrl, title || "", content, topic);
  }

  const isAuthentic =
    !hateResult.isHateSpeech &&
    uniCheck.isAuthentic &&
    (!imageResult || imageResult.isAppropriate); // relevance is advisory only

  const confidence = hateResult.isHateSpeech
    ? 0
    : Math.min(uniCheck.confidenceScore, imageResult?.confidence ?? 100);

  const flags = [
    ...(hateResult.flags || []),
    ...(uniCheck.flags || []),
    ...(imageResult && !imageResult.isAppropriate ? ["inappropriate_image"] : []),
  ];

  let reason = hateResult.isHateSpeech
    ? hateResult.reason!
    : !uniCheck.isAuthentic
      ? uniCheck.reason
      : imageResult && !imageResult.isAppropriate
        ? `Image not suitable: ${imageResult.reason}`
        : uniCheck.reason;

  return {
    isAuthentic,
    confidenceScore: Math.round(confidence),
    reason,
    flags: flags.length ? flags : undefined,
    hateSpeechDetected: hateResult.isHateSpeech,
    hateSpeechReason: hateResult.reason,
    imageAnalysis: imageResult
      ? {
          isAppropriate: imageResult.isAppropriate,
          isRelevant: imageResult.isRelevant,
          description: imageResult.description,
          confidence: imageResult.confidence,
        }
      : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { topic, content, title, imageUrl } = await request.json() as ContentModerationRequest;

    if (!topic || !content) {
      return NextResponse.json({ error: "topic and content required" }, { status: 400 });
    }

    const result = await moderateContent(topic, content, title, imageUrl);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Moderation error:", err);
    return NextResponse.json(
      { error: "Moderation service error", details: (err as Error).message },
      { status: 500 },
    );
  }
}