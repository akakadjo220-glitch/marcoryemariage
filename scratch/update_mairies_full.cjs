const { createClient } = require('@supabase/supabase-js');

const url = 'https://supabasekong-jkp2ehspzqpxaj58dmdopaep.193.29.187.66.sslip.io';
const serviceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTIzMjM4MCwiZXhwIjo0OTQwOTA1OTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Nzn4QNSX6MIc3tNAa6UAbUzns5EeZPqvSnWWfYP2iZY';

const client = createClient(url, serviceKey);

async function main() {
  console.log('Updating mairies to Marcory...');
  
  const mairies = [
    {
      id: 'cocody_salle_prestige',
      name: 'Hôtel de Ville — Salle Prestige (Salle 1)',
      region: 'Mairie Principale (Marcory)',
      access_code: 'MARCORY2026',
      is_active: true
    },
    {
      id: 'cocody_salle_union',
      name: "Hôtel de Ville — Salle de l'Union (Salle 2)",
      region: 'Mairie Principale (Marcory)',
      access_code: 'MARCORY2026',
      is_active: true
    },
    {
      id: 'cocody_salle_annexe',
      name: 'Mairie Annexe — Salle des Célébrations',
      region: 'Mairie Annexe (Anoumabo)',
      access_code: 'MARCORY2026',
      is_active: true
    }
  ];

  for (const m of mairies) {
    const { error } = await client.from('mairies').upsert(m);
    if (error) console.error('Error updating m:', m.id, error);
    else console.log('Successfully updated:', m.id);
  }

  const { data } = await client.from('mairies').select('*');
  console.log('Final mairies in DB:', data);
}

main();
