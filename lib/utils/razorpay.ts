/**
 * Dynamically loads the Razorpay Checkout SDK script if not already present.
 */
export async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay checkout modal
 */
export async function openRazorpayCheckout(options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}): Promise<{ paymentId: string; orderId: string; signature: string }> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      ...options,
      handler: function (response: any) {
        if (response.razorpay_payment_id && response.razorpay_signature) {
          resolve({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id || options.order_id,
            signature: response.razorpay_signature,
          });
        } else {
          reject(new Error('Invalid response received from Razorpay payment checkout.'));
        }
      },
      modal: {
        ondismiss: function () {
          reject(new Error('Payment checkout was cancelled.'));
        },
      },
    });
    rzp.open();
  });
}
