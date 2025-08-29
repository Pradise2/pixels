import GameBoard from './components/GameBoard';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tighter">Pixel Wars</h1>
        <p className="text-gray-400 mt-2">Claim your territory on the Farcaster canvas.</p>
      </header>

      <div className="w-full max-w-4xl">
        {/* The GameBoard component will handle fetching and displaying the map + leaderboard */}
        <GameBoard />
      </div>

      <footer className="mt-8 text-center text-gray-500">
        <p>Built for Farcaster</p>
      </footer>
    </main>
  );
}
