// The only file you need to edit.
//
// Supabase: paste the Project URL and the anon / publishable key from
// Supabase dashboard → Project Settings → API. Both are PUBLIC by design and safe to
// commit: with supabase/schema.sql in place the key can only call submit_signup(),
// which validates everything and cannot read, change or delete rows.
// NEVER put the service_role / secret key in this file or anywhere in this repo.
window.SITE_CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdefghijklmnop.supabase.co"
  supabaseAnonKey: "",  // e.g. "sb_publishable_..." or the legacy "eyJ..." anon key

  pdf: "assets/ros2-cheatsheet.pdf",

  // Every link on the page reads from here.
  links: {
    article: "https://x.com/BharatJain8873",   // the X article, once it is live
    youtube: "https://www.youtube.com/",        // your channel URL
    x: "https://x.com/BharatJain8873",
    github: "https://github.com/itsbharatj"
  }
};
