import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

console.log("Checking Supabase connection to URL:", url);
const supabase = createClient(url, key);

async function checkBucket() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log("Aviso ao listar buckets:", error.message);
    } else {
      console.log("Buckets públicos/disponíveis:", buckets.map(b => ({ name: b.name, public: b.public })));
      const productImagesBucket = buckets.find(b => b.name === 'product-images');
      if (productImagesBucket) {
        console.log("✅ Bucket 'product-images' ENCONTRADO!", productImagesBucket);
      } else {
        console.log("⚠️ Bucket 'product-images' NÃO foi retornado pela API pública.");
      }
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

checkBucket();
