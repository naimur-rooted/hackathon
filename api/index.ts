import { app, configureApp } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    await configureApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Error]', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Serverless Function Invocation Error',
    });
  }
}
