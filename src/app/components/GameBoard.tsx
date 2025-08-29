'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Define the data structure for a single tile on the map
type Tile = {
  x: number;
  y: number;
  color: string;
  owner_address: string;
};

// Define the data structure for a player on the leaderboard
type Player = {
  owner_address: string;
  tile_count: number;
  pixel_balance: number;
};

// Define the data structure for a community on the leaderboard
type Community = {
  id: number;
  name: string;
  tile_count: number;
  member_count: number;
};

export default function GameBoard() {
  // State variables to hold our data
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This effect runs once when the component mounts to fetch all game data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      // 1. Get the current active season from the database
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons').select('id').eq('is_active', true).single();
        
      if (seasonError || !seasonData) {
        console.error("No active season found. The game may need to be initialized.");
        setIsLoading(false);
        return;
      }
      const activeSeasonId = seasonData.id;

      // 2. Fetch all tiles for rendering the map display
      const { data: tileData, error: tileError } = await supabase
        .from('tiles')
        .select('x, y, color, owner_address')
        .eq('season_id', activeSeasonId);
      if (tileData) {
        setTiles(tileData);
      }

      // 3. Fetch the top 10 player stats using our efficient SQL function
      const { data: playerData, error: playerError } = await supabase
        .rpc('get_player_stats', { current_season_id: activeSeasonId });

      if (playerData) {
        // Map the wallet_address to owner_address to match our type definition
        setPlayers(playerData.map(p => ({ ...p, owner_address: p.wallet_address })));
      }

      // 4. Fetch the community stats using our efficient SQL function
      const { data: communityData, error: communityError } = await supabase
        .rpc('get_community_stats', { current_season_id: activeSeasonId });

      if (communityData) {
        setCommunities(communityData);
      }
      
      // Log any errors for easier debugging
      if (tileError || playerError || communityError) {
        console.error('Error fetching data:', { tileError, playerError, communityError });
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Display a loading message while fetching data
  if (isLoading) {
    return <p className="text-center text-lg">Loading the battlefield...</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Map Display Column */}
      <div className="md:col-span-2 bg-gray-800 p-2 rounded-lg aspect-square">
         <div className="grid grid-cols-100 gap-px" style={{ width: '100%', height: '100%' }}>
            {/* Create a 100x100 grid of divs (10,000 total) */}
            {Array.from({ length: 10000 }).map((_, index) => {
                const x = index % 100;
                const y = Math.floor(index / 100);
                // Find if a tile from our fetched data matches this coordinate
                const tile = tiles.find(t => t.x === x && t.y === y);
                return (
                    <div
                        key={index}
                        className="aspect-square"
                        // If a tile exists, use its color; otherwise, default to white
                        style={{ backgroundColor: tile ? tile.color : '#FFFFFF' }}
                    />
                );
            })}
        </div>
      </div>

      {/* Leaderboards Column */}
      <div className="md:col-span-1 space-y-8">
        
        {/* Community Leaderboard */}
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
        
        {/* Player Leaderboard */}
        <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Top Players</h2>
          <ol className="list-decimal list-inside space-y-3">
            {players.map((player) => (
              <li key={player.owner_address} className="truncate">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm bg-gray-700 p-1 rounded">
                    {player.owner_address.substring(0, 6)}...{player.owner_address.substring(player.owner_address.length - 4)}
                  </span>
                  <span className="font-bold">{player.tile_count} tiles</span>
                </div>
                <div className="text-xs text-yellow-400 text-right font-semibold">
                  {player.pixel_balance || 0} $PIXEL
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
