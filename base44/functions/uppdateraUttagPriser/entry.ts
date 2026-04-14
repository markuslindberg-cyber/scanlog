import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { event, data, old_data } = body;

  // Kör bara om priset faktiskt ändrats
  if (!old_data || data.pris === old_data.pris) {
    return Response.json({ message: 'Ingen prisändring, hoppar över.' });
  }

  const artikelId = data.id;
  const nyttPris = data.pris;

  // Hämta alla uttag för denna artikel
  const uttag = await base44.asServiceRole.entities.Uttag.filter({ artikel_id: artikelId });

  if (uttag.length === 0) {
    return Response.json({ message: 'Inga uttag att uppdatera.' });
  }

  // Uppdatera varje uttag med det nya priset per enhet
  for (const u of uttag) {
    const nyttTotalt = u.antal * nyttPris;
    await base44.asServiceRole.entities.Uttag.update(u.id, { pris: nyttTotalt });
  }

  return Response.json({ message: `${uttag.length} uttag uppdaterade med nytt pris.` });
});