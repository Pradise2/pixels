import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/hub-rest';
import { ethers } from 'ethers';
import { supabase } from '../../../lib/supabaseClient'; // Import our Supabase client
import abi from '../../../lib/contract-abi.json';

const CONTRACT_ADDRESS = process.env.PIXEL_MAP_CONTRACT_ADDRESS!;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!;
const WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;

async function handler(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();

  const { isValid, message } = await getFrameMessage(body, {
    hubHttpUrl: "https://api.hub.wevm.dev"
  });

  if (!isValid || !message) {
    return new NextResponse('Invalid Farcaster message', { status: 400 });
  }

  const userWalletAddress = message.interactor.verified_accounts[0];
  if (!userWalletAddress) {
    return new NextResponse('User has no verified wallet address.', { status: 400 });
  }

  try {
    // 1. Find an unclaimed tile using our database
    let randomX, randomY;
    let isClaimed = true;
    let attempts = 0;

    while (isClaimed && attempts < 10) { // Limit attempts to prevent infinite loops
      attempts++;
      randomX = Math.floor(Math.random() * 100);
      randomY = Math.floor(Math.random() * 100);

      const { data, error } = await supabase
        .from('tiles')
        .select('id')
        .eq('x', randomX)
        .eq('y', randomY)
        .single(); // .single() is key here

      // If no record is found (data is null), the tile is available
      if (!data) {
        isClaimed = false;
      }
      
      // We expect an error when the row is not found, so we ignore that specific error code.
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
    }

    if (isClaimed) {
      throw new Error("Could not find an available tile after 10 attempts.");
    }

    // 2. Connect to the blockchain and send transaction
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const tx = await contract.claimTile(userWalletAddress, randomX, randomY);
    console.log('Transaction sent:', tx.hash);
    await tx.wait(); // Wait for the transaction to be confirmed on-chain

    // 3. Write to the database AFTER the on-chain transaction is successful
    const { error: insertError } = await supabase.from('tiles').insert({
        x: randomX,
        y: randomY,
        owner_address: userWalletAddress.toLowerCase(), // Standardize address to lowercase
        owner_fid: message.interactor.fid.toString(),
        color: '#'+(Math.random()*0xFFFFFF<<0).toString(16).padStart(6,'0') // Assign a random color
    });

    if (insertError) {
        // If this fails, we have an inconsistency. Log it for now.
        console.error("CRITICAL: Failed to write to Supabase after successful transaction:", insertError);
    }

    // 4. Respond with a "Success" frame
    const imageUrl = "https://i.imgur.com/g0T0Rep.png";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pixel Claimed!</title>
          <meta property="og:title" content="Pixel Claimed!" />
          <meta property="og:image" content="${imageUrl}" />
          <meta name="fc:frame" content="vNext" />
          <meta name="fc:frame:image" content="${imageUrl}" />
          <meta name="fc:frame:button:1" content="You claimed tile (${randomX}, ${randomY})!" />
          <meta name="fc:frame:button:1:action" content="post_redirect" />
          <meta name="fc:frame:post_url" content="https://sepolia-explorer.base.org/tx/${tx.hash}" />
        </head>
      </html>
    `;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });

  } catch (error: any) {
    console.error('Error processing transaction:', error.message);
    return new NextResponse('Error: Could not process your request.', { status: 500 });
  }
}

export const POST = handler;
export const dynamic = 'force-dynamic';
