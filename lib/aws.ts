import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

export const isAwsConfigured = Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

const credentials = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
};

export const rawDynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  ...(isAwsConfigured ? { credentials } : {}),
});

export const dynamoDb = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const s3Client = new S3Client({
  region: AWS_REGION,
  ...(isAwsConfigured ? { credentials } : {}),
});
