'use client'; // This is crucial! It marks this as a client-side component

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Define the structure of our data
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

// NEW: Define the structure for community data
type Community = {
  id: number;
  name: string;
  tile_count: number;
  member_count: number;
};

export default function GameBoard() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]); // NEW: State for community data
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // 1. Fetch active season (no changes here)
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons').select('id').eq('is_active', true).single();
      
      if (seasonError || !seasonData) {
        console.error("No active season");
        setIsLoading(false);
        return;
      }
      const activeSeasonId = seasonData.id;

      // 2. Fetch tile and player data (no changes here)
      const { data: tileData, error: tileError } = await supabase
        .from('tiles')
        .select('x, y, color, owner_address')
        .eq('season_id', activeSeasonId);

      if (tileError) {
        console.error('Error fetching tiles:', tileError);
      } else if (tileData) {
        setTiles(tileData);
        // Calculate leaderboard data (no changes here)
        const playerTileCounts: { [address: string]: number } = tileData.reduce((acc, tile) => {
          acc[tile.owner_address] = (acc[tile.owner_address] || 0) + 1;
          return acc;
        }, {} as { [address: string]: number });
        const sortedPlayers = Object.entries(playerTileCounts)
          .map(([address, count]) => ({ owner_address: address, tile_count: count }))
          .sort((a, b) => b.tile_count - a.tile_count).slice(0, 10);
        setPlayers(sortedPlayers);
      }
      
      // 3. NEW: Fetch community stats using our SQL function
      const { data: communityData, error: communityError } = await supabase
        .rpc('get_community_stats', { current_season_id: activeSeasonId });

      if (communityError) {
        console.error('Error fetching community stats:', communityError);
      } else if (communityData) {
        setCommunities(communityData);
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
      {/* Map Display (No changes needed here) */}
      <div className="md:col-span-2 bg-gray-800 p-2 rounded-lg aspect-square">
         <div className="grid grid-cols-100 gap-px" style={{ width: '100%', height: '100%' }}>
            {Array.from({ length: 10000 }).map((_, index) => {
                const x = index % 100;
                const y = Math.floor(index / 100);
                const tile = tiles.find(t => t.x === x && t.y === y);
                return <div key={index} className="aspect-square" style={{ backgroundColor: tile ? tile.color : '#FFFFFF' }} />;
            })}
        </div>
      </div>

      {/* CHANGED: Leaderboards Column Wrapper */}
      <div className="md:col-span-1 space-y-8">
        
        {/* NEW: Community Leaderboard Section */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Community Wars</h2>
          <div className="space-y-3">
            {communities.length > 0 ? communities.map((community) => (
              <div key={community.id}>
                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="truncate pr-2">{community.name}</span>
                  <span>{community.tile_count}</span>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {community.member_count} members
                </div>
              </div>
            )) : <p className="text-center text-gray-400">No communities are on the board yet.</p>}
          </div>
        </div>
        
        {/* Player Leaderboard (No changes needed here) */}
        <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Top Players</h2>
          <ol className="list-decimal list-inside space-y-2">
            {players.map((player) => (
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
    </div>
  );
}
