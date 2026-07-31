import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDelete() {
  const email = "intan@gmail.com";
  // The old id for intan was fb266643-e737-479a-8fb4-e0fb27be7149
  const id = "fb266643-e737-479a-8fb4-e0fb27be7149";
  
  const { data, error } = await supabase.auth.admin.deleteUser(id);
  console.log("Delete error:", error);
}

testDelete();
