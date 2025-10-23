import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);
   const refreshToken =
    connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings.settings?.oauth?.credentials?.expires_in;
  if (!connectionSettings || (!accessToken || !clientId || !refreshToken)) {
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

// Helper function to search for a track and get its preview URL
export async function searchTrack(trackName: string, artistName: string) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const query = `track:${trackName} artist:${artistName}`;
    const results = await spotify.search(query, ['track'], undefined, 1);
    
    if (results.tracks.items.length > 0) {
      const track = results.tracks.items[0];
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
  } catch (error) {
    console.error(`Error searching for track ${trackName} by ${artistName}:`, error);
    return null;
  }
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
