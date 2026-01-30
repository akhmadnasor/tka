import { AppConfig } from './types';

export const LOGO_URL = "https://lh3.googleusercontent.com/d/1UXDrhKgeSjfFks_oXIMOVYgxFG_Bh1nm";

export const DEFAULT_CONFIG: AppConfig = {
  appName: "UJI TKA MANDIRI",
  logoUrl: LOGO_URL,
  themeColor: "#2563eb", // blue-600
  antiCheat: {
    enabled: true,
    freezeDuration: 15,
    warningMessage: "Dilarang curang! Browser Anda terkunci sementara."
  }
};
