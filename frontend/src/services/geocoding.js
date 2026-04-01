import axios from "axios";

/**
 * GEOCODING SERVICE (OpenStreetMap Nominatim)
 * Free, open-source alternative to Google Maps Geocoding
 */

export const geocodeAddress = async (address) => {
  if (!address || address.length < 3) return [];

  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: address,
          format: "json",
          limit: 10,
          addressdetails: 1,
        },
        headers: {
          "Accept-Language": "en-US,en;q=0.5",
        },
      },
    );

    return response.data.map((item) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address: item.address,
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};
