export async function fetchNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number,
  signal?: AbortSignal,
  fuelType?: string,
  highwayMode?: boolean,
  route?: [number, number][],
  selectedBrands?: string[],
): Promise<any> {
  try {
    const response = await fetch("/api/stations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat,
        lng,
        radiusMeters,
        fuelType,
        highwayMode,
        route,
        selectedBrands,
      }),
      signal,
    });

    if (response.status === 202) {
      // MIMIT DB is still downloading on backend
      return { loadingStatus: true };
    }

    if (!response.ok) {
      throw new Error("SERVER_FAIL");
    }

    const data = await response.json();
    if (!data || !data.elements) return { elements: [] };

    return {
      elements: data.elements,
      provinceAvg: data.provinceAvg,
      regionalAvg: data.regionalAvg,
      regionName: data.regionName,
      provinceName: data.provinceName,
    };
  } catch (err: any) {
    if (signal?.aborted || err.name === "AbortError") {
      const abortErr = new Error("AbortError");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    console.error("Internal Proxy Fetch failed:", err);
    throw new Error("SERVER_FAIL");
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
