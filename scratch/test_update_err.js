const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('./src/supabaseClient.ts', 'utf8');
const urlMatch = content.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function test() {
  const { data, error } = await supabase.from('dossiers').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Sample dossier columns:', Object.keys(data[0]));
  } else {
    console.log('No dossier found or error:', error);
  }

  // Test individual field updates to pinpoint which column causes 400 error!
  const fields = {
    frais_reservation_paye: true,
    frais_reservation_date_paiement: new Date().toISOString(),
    frais_reservation_reference: 'TEST_REF',
    recu_qr_code: 'http://test',
    recu_url_pdf: '/test.pdf',
    date_rendezvous: '2026-08-27',
    heure_rendezvous: '09:00',
    appointment_date: '2026-08-27',
    rendezvous_confirme: false,
    statut: 'VALIDE'
  };

  for (const [key, val] of Object.entries(fields)) {
    const { error: fieldErr } = await supabase
      .from('dossiers')
      .update({ [key]: val })
      .eq('id', 'dossier_2026_2338');
    if (fieldErr) {
      console.error(`FAILED COLUMN [${key}]:`, fieldErr.message);
    } else {
      console.log(`OK COLUMN [${key}]`);
    }
  }
}

test();
