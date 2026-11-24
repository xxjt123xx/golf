"use client";
import { createAuthClient } from "better-auth/react";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

// oauthProviderClient carries the signed oauth_query through sign-in and consent.
export const authClient = createAuthClient({ plugins: [oauthProviderClient()] });
