import { environment as devEnvironment } from './environment.dev';

// Local backend used by npm run dev; deployed dev builds keep environment.dev.ts.
export const environment = {
  ...devEnvironment,
  // Connect directly, as local development did before the deployment proxy split.
  api_url: 'https://localhost:7081/api',
  file_base_url: 'https://localhost:7081',
  pr: 'http://10.31.1.85:5259',
};
