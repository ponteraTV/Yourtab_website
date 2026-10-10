# DigitalOcean Spaces CORS for YourTab uploads

Direct browser uploads use short-lived presigned PUT URLs. The Spaces bucket must permit browser CORS requests from the exact frontend origin; API CORS settings do not configure Spaces CORS.

In DigitalOcean: **Spaces → vaultstream-media → Settings → CORS Configurations**, add a rule with:

- **Allowed origins** (add the exact origin used in the browser):
  - `https://yourtab.pages.dev`
  - `https://yourtab.yourtab.workers.dev`
  - `https://yourtab-website.yourtab.workers.dev`
- **Allowed methods:** `GET`, `HEAD`, `PUT`
- **Allowed headers:** `*` (or at minimum `Content-Type`)
- **Expose headers:** `ETag`
- **Max age:** `3000` seconds

Only keep origins that YourTab actually uses. Do not use `*` for origins if you later enable credentialed storage requests. The presigned PUT itself does not send cookies.

After saving the rule, wait briefly and retry one small MP4. If the admin UI reports a storage/CORS error, check the browser's failed PUT request and the exact origin above. Keep the signed `Content-Type` identical to the upload request's `Content-Type`.
