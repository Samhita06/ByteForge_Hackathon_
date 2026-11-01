import { env } from '../../../config/env.js';
import { youtubeService } from './youtube.service.js';

function settingsRedirect(result) {
  const allowedOrigin = env.FRONTEND_ORIGIN.split(',')[0].trim();
  const destination = new URL('/settings', allowedOrigin);
  destination.searchParams.set('youtube', result);
  return destination.toString();
}

export async function start(req, res, next) {
  try {
    const authorizationUrl = await youtubeService.startAuthorization(req.user.id);
    res.json({ data: { authorizationUrl } });
  } catch (error) {
    next(error);
  }
}

export async function callback(req, res) {
  try {
    const result = await youtubeService.handleCallback({
      code: req.query.code,
      state: req.query.state,
      providerError: req.query.error,
    });
    res.redirect(303, settingsRedirect(result));
  } catch {
    res.redirect(303, settingsRedirect('error'));
  }
}

export async function status(req, res, next) {
  try {
    const data = await youtubeService.connectionStatus(req.supabase, req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function statistics(req, res, next) {
  try {
    const data = await youtubeService.channelStatistics(req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function disconnect(req, res, next) {
  try {
    const data = await youtubeService.disconnect(req.supabase, req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
