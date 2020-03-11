// ENVIRONMENT VARIABLES :
// PORT (optional, defaulted to 8080) : http port server will listen to
// DB_CONNECTION_URL (defaulted to "sqlite://db/background-geolocation.db") : connection url used to connect to a db
//    Currently, only postgresql & sqlite dialect are supported
//    Sample pattern for postgresql connection url : postgres://<username>:<password>@<hostname>:<port>/<dbname>

export const adminToken = process.env.ADMIN_TOKEN;
export const ddosBombCompanies = (process.env.DDOS_BOMB_COMPANY_TOKENS || '').split(',');
export const deniedCompanies = (process.env.DENIED_COMPANY_TOKENS || '').split(',');
export const deniedDevices = (process.env.DENIED_DEVICE_TOKENS || '').split(',');
export const devPort = process.env.DEV_PORT || 8080;
export const dyno = process.env.DYNO;
// If client registration fails due to not being connected to network,
// an accessToken: "DUMMY_TOKEN" is provided to the SDK.
// If the server receives this token,
// send an HTTP response status "406 Not Acceptable".
// This signal will be detected by the client
// and it will hit /v2/registration once again.
export const dummyToken = 'DUMMY_TOKEN';
export const isPostgres = !!process.env.DATABASE_URL;
export const desc = isPostgres ? 'DESC NULLS LAST' : 'DESC';
export const isProduction = process.env.NODE_ENV === 'production';
export const firebaseOperationLimit = 500;
export const firebaseURL = process.env.FIREBASE_URL;
export const firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/img, '\n');
export const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
export const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
export const parserLimit = process.env.BODY_PARSER_LIMIT || '1mb';
export const password = process.env.PASSWORD;
export const pgConnectionString = process.env.DATABASE_URL;
export const port = process.env.DEV_PORT || 9000;
export const withAuth = !!process.env.SHARED_DASHBOARD;
export const {
  ENCRYPTION_PASSWORD,
  GOOGLE_ANALYTICS_ID,
  GOOGLE_MAPS_API_KEY,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  NODE_ENV,
  PURE_CHAT_ID,
} = process.env;
