const isProduction = process.env.NODE_ENV === 'production';

export const API_URI = isProduction
  ? ''
  : '/v1';

export const API_URL = window.location.origin + API_URI;

// Colors
export const COLORS = {
  gold: '#fedd1e',
  white: '#fff',
  blue: '#2677FF',
  light_blue: '#3366cc',
  polyline_color: '#00B3FD',
  green: '#16BE42',
  dark_purple: '#2A0A73',
  grey: '#404040',
  red: '#FE381E',
  dark_red: '#A71300',
  black: '#000',
};

export const MAX_POINTS = 5000;
