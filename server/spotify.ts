import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// Do not cache connection settings - always fetch fresh
async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);
  
  if (!connectionSettings?.settings) {
    throw new Error('Spotify not connected');
  }
  
  const refreshToken = connectionSettings.settings.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings.settings.access_token || connectionSettings.settings.oauth?.credentials?.access_token;
  const clientId = connectionSettings.settings.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings.settings.oauth?.credentials?.expires_in;
  
  if (!accessToken || !clientId || !refreshToken) {
    throw new Error('Spotify not connected');
  }
  
  return {accessToken, clientId, refreshToken, expiresIn};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableSpotifyClient() {
  const {accessToken, clientId, refreshToken, expiresIn} = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

// Add delay helper to avoid rate limiting
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to search for a track and get its preview URL
export async function searchTrack(trackName: string, artistName: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Always get a fresh client for each request
      const spotify = await getUncachableSpotifyClient();
      const query = `track:${trackName} artist:${artistName}`;
      const results = await spotify.search(query, ['track'], undefined, 1);
      
      if (results.tracks.items.length > 0) {
        const track = results.tracks.items[0];
        // Add a small delay to avoid rate limiting
        await delay(100);
        return {
          name: track.name,
          artist: track.artists[0].name,
          previewUrl: track.preview_url,
          duration: Math.floor(track.duration_ms / 1000),
          albumName: track.album.name,
          albumCover: track.album.images[0]?.url,
          spotifyUrl: track.external_urls.spotify,
        };
      }
      return null;
    } catch (error: any) {
      if (attempt < retries && (error.message?.includes('OAuth') || error.message?.includes('401'))) {
        console.log(`Retry ${attempt}/${retries} for ${trackName}...`);
        await delay(1000 * attempt); // Exponential backoff
        continue;
      }
      console.error(`Error searching for track ${trackName} by ${artistName}:`, error);
      return null;
    }
  }
  return null;
}

// Get multiple tracks for an artist
export async function getArtistTopTracks(artistName: string, limit = 10) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const artistResults = await spotify.search(artistName, ['artist'], undefined, 1);
    
    if (artistResults.artists.items.length === 0) {
      return [];
    }
    
    const artistId = artistResults.artists.items[0].id;
    const topTracks = await spotify.artists.topTracks(artistId, 'US');
    
    return topTracks.tracks.slice(0, limit).map(track => ({
      name: track.name,
      artist: track.artists[0].name,
      previewUrl: track.preview_url,
      duration: Math.floor(track.duration_ms / 1000),
      albumName: track.album.name,
      albumCover: track.album.images[0]?.url,
      spotifyUrl: track.external_urls.spotify,
    }));
  } catch (error) {
    console.error(`Error getting top tracks for ${artistName}:`, error);
    return [];
  }
}

// Get album with tracks
export async function getAlbum(albumName: string, artistName: string) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const query = `album:${albumName} artist:${artistName}`;
    const results = await spotify.search(query, ['album'], undefined, 1);
    
    if (results.albums.items.length === 0) {
      return null;
    }
    
    const album = results.albums.items[0];
    const albumDetails = await spotify.albums.get(album.id);
    
    return {
      name: albumDetails.name,
      artist: albumDetails.artists[0].name,
      coverUrl: albumDetails.images[0]?.url,
      releaseYear: parseInt(albumDetails.release_date.split('-')[0]),
      tracks: albumDetails.tracks.items.map(track => ({
        name: track.name,
        duration: Math.floor(track.duration_ms / 1000),
        previewUrl: track.preview_url,
        trackNumber: track.track_number,
      })),
    };
  } catch (error) {
    console.error(`Error getting album ${albumName} by ${artistName}:`, error);
    return null;
  }
}
