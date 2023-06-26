// optional peer dependency - this ts-ignore should help when user is not using it
// @ts-ignore
import type { Headers } from 'google-auth-library/build/src/auth/oauth2client';

/** single type to handle all valid auth types */
export type GoogleApiAuth =
  // this simple interface should cover all google-auth-library auth methods
  | { getRequestHeaders: () => Promise<Headers> }
  // used to pass in an API key only
  | { apiKey: string }
  // used to pass in a raw token
  | { token: string };

export enum AUTH_MODES {
  GOOGLE_AUTH_CLIENT = 'google_auth',
  RAW_ACCESS_TOKEN = 'raw_access_token',
  API_KEY = 'api_key'
}
