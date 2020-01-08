// @flow

// eslint-disable-next-line import/prefer-default-export
export const makeHeaders = (authInfo: AuthInfo): Object => {
  const { accessToken } = authInfo;
  const headers = { 'Content-Type': 'application/json' };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};
