import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/hub-rest';

async function getResponse(req: NextRequest): Promise<NextResponse> {
  // We need to read the request body to get the frame message
  const body: FrameRequest = await req.json().catch(() => ({})); 

  // Validate the message to safely access its contents
  const { message } = await getFrameMessage(body, {
      hubHttpUrl: "https://api.hub.wevm.dev",
      fetchHubContext: true, // This is optional but good practice
  }).catch(() => ({ message: undefined }));

  // Deserialize the state from the previous frame action. Default to 'claim' mode.
  const state = message?.state ? JSON.parse(decodeURIComponent(message.state)) : { mode: 'claim' };
  const gameMode = state.mode;

  // Dynamically generate the image URL with a cache-busting timestamp
  const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image?t=${Date.now()}`;

  // This is the state we will pass to the NEXT frame. If we are in 'claim' mode, the next state will be 'attack'.
  const nextMode = gameMode === 'claim' ? 'attack' : 'claim';
  const serializedState = encodeURIComponent(JSON.stringify({ mode: nextMode }));

  // Inside /api/frame/route.ts, in the getResponse function

const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Pixel Wars</title>
      <meta property="og:title" content="Pixel Wars" />
      <meta property="og:image" content="${imageUrl}" />
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:image" content="${imageUrl}" />
      <meta name="fc:frame:state" content="${serializedState}" />
      
      <!-- Add a text input for joining a community -->
      <meta name="fc:frame:input:text" content="Enter channel name, e.g. /base" />

      <meta name="fc:frame:button:1" content="${gameMode === 'claim' ? 'Claim Tile' : 'Attack Tile'}" />
      <meta name="fc:frame:button:2" content="Switch to ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}" />
      
      <!-- Button 3 is for joining the community entered in the text box -->
      <meta name="fc:frame:button:3" content="Join Community" />

      <meta name="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/action" />
    </head>
  </html>
`;

  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export const dynamic = 'force-dynamic';
