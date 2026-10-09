# ROS 2 from Zero: landing page

The landing page for readers of my ROS 2 article. Readers leave their name, email and ROS 2 experience, download the cheatsheet, and can tick a box to say they'd like the free live 5-day ROS 2 bootcamp.

Plain HTML, CSS and JavaScript. No build step, no dependencies. GitHub Pages serves it straight from the `main` branch.

```
index.html              the page and all its copy
styles.css              design (colours and fonts are at the top in :root)
app.js                  form validation and the Supabase insert
config.js               Supabase URL + anon key (public, see below)
assets/ros2-cheatsheet.pdf   the 10-page cheatsheet download
cheatsheet/cheatsheet.html   source for the PDF
assets/media/           photos and the hero video loop
supabase/schema.sql     table, constraints and Row Level Security
```

## Run it locally

```bash
cd ~/Desktop/ros2-projects-landing
python3 -m http.server 8765
# open http://localhost:8765
```

## Connect Supabase (one time)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor**, paste all of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable** key.
4. Paste them into `config.js`, then commit and push.

Signups appear in **Table Editor → signups**. The `bootcamp_interest_count` view shows how close you are to 10 interested people.

### Why the key in `config.js` is safe

The anon key is meant to be public. What protects the data is Row Level Security: the `anon` role can only **insert** rows into `signups`, and only into the name, email, experience, bootcamp, source and user-agent columns. It has no SELECT, UPDATE or DELETE, so nobody can read, change or delete signups from the browser. CHECK constraints reject malformed data even if someone skips the form. A hidden honeypot field drops simple bots.

**Never** put the `service_role` / secret key in this repo or the page.

If you start getting spam, turn on Supabase's rate limits or put a Cloudflare Turnstile check in front of the form.

## The cheatsheet

`assets/ros2-cheatsheet.pdf` is the 10-page cheatsheet. Its source is `cheatsheet/cheatsheet.html`. To change it, edit that file and re-export the PDF:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf=assets/ros2-cheatsheet.pdf "file://$PWD/cheatsheet/cheatsheet.html"
```

(Or open the HTML in Chrome, Print, Save as PDF, Margins: None, Background graphics: on.) The PDF is public on GitHub Pages, so the form is a gentle gate rather than a lock.

## Edit the copy

All text lives in `index.html`. Things to update:

- **YouTube link**: search for `YOUR_CHANNEL` (two places) and replace it with your channel handle.
- **X link**: already set to `x.com/BharatJain8873`.
- **Headline, stats and bio**: in the hero, stats and about sections.
- **Bootcamp details**: in the `#bootcamp` block.

To see where a signup came from, share the link with `?ref=youtube`, `?ref=x`, and so on. That value is saved in the `source` column.

## Deploy

Pushing to `main` redeploys GitHub Pages automatically (Settings → Pages → Deploy from branch → `main` / root).
