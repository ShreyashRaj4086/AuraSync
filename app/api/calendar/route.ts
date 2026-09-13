import { NextResponse } from "next/server";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, isAwsConfigured } from "@/lib/aws";

export const runtime = "nodejs";

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "AuraSync_DailyLogs";

// Memory / Local fallback store when AWS environment variables are not configured locally
const localCalendarStore: Record<string, Record<string, any>> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");

  if (!userId || !date) {
    return NextResponse.json({ error: "userId and date are required" }, { status: 400 });
  }

  if (!isAwsConfigured) {
    const userStore = localCalendarStore[userId] || {};
    return NextResponse.json({ record: userStore[date] || null, source: "local" });
  }

  try {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          userId,
          logDate: date,
        },
      })
    );

    return NextResponse.json({ record: result.Item || null, source: "aws" });
  } catch (error) {
    console.warn("DynamoDB GET calendar log failed, using local store:", error);
    const userStore = localCalendarStore[userId] || {};
    return NextResponse.json({ record: userStore[date] || null, source: "local-fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, logDate, ...data } = body;

    if (!userId || !logDate) {
      return NextResponse.json({ error: "userId and logDate are required" }, { status: 400 });
    }

    const item = {
      userId,
      logDate,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Keep local store in sync
    if (!localCalendarStore[userId]) localCalendarStore[userId] = {};
    localCalendarStore[userId][logDate] = item;

    if (!isAwsConfigured) {
      return NextResponse.json({ success: true, record: item, source: "local" });
    }

    await dynamoDb.send(
      new PutCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Item: item,
      })
    );

    return NextResponse.json({ success: true, record: item, source: "aws" });
  } catch (error) {
    console.error("DynamoDB POST calendar log error:", error);
    return NextResponse.json({ error: "Failed to persist calendar log to AWS DynamoDB" }, { status: 500 });
  }
}
