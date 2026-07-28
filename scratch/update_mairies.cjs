const { createClient } = require('@supabase/supabase-js');

const url = 'https://supabasekong-jkp2ehspzqpxaj58dmdopaep.193.29.187.66.sslip.io';
const serviceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTIzMjM4MCwiZXhwIjo0OTQwOTA1OTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Nzn4QNSX6MIc3tNAa6UAbUzns5EeZPqvSnWWfYP2iZY';

const client = createClient(url, serviceKey);

async function updateMairies() {
  console.log('Updating mairies table in Marcory database...');
  
  // Fetch existing
  const { data: existing } = await client.from('mairies').select('*');
  console.log('Existing mairies:', existing);

  // Update rows to Marcory
  for (const m of existing || []) {
    const newRegion = m.region ? m.region.replace(/Cocody/g, 'Marcory').replace(/Angré/g, 'Anoumabo') : 'Mairie Principale (Marcory)';
    const newDesc = m.description ? m.description.replace(/Cocody/g, 'Marcory').replace(/Angré/g, 'Anoumabo') : 'Mairie de Marcory';
    
    await client.from('mairies').update({
      region: newRegion,
      access_code: 'MARCORY2026',
      description: newDesc
    }).eq('id', m.id);
  }

  const { data: updated } = await client.from('mairies').select('*');
  console.log('Updated mairies:', updated);
}

updateMairies();
