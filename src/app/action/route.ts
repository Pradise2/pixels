import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/hub-rest';
import { ethers } from 'ethers';
import abi from '../../../lib/contract-abi.json';

const CONTRACT_ADDRESS = process.env.PIXEL_MAP_CONTRACT_ADDRESS!;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL!;
const WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY!;

async function handler(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();

  // 1. Validate the Farcaster message
  const { isValid, message } = await getFrameMessage(body, {
      hubHttpUrl: "https://api.hub.wevm.dev" // Use a public hub
  });

  if (!isValid || !message) {
    return new NextResponse('Invalid Farcaster message', { status: 400 });
  }
  
  // The user's verified wallet address is in `message.interactor.verified_accounts`.
  // We'll take the first one for the MVP.
  const userWalletAddress = message.interactor.verified_accounts[0];
  if (!userWalletAddress) {
      return new NextResponse('User has no verified wallet address.', { status: 400 });
  }

  try {
    // 2. Connect to the blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    // 3. Game Logic: Claim a random tile
    // Note: This is a simplified random claim. A real app would need to check if the tile is already taken.
    const randomX = Math.floor(Math.random() * 100);
    const randomY = Math.floor(Math.random() * 100);

    // 4. Call the smart contract function
    const tx = await contract.claimTile(userWalletAddress, randomX, randomY);
    console.log('Transaction sent:', tx.hash);
    await tx.wait(); // Wait for the transaction to be mined

    // 5. Respond with a "Success" frame
    const imageUrl = "https://i.imgur.com/g0T0Rep.png"; // A "Success!" placeholder image
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
    console.error('Error processing transaction:', error);
    // Respond with an "Error" frame
    // (For brevity, we are sending a simple text response here. A real app would return another frame)
    return new NextResponse('Error processing transaction.', { status: 500 });
  }
}

export const POST = handler;
export const dynamic = 'force-dynamic';
