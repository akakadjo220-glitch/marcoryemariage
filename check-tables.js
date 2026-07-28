const url = 'https://supabasekong-jkp2ehspzqpxaj58dmdopaep.193.29.187.66.sslip.io/rest/v1/';
const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTIzMjM4MCwiZXhwIjo0OTQwOTA1OTgwLCJyb2xlIjoiYW5vbiJ9.WIfduBoXy0Qnnc-MI2OwcH6CtsLxgq5rtB95uudxCg4';

async function main() {
  console.log("Fetching API schema...");
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const schema = await res.json();
    console.log("Available paths:");
    console.log(Object.keys(schema.paths));
    console.log("Available definitions:");
    console.log(Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
