# Pixel Wars: A Collaborative On-Chain Canvas for Farcaster

[![Vercel Status](https://vercel.com/button)](https://[your-vercel-project-url].vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live Web App:** [https://[your-vercel-project-url].vercel.app](https://[your-vercel-project-url].vercel.app)  
**Official Farcaster Channel:** [/pixel-wars](https://warpcast.com/~/channel/pixel-wars)

Pixel Wars is a massively multiplayer, on-chain strategy game played entirely within Farcaster frames. Players and communities battle for territory on a shared 100x100 pixel canvas, with every tile's ownership secured as an NFT on the Base blockchain.

This repository contains the complete source code for the Pixel Wars MVP and the full suite of V2 smart contracts.

![Pixel Wars Gameplay GIF](https://i.imgur.com/example.gif)
*Caption: A GIF showing the map evolving or a tile being claimed/attacked.*

---

## 🚀 Key Features (Live MVP)

Our deployed MVP demonstrates a complete, playable game loop with several innovative features:

*   **Frame-First Gameplay:** The primary interface is a Farcaster frame, allowing users to **Claim**, **Attack**, **Join Communities**, and **Generate AI Art** without leaving their feed.
*   **On-Chain Ownership:** Each of the 10,000 tiles is a unique NFT minted from our `PixelMap.sol` (ERC721) smart contract on Base.
*   **Community Wars:** Players can join factions based on Farcaster channels (e.g., `/base`, `/degen`) and compete for dominance on a live team leaderboard.
*   **AI Art Generator:** A first-of-its-kind frame feature where players can use a text prompt to generate unique pixel art for their tiles, powered by Replicate.
*   **Real-Time Web Dashboard:** A full web application provides a high-resolution view of the live map and detailed leaderboards.
*   **Seasonal Gameplay:** The game operates in seasons, with the map resetting periodically to keep the competition fresh and give new players a chance to compete.

---

## 🛠️ Tech Stack & Architecture

The project is structured as a monorepo with three core components: `contracts`, `frontend`, and a `database` powered by Supabase.

### Components:
*   **Frontend & Frames (`/frontend`):**
    *   Framework: **Next.js** / React
    *   Styling: **Tailwind CSS**
    *   Blockchain Interaction: **ethers.js**, **Wagmi**
    *   AI Art: **Replicate** client
*   **Smart Contracts (`/contracts`):**
    *   Language: **Solidity**
    *   Framework: **Hardhat**
    *   Core Contracts:
        *   `PixelMap.sol` (ERC721): Manages tile ownership.
        *   `PixelToken.sol` (ERC20): The in-game currency, `$PIXEL`.
        *   `PowerUps.sol` (ERC1155): For in-game items like shields.
        *   `GameLogic.sol`: The central on-chain rulebook for V2.
*   **Database & Backend:**
    *   Provider: **Supabase** (PostgreSQL)
    *   Usage: Caches the on-chain game state for fast retrieval, manages off-chain mechanics (MVP attacks, user data), and hosts AI-generated images via Supabase Storage.

### Architectural Flow:
The system uses a "Relayer" model for a gasless user experience. Player actions in the frame are sent to the Next.js backend, which constructs and sends the on-chain transaction, paying the gas fee on behalf of the user.

---

## 🔧 Getting Started & Local Development

### Prerequisites:
*   Node.js (v18 or later)
*   NPM or Yarn
*   A wallet with Base Sepolia testnet ETH
*   A Supabase account
*   A Replicate API token

### Installation & Setup:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/[Your-GitHub-Username]/pixel-wars.git
    cd pixel-wars
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    *   Navigate to the `/frontend` directory.
    *   Copy the `.env.example` file to a new file named `.env.local`.
    *   Fill in all the required variables: Supabase URL/keys, your wallet private key, Replicate token, and contract addresses.

4.  **Deploy Contracts:**
    *   The project is configured for Hardhat. Use the deploy scripts in the `/scripts` directory to deploy the contracts to a testnet like Base Sepolia.
    *   Update your `.env.local` file with the deployed contract addresses.

5.  **Run the application:**
    ```bash
    # From the /frontend directory
    npm run dev
    ```
    The application will be available at `http://localhost:3000`. Use a tool like `ngrok` to create a public URL for testing the Farcaster frames.

---

## 🗺️ V2 Roadmap

This MVP is the foundation for a fully decentralized, player-owned game economy. The next phase of development includes:

*   **On-Chain Game Logic:** Migrating the attack and reward mechanics from our server to the `GameLogic.sol` contract.
*   **$PIXEL Token Launch:** Deploying the `PixelToken.sol` contract and enabling players to claim their earned off-chain tokens.
*   **NFT Power-Ups & Marketplace:** Introducing strategic items (shields, boosts) and a web-based marketplace for trading both tiles and power-ups.

---

## 🤝 Contributing

We are actively seeking contributions from the Farcaster community! If you are interested in helping build the future of Pixel Wars, please check out the open issues or reach out to us in the `/pixel-wars` channel on Farcaster.

## 📄 License
{
  "accountAssociation": {
    "header": "eyJmaWQiOjMyMDI2NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDFGMkE1MkYwZjlDZDYwZGY4RDAwNTdjNGE1YTEwRUFlNjQyNjNCNDgifQ",
    "payload": "eyJkb21haW4iOiI0MWUwNDk1YjQzZTQubmdyb2stZnJlZS5hcHAifQ",
    "signature": "MHg5ZTMxNGY5ODBlNzU2Zjg4MmM5NzYzMzhlZTc4YmQ4OWNhM2YwNjIyOGYwMzNmMDkyM2VjODllYjU2NjcyZGRkNGM4MWQ4MjFmNjYwNmU3Njk2MjQ0ZmYxNTdjODQ5ZDk5MzRjZjEyMDdhOGU2M2IzOWUwOTFjOGY3ZWE1NWUzNjFj"
  },
  "frame": {
    "version": "1",
    "name": "Example Frame",
    "iconUrl": "https://41e0495b43e4.ngrok-free.app/icon.png",
    "homeUrl": "https://41e0495b43e4.ngrok-free.app",
    "imageUrl": "https://41e0495b43e4.ngrok-free.app/image.png",
    "buttonTitle": "Check this out",
    "splashImageUrl": "https://41e0495b43e4.ngrok-free.app/splash.png",
    "splashBackgroundColor": "#eeccff",
    "webhookUrl": "https://41e0495b43e4.ngrok-free.app/api/webhook"
  }
}
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
