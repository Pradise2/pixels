import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import sharp from 'sharp';

// Dimensions for our image
const MAP_DIMENSION = 100; // 100x100 grid
const TILE_SIZE = 10; // Each tile will be 10x10 pixels
const IMAGE_WIDTH = MAP_DIMENSION * TILE_SIZE;
const IMAGE_HEIGHT = MAP_DIMENSION * TILE_SIZE;

export async function GET() {
  try {
    // 1. Fetch all claimed tiles from the database
    const { data: seasonData, error: seasonError } = await supabase
  .from('seasons').select('id').eq('is_active', true).single();
if (seasonError || !seasonData) throw new Error("No active season found");

const { data: tiles, error } = await supabase
  .from('tiles')
  .select('x, y, color')
  .eq('season_id', seasonData.id); // <-- Add this filter

    if (error) {
      console.error("Error fetching tiles:", error);
      throw new Error("Could not fetch tile data.");
    }

    // 2. Create the base image canvas (a white background)
    const svgElements = [`<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`];
    svgElements.push(`<rect width="100%" height="100%" fill="#FFFFFF"/>`); // White background

    // 3. Draw each claimed tile onto the canvas
    if (tiles) {
      for (const tile of tiles) {
        const xPos = tile.x * TILE_SIZE;
        const yPos = tile.y * TILE_SIZE;
        svgElements.push(
          `<rect x="${xPos}" y="${yPos}" width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${tile.color || '#CCCCCC'}"/>`
        );
      }
    }
    
    svgElements.push('</svg>');
    const svgImage = svgElements.join('');

    // 4. Convert the SVG to a PNG buffer using sharp
    const pngBuffer = await sharp(Buffer.from(svgImage)).toFormat('png').toBuffer();

    // 5. Return the PNG image as the response
    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Tell clients not to cache the image
      },
    });

  } catch (error: any) {
    console.error(error.message);
    return new NextResponse('Error generating image', { status: 500 });
  }
}

// Ensure this route is always dynamic
export const dynamic = 'force-dynamic';
