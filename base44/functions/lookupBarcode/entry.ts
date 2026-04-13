import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { barcode } = body;

    if (!barcode) {
      return Response.json({ error: 'Streckkod krävs' }, { status: 400 });
    }

    const artiklar = await base44.entities.Artikel.filter({ streckkod: barcode });
    
    if (artiklar.length === 0) {
      return Response.json({ error: 'Artikel inte hittas' }, { status: 404 });
    }

    const artikel = artiklar[0];
    const uttag = await base44.entities.Uttag.filter({ artikel_id: artikel.id });
    const totalUttag = uttag.reduce((sum, u) => sum + u.antal, 0);
    const lagersaldo = artikel.antal_inköpta - totalUttag;

    return Response.json({
      id: artikel.id,
      benämning: artikel.benämning,
      streckkod: artikel.streckkod,
      pris: artikel.pris,
      lagersaldo,
      lagertröskelvärde: artikel.lagertröskelvärde || 10
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});