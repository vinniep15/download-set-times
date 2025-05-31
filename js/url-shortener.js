/**
 * URL Shortener Service
 * Handles encoding and decoding data for sharing favorites
 * Uses Base64 encoding to include data directly in URL hash fragments
 * This approach allows sharing across different browsers and devices
 */

/**
 * Encodes favorites data for inclusion in a URL hash fragment
 * @param {string} encodedData - The encoded favorites data 
 * @returns {Promise<string>} A promise that resolves to a base64-encoded hash fragment
 */
function shortenUrl(encodedData) {
  // Instead of generating a random ID and storing the data,
  // we'll encode the data directly into a hash fragment
  // The browser will handle compression for long URLs
  
  try {
    // Base64 encode the data to make it URL-safe
    // Note: btoa() only works with ASCII strings, so we use encodeURIComponent first
    const base64Data = btoa(encodeURIComponent(encodedData));
    
    // Generate the hash fragment that will contain all the data
    const hashFragment = base64Data;
    
    return Promise.resolve(hashFragment);
  } catch (error) {
    console.error('Error encoding data for URL:', error);
    return Promise.reject(error);
  }
}

/**
 * Decodes favorites data from a URL hash fragment
 * @param {string} hashFragment - The base64-encoded hash fragment
 * @returns {Promise<string|null>} A promise that resolves to the original encoded data, or null if decoding fails
 */
function expandUrl(hashFragment) {
  try {
    // Decode the base64 data back to the original encoded favorites string
    const decodedData = decodeURIComponent(atob(hashFragment));
    return Promise.resolve(decodedData);
  } catch (error) {
    console.error('Error decoding data from URL:', error);
    return Promise.resolve(null);
  }
}

// Export the functions
export { shortenUrl, expandUrl };
