import { getResend, FROM_EMAIL } from './resend';

interface SendDownloadEmailParams {
  to: string;
  productName: string;
  downloadUrl: string;
}

export async function sendDownloadEmail({ to, productName, downloadUrl }: SendDownloadEmailParams) {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your download: ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; background: #4f46e5; color: white; font-weight: bold; font-size: 24px; width: 48px; height: 48px; line-height: 48px; border-radius: 8px;">Q</div>
                </div>

                <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px; text-align: center;">Your Download is Ready!</h1>

                <p style="color: #52525b; margin-bottom: 24px;">Thank you for your interest in <strong>${productName}</strong>. Click the button below to download your file.</p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${downloadUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Download Now</a>
                </div>

                <p style="color: #71717a; font-size: 14px; margin-top: 24px;">This link is valid for 24 hours and allows up to 3 downloads.</p>

                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

                <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                  If the button doesn't work, copy and paste this URL:<br>
                  <a href="${downloadUrl}" style="color: #4f46e5; word-break: break-all;">${downloadUrl}</a>
                </p>
              </div>

              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
                © ${new Date().getFullYear()} SuitedPlay. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send download email:', error);
    return { success: false, error };
  }
}

interface SendWelcomeEmailParams {
  to: string;
  locale?: string;
}

export async function sendWelcomeEmail({ to, locale = 'en' }: SendWelcomeEmailParams) {
  const isSwedish = locale === 'sv';

  const subject = isSwedish
    ? 'Välkommen till SuitedPlay!'
    : 'Welcome to SuitedPlay!';

  const heading = isSwedish
    ? 'Välkommen!'
    : 'Welcome!';

  const body = isSwedish
    ? 'Tack för att du prenumererar på vårt nyhetsbrev. Du kommer att få uppdateringar om nya produkter, exklusiva erbjudanden och tips för att skapa oförglömliga stunder.'
    : "Thank you for subscribing to our newsletter. You'll receive updates about new products, exclusive offers, and tips for creating unforgettable moments.";

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; background: #4f46e5; color: white; font-weight: bold; font-size: 24px; width: 48px; height: 48px; line-height: 48px; border-radius: 8px;">Q</div>
                </div>

                <h1 style="color: #18181b; font-size: 24px; margin-bottom: 16px; text-align: center;">${heading}</h1>

                <p style="color: #52525b; margin-bottom: 24px;">${body}</p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/products" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    ${isSwedish ? 'Utforska Produkter' : 'Explore Products'}
                  </a>
                </div>
              </div>

              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
                © ${new Date().getFullYear()} SuitedPlay. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error };
  }
}
