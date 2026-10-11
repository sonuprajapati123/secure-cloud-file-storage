# CloudDrive - Secure Cloud File Storage System

A modern, fast, and professional cloud file-storage web app built with React (Vite) and AWS Serverless architecture.

## Architecture

- **Frontend**: React, Vite, TypeScript, Vanilla CSS (Custom Design System)
- **Authentication**: AWS Cognito
- **API**: AWS API Gateway + Lambda (Serverless Framework)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3 (Direct Uploads via Presigned URLs)

## Features

- User Registration & Login (AWS Cognito)
- Secure JWT-based protected routes & API endpoints
- Direct-to-S3 file uploads (bypasses API Gateway payload limits)
- File grid view with image previews
- Dark/Light mode theme
- Smooth animations and premium design
- Drag & drop upload area
- Delete and download capabilities

---

## 1. Backend Setup (AWS)

Prerequisites:
- AWS Account
- Node.js installed
- Serverless Framework installed (`npm install -g serverless`)
- AWS Credentials configured locally (`aws configure`)

### Deployment Steps

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy to AWS using Serverless Framework:
   ```bash
   serverless deploy
   ```
4. After deployment, the terminal will output the **API Gateway URL** and the **Cognito User Pool ID & Client ID**. Save these values for the frontend configuration.

---

## 2. Frontend Setup

Prerequisites:
- Node.js installed

### Configuration Steps

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on the `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with the values from your backend deployment:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_USER_POOL_ID=your_cognito_user_pool_id
   VITE_USER_POOL_CLIENT_ID=your_cognito_user_pool_client_id
   VITE_API_URL=your_api_gateway_url (e.g. https://xyz.execute-api.us-east-1.amazonaws.com/dev)
   ```

### Run the Application

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Clean Up (Cost Saving)

To avoid incurring AWS charges, you can remove all created resources:
```bash
cd backend
serverless remove
```
*(Note: You might need to manually empty the S3 Bucket before running this command if the bucket is not empty.)*
