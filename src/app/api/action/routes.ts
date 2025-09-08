import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/hub-rest';
import { ethers } from 'ethers';
import { supabase } from '../../../lib/supabaseClient';
import abi from '../../../lib/contract-abi.json';
import Replicate from 'replicate';

const CONTRACT_ADDRESS = process.env.PIXEL_MAP_CONTRACT_ADDRESS!;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!;
const WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

// Helper function for the mode-switching frame
function createModeSwitchFrame(imageUrl: string, button1Text: string, button2Text: string, postUrl: string, newState: object) {
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

// Helper for simple text-based result frames (e.g., success or error messages)
function createResultFrame(text: string) {
    const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image?t=${Date.now()}`;
    const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame`; // Always go back to the main frame
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
  try {
    const body: FrameRequest = await req.json();
    const { isValid, message } = await getFrameMessage(body, { hubHttpUrl: "https://api.hub.wevm.dev" });

    if (!isValid || !message) {
      return new NextResponse('Invalid Farcaster message', { status: 400 });
    }

    const state = JSON.parse(decodeURIComponent(message.state || '{"mode":"claim"}'));
    const buttonIndex = message.button;
    const userFid = message.interactor.fid.toString();
    const userWalletAddress = message.interactor.verified_accounts[0];

    // --- LOGIC ROUTER BASED ON BUTTON PRESSED ---

    // Button 1: Perform the primary action (Claim or Attack)
    if (buttonIndex === 1) {
        if (!userWalletAddress) return createResultFrame('Error: No verified wallet.');
        
        const { data: seasonData, error: seasonError } = await supabase.from('seasons').select('id').eq('is_active', true).single();
        if (seasonError || !seasonData) throw new Error("No active season found.");
        const activeSeasonId = seasonData.id;

        // The state tells us what the *next* mode should be. So if the next mode is 'attack', the user just performed a 'claim'.
        const actionToPerform = state.mode === 'attack' ? 'claim' : 'attack';

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
                owner_fid: userFid, color: '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'),
                season_id: activeSeasonId, health: 3 // Set initial health
            });
            
            // Award $PIXEL tokens
            const rewardAmount = parseInt(process.env.NEXT_PUBLIC_PIXEL_REWARD_AMOUNT || '10');
            await supabase.from('users').upsert({ fid: userFid, wallet_address: userWalletAddress.toLowerCase() }, { onConflict: 'fid' });
            await supabase.rpc('increment_pixel_balance', { user_fid: userFid, amount: rewardAmount });

            return createResultFrame(`You claimed tile (${randomX}, ${randomY})!`);
        }

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
                    color: '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')
                }).eq('id', targetTile.id);
                return createResultFrame(`Captured! Tile (${targetTile.x},${targetTile.y}) is yours!`);
            }
        }
    }

    // Button 2: Switch between Claim and Attack modes
    else if (buttonIndex === 2) {
        const currentMode = state.mode === 'attack' ? 'claim' : 'attack'; // The mode the user was just in
        const nextMode = state.mode; // The mode the user is switching to
        
        const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image?t=${Date.now()}`;
        const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/action`;
        
        return createModeSwitchFrame(
            imageUrl,
            `Perform ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}`, // This is not shown, but good practice
            `Switched! Now in ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} mode.`, // This is not shown either
            postUrl,
            { mode: nextMode }
        );
    }

    // Button 3: Join a community
    else if (buttonIndex === 3) {
        const inputText = message.input || '';
        const channelName = inputText.startsWith('/') ? inputText : `/${inputText}`;

        if (channelName.length < 2) return createResultFrame("Invalid channel name.");

        let { data: community, error: communityError } = await supabase.from('communities').select('id').eq('name', channelName).single();
        if (communityError && communityError.code !== 'PGRST116') throw communityError;

        if (!community) {
            const { data: newCommunity, error: insertError } = await supabase.from('communities').insert({ name: channelName, channel_url: `https://warpcast.com/~/channel${channelName}` }).select('id').single();
            if (insertError) throw insertError;
            community = newCommunity;
        }

        await supabase.from('community_members').upsert({ user_fid: userFid, community_id: community.id }, { onConflict: 'user_fid' });
        return createResultFrame(`Successfully joined the ${channelName} community!`);
    }

    // Button 4: Generate AI Art
    else if (buttonIndex === 4) {
        if (!userWalletAddress) return createResultFrame('Error: No verified wallet.');

        const artPrompt = message.input || '';
        if (artPrompt.length < 5) return createResultFrame("Art prompt is too short.");
        
        const { data: seasonData } = await supabase.from('seasons').select('id').eq('is_active', true).single();
        if (!seasonData) throw new Error("No active season found.");
        
        const { data: lastTile, error: lastTileError } = await supabase.from('tiles').select('id').eq('owner_fid', userFid).eq('season_id', seasonData.id).order('created_at', { ascending: false }).limit(1).single();
        if (lastTileError || !lastTile) throw new Error("You don't own any tiles in the current season.");

        const model = "pixelfly/pixel-art-xl:b4289657157a1b4566723af3747ba6a68f7b55f6534471a3377a06f363c45731";
        const output = await replicate.run(model, { input: { prompt: `pixel art, ${artPrompt}` } });
        const generatedImageUrl = (output as string[])[0];

        const imageResponse = await fetch(generatedImageUrl);
        const imageBlob = await imageResponse.blob();
        const filePath = `${userFid}/${lastTile.id}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage.from('tile-art').upload(filePath, imageBlob);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('tile-art').getPublicUrl(filePath);
        await supabase.from('tiles').update({ image_url: publicUrl }).eq('id', lastTile.id);
        
        return createResultFrame("Art generated and applied successfully!");
    }

    return createResultFrame("Invalid button pressed.");

  } catch (error: any) {
    console.error('Unhandled error in action handler:', error.message);
    return createResultFrame(`Error: ${error.message}`);
  }
}

export const POST = handler;
export const dynamic = 'force-dynamic';
