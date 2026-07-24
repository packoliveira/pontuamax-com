import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function tryCreateBucket() {
  console.log("Tentando criar bucket 'product-images' como público via API...");
  const { data, error } = await supabase.storage.createBucket('product-images', {
    public: true
  });

  if (error) {
    console.log("Resultado da tentativa de criação:", error.message);
  } else {
    console.log("✅ Bucket 'product-images' criado com SUCESSO!", data);
  }
}

tryCreateBucket();
