const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

function getUserId(event) {
  // Extract user ID from Cognito authorizer
  try {
    return event.requestContext.authorizer.claims.sub;
  } catch (error) {
    return null;
  }
}

module.exports.getUploadUrl = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { name, type, size } = body;

    if (!name || !type || !size) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing file metadata' }) };
    }

    const fileId = uuidv4();
    const s3Key = `${userId}/${fileId}-${name}`;

    // Generate S3 Presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: type,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 mins

    // Save metadata to DynamoDB
    const item = {
      userId,
      fileId,
      name,
      type,
      size,
      s3Key,
      uploadDate: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: DYNAMODB_TABLE,
      Item: item,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl,
        file: item,
      }),
    };
  } catch (error) {
    console.error('getUploadUrl error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

module.exports.listFiles = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const data = await docClient.send(new QueryCommand({
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }));

    // Generate short-lived presigned URLs for downloading/previewing files
    const filesWithUrls = await Promise.all(data.Items.map(async (file) => {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: file.s3Key,
      });
      const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
      return { ...file, downloadUrl };
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(filesWithUrls),
    };
  } catch (error) {
    console.error('listFiles error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

module.exports.deleteFile = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const fileId = event.pathParameters.id;
  if (!fileId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing file id' }) };
  }

  try {
    // First get the file to find its s3Key
    const data = await docClient.send(new QueryCommand({
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: 'userId = :userId AND fileId = :fileId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':fileId': fileId,
      },
    }));

    if (!data.Items || data.Items.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'File not found' }) };
    }

    const file = data.Items[0];

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: file.s3Key,
    }));

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: DYNAMODB_TABLE,
      Key: {
        userId,
        fileId,
      },
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'File deleted successfully' }),
    };
  } catch (error) {
    console.error('deleteFile error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
