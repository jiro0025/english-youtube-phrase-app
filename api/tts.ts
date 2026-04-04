import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('q');
  const lang = searchParams.get('l') || 'en';

  if (!text) {
    return new Response('Missing text', { status: 400 });
  }

  // Google TTS unofficial endpoint
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      return new Response('Google TTS Failed', { status: response.status });
    }

    // Proxy the audio data back to the client
    const audioData = await response.arrayBuffer();
    return new Response(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('TTS Proxy Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
