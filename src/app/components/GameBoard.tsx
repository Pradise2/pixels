'use client'; // This is crucial! It marks this as a client-side component

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Define the structure of our tile and player data
type Tile = {
  x: number;
  y: number;
  color: string;
  owner_address: string;
};

type Player = {
  owner_address: string;
  tile_count: number;
};

export default function GameBoard() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Fetch all tiles for the map
      const { data: tileData, error: tileError } = await supabase
        .from('tiles')
        .select('x, y, color, owner_address');

      if (tileError) {
        console.error('Error fetching tiles:', tileError);
      } else if (tileData) {
        setTiles(tileData);

        // Calculate leaderboard data from the fetched tiles
        const playerTileCounts: { [address: string]: number } = tileData.reduce((acc, tile) => {
          acc[tile.owner_address] = (acc[tile.owner_address] || 0) + 1;
          return acc;
        }, {} as { [address: string]: number });

        const sortedPlayers = Object.entries(playerTileCounts)
          .map(([address, count]) => ({ owner_address: address, tile_count: count }))
          .sort((a, b) => b.tile_count - a.tile_count)
          .slice(0, 10); // Get top 10 players

        setPlayers(sortedPlayers);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <p className="text-center">Loading the battlefield...</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Map Display */}
      <div className="md:col-span-2 bg-gray-800 p-2 rounded-lg aspect-square">
         <div className="grid grid-cols-100 gap-px" style={{ width: '100%', height: '100%' }}>
            {/* We create a full 100x100 grid and then color the claimed tiles */}
            {Array.from({ length: 10000 }).map((_, index) => {
                const x = index % 100;
                const y = Math.floor(index / 100);
                const tile = tiles.find(t => t.x === x && t.y === y);
                return (
                    <div
                        key={index}
                        className="aspect-square"
                        style={{ backgroundColor: tile ? tile.color : '#FFFFFF' }}
                    />
                );
            })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Top Players</h2>
        <ol className="list-decimal list-inside space-y-2">
          {players.map((player, index) => (
            <li key={player.owner_address} className="truncate">
              <span className="font-mono text-sm bg-gray-700 p-1 rounded">
                {player.owner_address.substring(0, 6)}...{player.owner_address.substring(player.owner_address.length - 4)}
              </span>
              <span className="float-right font-bold">{player.tile_count} tiles</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
    }
