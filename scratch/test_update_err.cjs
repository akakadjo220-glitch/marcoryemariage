const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-c4czoot39vrokbodehd9vinu.84.234.99.41.sslip.io';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwOTMwMCwiZXhwIjo0OTM1NTgyOTAwLCJyb2xlIjoiYW5vbiJ9.EMb7Jld34ITYxbGKVwbD3XQTbgJ04C1CUUjW4Z5H7dw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCorrectUpdate() {
  const dossierId = 'dossier_2026_2338';
  const now = new Date().toISOString();
  const reference = 'EMAR_' + Date.now();
  const qrCodeVerificationUrl = `https://e-mariage.ci/verify-receipt/${dossierId}`;
  const appointmentDateStr = '2026-08-27';
  const appointmentTimeStr = '09:00:00';

  const { data, error } = await supabase
    .from('dossiers')
    .update({
      frais_reservation_paye: true,
      frais_reservation_date_paiement: now,
      frais_reservation_reference: reference,
      recu_qr_code: qrCodeVerificationUrl,
      recu_url_pdf: `/receipts/receipt_${dossierId}.pdf`,
      date_rendezvous: appointmentDateStr,
      heure_rendezvous: appointmentTimeStr,
      appointment_date: appointmentDateStr,
      rendezvous_confirme: false,
      status: 'approved',
      statut: 'VALIDE'
    })
    .eq('id', dossierId)
    .select();

  console.log('Update error:', error);
  console.log('Updated record:', data ? { id: data[0].id, frais_reservation_paye: data[0].frais_reservation_paye, status: data[0].status, statut: data[0].statut } : null);
}

testCorrectUpdate();
