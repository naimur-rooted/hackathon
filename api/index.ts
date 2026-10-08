import { app, configureApp } from '../server.js';

export default async function handler(req: any, res: any) {
  await configureApp();
  return app(req, res);
}
