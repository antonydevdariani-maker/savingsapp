import * as Localization from "expo-localization";

const locale = Localization.getLocales()[0];
export const currencyCode = locale?.currencyCode ?? "USD";
export const currencySymbol =
  (0).toLocaleString(locale?.languageTag ?? "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).replace(/[0-9]/g, "").trim();

export function formatMoney(amount: number, opts?: { decimals?: boolean }) {
  return amount.toLocaleString(locale?.languageTag ?? "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: opts?.decimals === false ? 0 : 2,
    maximumFractionDigits: opts?.decimals === false ? 0 : 2,
  });
}
