export async function estimateVehicleData(query: string) {
  try {
    const response = await fetch('/api/vehicle-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) throw new Error("AI_FAIL");
    return await response.json();
  } catch (err) {
    console.error("Error from AI Proxy:", err);
    return null;
  }
}
