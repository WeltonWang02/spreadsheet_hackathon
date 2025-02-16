import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface TaskRequest {
  name: string;
  description: string;
  model: string;
  prompt: string;
  input_schema: {
    properties: {
      [key: string]: {
        type: string;
        description?: string;
      };
    };
    required: string[];
    additionalProperties: boolean;
    type: string;
  };
  output_schema: {
    type: string;
    properties: {
      [key: string]: {
        type: string;
        description?: string;
      };
    };
    required?: string[];
    additionalProperties?: boolean;
  };
}

interface TaskResponse {
  task_id: string;
  status: string;
  output?: any;
}

interface AgentResponse {
  data: any;
  fromCache: boolean;
}

interface CacheEntry {
  data: any;
  url: string;
  options: RequestInit;
  timestamp: string;
  expiresAt: string;
}

const PARALLEL_URL = "https://api.parallel.ai";
const PARALLEL_API_KEY = process.env.PARALLEL_API_KEY;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

if (!PARALLEL_API_KEY) {
  throw new Error("PARALLEL_API_KEY environment variable is not set");
}

export async function createAndExecuteTask(taskRequest: TaskRequest, inputs: any): Promise<TaskResponse> {
  // First create the task
  const createUrl = `${PARALLEL_URL}/v0/tasks`;
  const createOptions = {
    method: 'POST',
    headers: {
      'x-api-key': PARALLEL_API_KEY as string,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: taskRequest.name,
      description: taskRequest.description,
      model: taskRequest.model || "neon", // Default to neon model
      prompt: taskRequest.prompt,
      input_schema: {
        type: "object",
        properties: taskRequest.input_schema.properties,
        required: taskRequest.input_schema.required,
        additionalProperties: false
      },
      output_schema: {
        type: "object",
        properties: taskRequest.output_schema.properties,
        required: taskRequest.output_schema.required || Object.keys(taskRequest.output_schema.properties),
        additionalProperties: false
      }
    })
  };

  const createResponse = await agent(createUrl, createOptions);
  const taskId = createResponse.data.task_id;

  // Then execute it with the inputs
  const executeUrl = `${PARALLEL_URL}/v0/tasks/${taskId}/executions`;
  const executeOptions = {
    method: 'POST',
    headers: {
      'x-api-key': PARALLEL_API_KEY as string,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      arguments: inputs
    })
  };

  const executeResponse = await agent(executeUrl, executeOptions);
  return executeResponse.data;
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
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CacheEntry;
    
    // Check if cache is still valid
    if (new Date(cached.expiresAt) > new Date()) {
      return {
        data: cached.data,
        fromCache: true
      };
    } else {
      // Cache expired, delete it
      fs.unlinkSync(cachePath);
    }
  }

  // Make HTTP request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    // Cache the response with expiration
    const cacheEntry: CacheEntry = {
      data,
      url,
      options,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString()
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));

    return {
      data,
      fromCache: false
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
