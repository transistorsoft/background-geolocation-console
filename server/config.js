// ENVIRONMENT VARIABLES :
// PORT (optional, defaulted to 8080) : http port server will listen to
// DB_CONNECTION_URL (defaulted to "sqlite://db/background-geolocation.db") : connection url used to connect to a db
//    Currently, only postgresql & sqlite dialect are supported
//    Sample pattern for postgresql connection url : postgres://<username>:<password>@<hostname>:<port>/<dbname>

export const adminUsername = process.env.ADMIN_USERNAME || 'admin';
export const adminToken = process.env.ADMIN_TOKEN || 'admin';
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
export const dataLogOn = !!process.env.DATA_LOG;
export const firebaseOperationLimit = 500;
export const firebaseURL = process.env.FIREBASE_URL;
export const firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/img, '\n');
export const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
export const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
export const parserLimit = process.env.BODY_PARSER_LIMIT || '1mb';
export const password = process.env.PASSWORD;
export const pgConnectionString = process.env.DATABASE_URL;
export const port = process.env.PORT || 9000;
export const withAuth = !!process.env.SHARED_DASHBOARD;
export const {
  ENCRYPTION_PASSWORD,
  GOOGLE_ANALYTICS_ID,
  GOOGLE_TAG_MANAGER_ID,
  GOOGLE_TAG_ID,
  GOOGLE_MAPS_API_KEY,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  NODE_ENV,
  PURE_CHAT_ID,
} = process.env;

export const developerJWTkey = {
  // eslint-disable-next-line max-len
  public: '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA4zblhDXIs4fQJqqrHual6tNJ+YiXs3nKPGQE+BiF3YYv8Jsp2HICv3R3diUC\ncAub9+4ovgQG1b9Bh1d88BY3tv5ko62CvHdMBbU56bTU5LlwV81XWwRwLTsD+NqtpevUNKiN\n6maFa324JUEO1Kr+HDBSw+MJehDZGfS26aR9d1YX27KuBQCZ8XyIABDVO0R5MQjmRokiTBvc\nK7cicqwnm8AjaQ6HL0eSvJUdh5iWFlpMEFDArFu6rBIthouSvClzGsKe+Yhoh0yIlkIQRWtS\npcIMWP/JSyblZD+vbXWsXR18pfmT9hjA86To7rfoGQUiMgo+emyRQtdaA2KtrKIUnQIDAQAB\n-----END RSA PUBLIC KEY-----\n',
  // eslint-disable-next-line max-len
  private: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA4zblhDXIs4fQJqqrHual6tNJ+YiXs3nKPGQE+BiF3YYv8Jsp2HICv3R3\ndiUCcAub9+4ovgQG1b9Bh1d88BY3tv5ko62CvHdMBbU56bTU5LlwV81XWwRwLTsD+NqtpevU\nNKiN6maFa324JUEO1Kr+HDBSw+MJehDZGfS26aR9d1YX27KuBQCZ8XyIABDVO0R5MQjmRoki\nTBvcK7cicqwnm8AjaQ6HL0eSvJUdh5iWFlpMEFDArFu6rBIthouSvClzGsKe+Yhoh0yIlkIQ\nRWtSpcIMWP/JSyblZD+vbXWsXR18pfmT9hjA86To7rfoGQUiMgo+emyRQtdaA2KtrKIUnQID\nAQABAoIBAGZGg7GrdBg7/hopoLVcJTs6uIW2UnLbU4kzjHkQsNEyYcnwTjm7uDjt+AgaSKqe\nzyoe7f/6WAlG+fwuCXMYzSN2B18V709ec73uAY+NcncycbtUFwpFSSlS80rFRHz3VqINbTQh\nydTE1msOidp4zcFqjxbVz6I+izr/yIYLIN7h7L5w0BSe8zkn2nGXl7rUyFymWuxfaRwY/0k1\nqj5nRc41g/0Gi+9K0UeaCnjrHK23hi76UsHniOSFvOvxmEnLKmnQWIk/UHVCicxxibrCC4fA\nPNbuPCpYtpsbM3sz0ePjZQrwXHigBD7Ue61aF56yS+mm8ExP+rYAWjFn/5UsVAECgYEA+iB/\nvaXUSxMdznsNOf/YYeVoCq8/PMAZMF/xLLUtD38ge967Ez3Oj+7i2AF8jeqxI664xrrNWqM/\nLtaol2JshT2D8KCauv8/n5EbMJjnfIk5YgKbVD1w87d6jcTYIISQmJ1YoustuPsloMpCLs6y\nREyQQn34DtBUAlOKstJQ0l0CgYEA6Iyr7DGjt98AunqeGO/9KKxzbHRiCxMgHLHM8RaWskn/\neY9NcH2maLszaprsQSkFWnLgMlkvlmSLedSFQf6W4haiY0lYFvJHBqxCsZvSDptWmxJLtyyz\nZt0bpUzGHW4T8lCS/hXzxV5exQ3zgtrzj2Dr/vFy9Lx9/sZIgdZKp0ECgYBa7wnB1tHxYUfK\n022hkmQGYzKJ/+BLo8MElTzG9i8lnSAgKH92pVe9eCm8Qf4YUiSIRnMivLL/qq3Dx4KPVtcB\nMbYP+zOFnFpzFnv+FPjDi9fyy+PQom24DRJfDBtO5yLyePHKeRmsUJIDfMTG45pnvjYMFmPi\nbta76cdY76E2eQKBgQC3m1migw7gfhH1KhrpVZJsKrx3ROykEdWo0jkdoNgarJIpSBu8VXit\n+CAAa5FdYSX44/pfxkrsUzZMWp9cG8bFe1l7Ss1iUKgDfL6rvHt9TOh0R13AomqDLNBHEvbZ\nBbB6AWQNeQefLYNl0j4Rcw4ahkvOXpSE5s4T+joFSUxoAQKBgQC3ZSkPVhRR9PW3RFy4Py2E\nfN60Ht8vkJN+i4/du/+5C6M6sHFvis0CWUDQVIsah0DeAutg8DO4v4mbj66kXw0fzsVZhsrp\nSrIVqG0nMKBj6cR3MfFMp9qZaaTmfOAhH+H4TxaLActha9JXqkoavvfD2QO44pRlTRJKTTaz\nXaM/cg==\n-----END RSA PRIVATE KEY-----\n',
};
