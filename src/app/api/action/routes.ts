import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/hub-rest';
import { ethers } from 'ethers';
import { supabase } from '../../../lib/supabaseClient';
import abi from '../../../lib/contract-abi.json';

const CONTRACT_ADDRESS = process.env.PIXEL_MAP_CONTRACT_ADDRESS!;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!;
const WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;

// Helper function to create a response frame
function createFrameResponse(imageUrl: string, button1Text: string, button2Text: string, postUrl: string, newState: object) {
    const serializedState = encodeURIComponent(JSON.stringify(newState));
    const html = `
        <!DOCTYPE html><html><head>
            <title>Pixel Wars</title>
            <meta property="og:title" content="Pixel Wars" />
            <meta property="og:image" content="${imageUrl}" />
            <meta name="fc:frame" content="vNext" />
            <meta name="fc:frame:image" content="${imageUrl}" />
            <meta name="fc:frame:state" content="${serializedState}" />
            <meta name="fc:frame:button:1" content="${button1Text}" />
            <meta name="fc:frame:button:2" content="${button2Text}" />
            <meta name="fc:frame:post_url" content="${postUrl}" />
        </head></html>`;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

// Helper for simple text-based result frames
function createResultFrame(text: string) {
    const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image?t=${Date.now()}`;
    const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame`; // Go back to main frame
    return new NextResponse(`
        <!DOCTYPE html><html><head>
            <meta name="fc:frame" content="vNext" />
            <meta name="fc:frame:image" content="${imageUrl}" />
            <meta name="fc:frame:button:1" content="${text}" />
            <meta name="fc:frame:button:1:action" content="post" />
            <meta name="fc:frame:post_url" content="${postUrl}" />
        </head></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
}

async function handler(req: NextRequest): Promise<NextResponse> {
    const body: FrameRequest = await req.json();

    const { isValid, message } = await getFrameMessage(body, { hubHttpUrl: "https://api.hub.wevm.dev" });

    if (!isValid || !message) {
        return new NextResponse('Invalid Farcaster message', { status: 400 });
    }

    const state = JSON.parse(decodeURIComponent(message.state || '{"mode":"claim"}'));
    const buttonIndex = message.button;

    // --- MODE SWITCH LOGIC (Button 2) ---
    if (buttonIndex === 2) {
        const newMode = state.mode; // The state tells us what the next mode is
        const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image?t=${Date.now()}`;
        const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/action`;
        const nextModeState = { mode: newMode === 'claim' ? 'attack' : 'claim' };
        
        return createFrameResponse(
            imageUrl,
            newMode === 'claim' ? 'Claim a Tile' : 'Attack a Tile',
            `Switch to ${nextModeState.mode} Mode`,
            postUrl,
            nextModeState
        );
    }

    // --- ACTION LOGIC (Button 1) ---
    const actionToPerform = state.mode === 'attack' ? 'claim' : 'attack';
    const userWalletAddress = message.interactor.verified_accounts[0];
    const userFid = message.interactor.fid.toString();
    
    if (!userWalletAddress) return createResultFrame('Error: No verified wallet.');

    try {
        const { data: seasonData, error: seasonError } = await supabase.from('seasons').select('id').eq('is_active', true).single();
        if (seasonError || !seasonData) throw new Error("No active season found.");
        const activeSeasonId = seasonData.id;

        // --- ATTACK LOGIC ---
        if (actionToPerform === 'attack') {
            const { data: targetTile, error: rpcError } = await supabase.rpc('find_random_attackable_tile', {
                attacker_fid: userFid,
                current_season_id: activeSeasonId
            });

            if (rpcError || !targetTile) throw new Error("No attackable tiles found.");

            const newHealth = targetTile.health - 1;
            if (newHealth > 0) {
                await supabase.from('tiles').update({ health: newHealth }).eq('id', targetTile.id);
                return createResultFrame(`Hit! Tile (${targetTile.x},${targetTile.y}) has ${newHealth} HP.`);
            } else {
                await supabase.from('tiles').update({
                    owner_address: userWalletAddress.toLowerCase(),
                    owner_fid: userFid,
                    health: 3, // Reset health
                    color: '#'+(Math.random()*0xFFFFFF<<0).toString(16).padStart(6,'0')
                }).eq('id', targetTile.id);
                return createResultFrame(`Captured! Tile (${targetTile.x},${targetTile.y}) is yours!`);
            }
        }
        
        // --- CLAIM LOGIC ---
        if (actionToPerform === 'claim') {
            let randomX, randomY, isClaimed = true, attempts = 0;
            while (isClaimed && attempts < 10) {
                attempts++;
                randomX = Math.floor(Math.random() * 100);
                randomY = Math.floor(Math.random() * 100);
                const { data, error } = await supabase.from('tiles').select('id').eq('x', randomX).eq('y', randomY).eq('season_id', activeSeasonId).single();
                if (!data) isClaimed = false;
                if (error && error.code !== 'PGRST116') throw error;
            }
            if (isClaimed) throw new Error("Could not find an available tile.");

            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
            const tx = await contract.claimTile(userWalletAddress, randomX, randomY);
            await tx.wait();

            await supabase.from('tiles').insert({
                x: randomX, y: randomY, owner_address: userWalletAddress.toLowerCase(),
                owner_fid: userFid, color: '#'+(Math.random()*0xFFFFFF<<0).toString(16).padStart(6,'0'),
                season_id: activeSeasonId, health: 3 // Set initial health
            });
            return createResultFrame(`You claimed tile (${randomX}, ${randomY})!`);
        }

        return createResultFrame("Invalid action.");

    } catch (error: any) {
        console.error(error.message);
        return createResultFrame(`Error: ${error.message}`);
    }
}

export const POST = handler;
export const dynamic = 'force-dynamic';  } catch (error: any) {
    console.error('Error processing transaction:', error.message);
    return new NextResponse('Error: Could not process your request.', { status: 500 });
  }
}

export const POST = handler;
export const dynamic = 'force-dynamic';
