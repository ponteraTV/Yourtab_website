# YourTab Google Sign-In setup

The Login and Registration pages support Google Identity Services. Google sign-in remains inactive until the same OAuth Web client ID is configured for the web build and API.

## 1. Create a Google OAuth client

1. Open https://console.cloud.google.com/
2. Select or create a Google Cloud project.
3. Configure the OAuth consent screen and add the app name, support email, and authorized domains required by Google.
4. Create an OAuth Client ID with application type **Web application**.
5. Add this authorized JavaScript origin:
   - `https://yourtab.yourtab.workers.dev`
6. Copy the **Client ID**. Never put a client secret in frontend code.

## 2. Configure the frontend build

Set the public Client ID in the environment used when building `apps/web`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Then rebuild the static site and deploy the generated assets to Cloudflare Worker. This value is public by design; it is not a secret.

## 3. Configure the API

Add the same Client ID to `/opt/yourtab/infrastructure/production/.env` on the server:

```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Restart the API after updating the environment so the new variable is loaded. The API verifies the Google ID token with Google's token verification endpoint and checks that its audience matches this Client ID before creating a session.

## 4. Test

1. Open `https://yourtab.yourtab.workers.dev/login`.
2. Click **Continue with Google** and select an account.
3. Confirm that you return to YourTab signed in.
4. Sign out and repeat from `/register`.
5. Check that an invalid or unverified Google token is rejected.

Do not commit credentials or paste any client secret into chat. If you need help configuring this, share only the Client ID (not a client secret) when appropriate.
