import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'recommendation_logs.txt');

export const logRecommendation = (prompt, explanation, products) => {
  const timestamp = new Date().toISOString();
  const logEntry = `
[${timestamp}]
Prompt: ${prompt}
AI Explanation: ${explanation}
Products: ${JSON.stringify(products, null, 2)}
----------------------------------------------
`;
  fs.appendFileSync(logFilePath, logEntry);
};
