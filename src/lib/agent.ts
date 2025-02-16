import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface TaskResponse {
  task_id: string;
  status: string;
  result?: any;
}

interface AgentResponse {
  data: any;
  fromCache: boolean;
}

const PARALLEL_URL = "https://api.parallel.ai";
const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY;

export async function createTask(taskData: any): Promise<TaskResponse> {
  const url = `${PARALLEL_URL}/v0/tasks`;
  const options = {
    method: 'POST',
    headers: {
      'x-api-key': PARALLEL_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  };

  const response = await agent(url, options);
  return response.data;
}

export async function executeTask(taskId: string, input: any): Promise<TaskResponse> {
  const url = `${PARALLEL_URL}/v0/tasks/${taskId}/execute`;
  const options = {
    method: 'POST', 
    headers: {
      'x-api-key': PARALLEL_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  };

  const response = await agent(url, options);
  return response.data;
}

async function agent(url: string, options: RequestInit = {}): Promise<AgentResponse> {
  // Create cache directory if it doesn't exist
  const cacheDir = path.join(process.cwd(), '.cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Generate cache key from url and options
  const cacheKey = crypto
    .createHash('md5')
    .update(`${url}${JSON.stringify(options)}`)
    .digest('hex');
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  // Check cache
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    return {
      data: cached.data,
      fromCache: true
    };
  }

  // Make HTTP request
  const response = await fetch(url, options);
  const data = await response.json();

  // Cache the response
  fs.writeFileSync(
    cachePath,
    JSON.stringify({
      data,
      url,
      options,
      timestamp: new Date().toISOString()
    })
  );

  return {
    data,
    fromCache: false
  };
}
