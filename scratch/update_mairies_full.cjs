const { createClient } = require('@supabase/supabase-js');

const url = 'https://supabasekong-jkp2ehspzqpxaj58dmdopaep.193.29.187.66.sslip.io';
const serviceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTIzMjM4MCwiZXhwIjo0OTQwOTA1OTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Nzn4QNSX6MIc3tNAa6UAbUzns5EeZPqvSnWWfYP2iZY';

const client = createClient(url, serviceKey);

async function main() {
  const singleMairie = {
    id: 'marcory_principale',
    name: 'Mairie de Marcory — Salle des Mariages',
    region: 'Mairie Principale (Marcory)',
    access_code: 'MARCORY2026',
    is_active: true
  };

  const { error: insErr } = await client.from('mairies').insert(singleMairie);
  if (insErr) console.error('Insert error:', insErr);
  else console.log('Successfully inserted single Marcory Mairie!');

  const { data } = await client.from('mairies').select('*');
  console.log('Final mairies in DB:', data);
}

main();
