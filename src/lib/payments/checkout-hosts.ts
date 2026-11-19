// Exact FedaPay hosted-checkout hosts. The official SDK (fedapay@1.2.5) returns
// payment links on process.fedapay.com; checkout.fedapay.com is kept for compatibility.
// Shared by the server and the browser: no Node.js imports here.
const CHECKOUT_HOSTS = {
  live: ['process.fedapay.com', 'checkout.fedapay.com'],
  sandbox: ['sandbox-process.fedapay.com', 'sandbox-checkout.fedapay.com'],
} as const;

export function isFedaPayCheckoutUrl(url: URL, environment: 'sandbox' | 'live') {
  return url.protocol === 'https:' && !url.port && !url.username && !url.password
    && (CHECKOUT_HOSTS[environment] as readonly string[]).includes(url.hostname);
}
