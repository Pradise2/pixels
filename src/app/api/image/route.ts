import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import sharp from 'sharp';

const MAP_DIMENSION = 100;
const TILE_SIZE = 10;
const IMAGE_WIDTH = MAP_DIMENSION * TILE_SIZE;

export async function GET() {
  try {
    // 1. Fetch active season
    const { data: seasonData } = await supabase.from('seasons').select('id').eq('is_active', true).single();
    if (!seasonData) throw new Error("No active season");

    // 2. Fetch all tiles, including the new image_url
    const { data: tiles, error } = await supabase
      .from('tiles')
      .select('x, y, color, image_url')
      .eq('season_id', seasonData.id);
    if (error) throw error;

    // 3. Prepare the base canvas
    const canvas = sharp({
      create: {
        width: IMAGE_WIDTH,
        height: IMAGE_WIDTH,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    const composites = [];
    if (tiles) {
      for (const tile of tiles) {
        let tileBuffer;
        if (tile.image_url) {
          // If there's an image, fetch it, resize it, and prepare it for composition
          try {
            const response = await fetch(tile.image_url);
            const arrayBuffer = await response.arrayBuffer();
            tileBuffer = await sharp(Buffer.from(arrayBuffer))
              .resize(TILE_SIZE, TILE_SIZE)
              .png()
              .toBuffer();
          } catch (e) {
            console.error(`Failed to fetch or process image ${tile.image_url}`, e);
            // Fallback to color if image fails
            tileBuffer = await sharp({ create: { width: TILE_SIZE, height: TILE_SIZE, channels: 3, background: tile.color || '#CCCCCC' } }).png().toBuffer();
          }
        } else {
          // If no image, just create a colored square
          tileBuffer = await sharp({ create: { width: TILE_SIZE, height: TILE_SIZE, channels: 3, background: tile.color || '#CCCCCC' } }).png().toBuffer();
        }
        composites.push({ input: tileBuffer, left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE });
      }
    }
    
    // 4. Composite all the tile images onto the canvas and serve the final PNG
    const finalImage = await canvas.composite(composites).png().toBuffer();

    return new NextResponse(finalImage, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
    });

  } catch (error: any) {
    console.error(error.message);
    return new NextResponse('Error generating image', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
