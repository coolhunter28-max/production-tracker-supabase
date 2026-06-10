import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", !!supabaseUrl);
console.log("SERVICE:", !!serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase env variables");
}

const admin = createClient(supabaseUrl, serviceRoleKey);

const userId = "411ef683-81f1-4a17-bfa6-6de038971ec2";

const { data, error } = await admin.auth.admin.updateUserById(userId, {
  password: "Temporal123!",
});

if (error) {
  console.error(error);
} else {
  console.log("Password updated:", data.user.email);
}