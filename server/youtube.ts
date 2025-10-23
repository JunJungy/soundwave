// YouTube API helper for searching songs
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function searchYouTubeVideo(songTitle: string, artistName: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY not configured");
    return null;
  }

  try {
    const query = `${songTitle} ${artistName} official audio`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      console.log(`Found YouTube video for "${songTitle}" by ${artistName}: ${videoId}`);
      return videoId;
    }
    
    console.log(`No YouTube video found for "${songTitle}" by ${artistName}`);
    return null;
  } catch (error) {
    console.error(`Error searching YouTube for "${songTitle}" by ${artistName}:`, error);
    return null;
  }
}
