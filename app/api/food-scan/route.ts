import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NutritionPayload = { itemName: string; estimatedGrams: number; calories: number; confidence: string; disclaimer: string };
const offlinePayload: NutritionPayload = { itemName: "Fresh Salad Plate (Offline Heuristic)", estimatedGrams: 150, calories: 120, confidence: "heuristic", disclaimer: "Offline estimate only. Visual calorie estimates are approximate and not nutritional advice." };

function cleanBase64(input: string) { return input.includes(",") ? input.split(",")[1] : input; }

async function persistToAws(imageBase64: string, payload: NutritionPayload, userId: string) {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME, DYNAMODB_TABLE_NAME } = process.env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET_NAME || !DYNAMODB_TABLE_NAME) return false;
  try {
    const credentials = { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY };
    const s3 = new S3Client({ region: AWS_REGION, credentials });
    const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION, credentials }));
    const timestamp = new Date().toISOString();
    const key = `meals/${userId}/${Date.now()}.jpg`;
    await s3.send(new PutObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: key, Body: Buffer.from(cleanBase64(imageBase64), "base64"), ContentType: "image/jpeg" }));
    await db.send(new PutCommand({ TableName: DYNAMODB_TABLE_NAME, Item: { userId, mealId: key, createdAt: timestamp, ...payload } }));
    return true;
  } catch (error) {
    console.warn("AuraSync cloud persistence unavailable:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { imageBase64?: string; userId?: string };
    if (!body.imageBase64) return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ ...offlinePayload, storageNotice: "Offline mode: add GEMINI_API_KEY to enable visual analysis." });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: cleanBase64(body.imageBase64) } }, { text: "Estimate the visible food portion for a non-clinical calorie log. Return only the requested JSON. Be conservative and state uncertainty." }] }],
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { itemName: { type: Type.STRING }, estimatedGrams: { type: Type.NUMBER }, calories: { type: Type.NUMBER }, confidence: { type: Type.STRING }, disclaimer: { type: Type.STRING } }, required: ["itemName", "estimatedGrams", "calories", "confidence", "disclaimer"] } },
    });
    let payload: NutritionPayload;
    try {
      payload = JSON.parse(response.text ?? "{}") as NutritionPayload;
      if (!payload.itemName || !Number.isFinite(payload.calories)) throw new Error("Gemini returned an incomplete nutrition payload");
    } catch (error) {
      console.warn("Gemini response could not be parsed:", error);
      return NextResponse.json({ ...offlinePayload, storageNotice: "The visual result was incomplete, so an offline estimate was used." });
    }
    const stored = await persistToAws(body.imageBase64, payload, body.userId || "local-user");
    return NextResponse.json({ ...payload, storageNotice: stored ? "Synced to your private cloud records." : "Local result only: cloud credentials are unavailable, so nothing was persisted." });
  } catch (error) {
    console.error("Food scan failed:", error);
    return NextResponse.json({ ...offlinePayload, storageNotice: "The scan was unavailable, so an offline estimate was used." }, { status: 200 });
  }
}
