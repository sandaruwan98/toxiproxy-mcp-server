// Toxiproxy API base URL
export const TOXIPROXY_URL = "http://localhost:8474";

// Helper function to make HTTP requests to Toxiproxy API
export async function toxiproxyRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${TOXIPROXY_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Toxiproxy API error (${response.status}): ${errorText}`);
    }
    
    const text = await response.text().then(t => t.trim()); // Trim all responses
    
    // Handle special cases where response is not JSON
    if (endpoint === "/version") {
      return text; // Version endpoint returns plain text
    }
    
    // Try to parse as JSON, return text if parsing fails
    try {
      return text ? JSON.parse(text) : null;
    } catch (parseError) {
      return text; // Return raw text if JSON parsing fails
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error("Cannot connect to Toxiproxy server. Make sure it's running on localhost:8474");
    }
    throw error;
  }
}