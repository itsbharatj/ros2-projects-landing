// Supabase connection for the signup form.
//
// Paste your Project URL and your anon / publishable key here
// (Supabase dashboard → Project Settings → API).
//
// Both values are PUBLIC by design and safe to commit: the table only accepts
// inserts from the browser (see supabase/schema.sql). NEVER put the
// service_role / secret key in this file or anywhere in this repo.
window.SIGNUP_CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdefghijklmnop.supabase.co"
  supabaseAnonKey: "",  // e.g. "sb_publishable_..." or the legacy "eyJ..." anon key
  table: "signups",
  source: "ros2-article",
};
