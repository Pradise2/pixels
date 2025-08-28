import { NextRequest, NextResponse } from 'next/server';

async function getResponse(req: NextRequest): Promise<NextResponse> {
  // For the MVP, we'll use a static placeholder image of a grid.
  // In the future, this will be a dynamically generated image of the live map.
  const imageUrl = "https://i.imgur.com/M3m2OqF.png"; // A simple 100x100 grid placeholder

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pixel Wars</title>
        <meta property="og:title" content="Pixel Wars" />
        <meta property="og:image" content="${imageUrl}" />
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content="${imageUrl}" />
        <meta name="fc:frame:button:1" content="Claim a Random Tile" />
        <meta name="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_BASE_URL}/api/action" />
      </head>
      <body>
        <h1>Pixel Wars Frame</h1>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return getResponse(req);
}

// Disable caching for this route
export const dynamic = 'force-dynamic';
