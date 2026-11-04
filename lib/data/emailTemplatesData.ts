import { EmailTemplate } from '../types';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // =========================================================================
  // 1. USER & ACCOUNT EMAILS
  // =========================================================================
  {
    id: 'tpl_welcome',
    name: 'Welcome / Account Created',
    category: 'account',
    description: 'Sent immediately when a new user signs up or posts their first ad.',
    subject: 'Welcome to {{site_name}}, {{user_name}}! 🎉',
    bodyText: 'Hi {{user_name}},\n\nWelcome to {{site_name}}! Your account has been created successfully. You can now post classified ads, chat with verified buyers, and discover great deals across India.\n\nStart exploring: {{site_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">{{site_name}}</h1>
  </div>
  <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Welcome aboard, {{user_name}}! 🎉</h2>
    <p>Thank you for joining India's favorite classifieds community. Your account is active and ready to buy and sell safely.</p>
    <div style="background: #f8fafc; border-left: 4px solid #002f34; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Your Registered Email:</strong> {{user_email}}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #334155;"><strong>Member Since:</strong> {{date_today}}</p>
    </div>
    <p>Here is what you can do next:</p>
    <ul style="padding-left: 20px; color: #334155;">
      <li>Post ads in under 60 seconds with photos & video.</li>
      <li>Chat in real-time with verified buyers and sellers.</li>
      <li>Set location filters to buy items right in your neighborhood.</li>
    </ul>
    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="{{site_url}}/my-account" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Go to My Account</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}. All rights reserved. • {{footer_address}}
  </div>
</div>`,
    actionLabel: 'Go to My Account',
    actionUrl: '{{site_url}}/my-account',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Rajesh Kumar' },
      { key: '{{user_email}}', label: 'User Email', sample: 'rajesh.kumar@example.com' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{site_url}}', label: 'Site URL', sample: 'https://chillyads.com' },
      { key: '{{date_today}}', label: 'Registration Date', sample: '22 Sept 2026' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
      { key: '{{footer_address}}', label: 'Footer Address', sample: 'Mumbai, Maharashtra, India' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_email_verify',
    name: 'Email Verification',
    category: 'account',
    description: 'Sent when a user needs to verify their email address.',
    subject: 'Please verify your email for {{site_name}}',
    bodyText: 'Hi {{user_name}},\n\nPlease click the link below to verify your email address:\n{{verification_url}}\n\nThis link will expire in 24 hours.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Verify your email address</h2>
    <p>Hi {{user_name}}, please confirm your email address to unlock verified seller privileges on {{site_name}}.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{verification_url}}" style="background: #00a49f; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Or copy and paste this URL into your browser:<br/><a href="{{verification_url}}" style="color: #00a49f; word-break: break-all;">{{verification_url}}</a></p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">If you did not request this email, no further action is required.</p>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • {{footer_address}}
  </div>
</div>`,
    actionLabel: 'Verify Email Address',
    actionUrl: '{{verification_url}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Pooja Sharma' },
      { key: '{{user_email}}', label: 'User Email', sample: 'pooja.sharma@example.com' },
      { key: '{{verification_url}}', label: 'Verification Link', sample: 'https://chillyads.com/verify?token=xyz123' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
      { key: '{{footer_address}}', label: 'Footer Address', sample: 'Mumbai, Maharashtra, India' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_password_reset',
    name: 'Password Reset Request',
    category: 'account',
    description: 'Sent when a user requests a password reset link.',
    subject: 'Reset your password for {{site_name}}',
    bodyText: 'Hi {{user_name}},\n\nWe received a request to reset your password. Click the link below to set a new password:\n{{reset_password_url}}\n\nIf you did not request this, please ignore this email.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Password Reset Request</h2>
    <p>Hi {{user_name}},</p>
    <p>We received a request to reset the password associated with your account (<strong>{{user_email}}</strong>).</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{reset_password_url}}" style="background: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset My Password</a>
    </div>
    <div style="background: #fff1f2; border: 1px solid #ffe4e6; padding: 12px; border-radius: 6px; font-size: 13px; color: #9f1239;">
      ⚠️ For your security, this password reset link is valid for <strong>15 minutes</strong>.
    </div>
    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Request IP: {{ip_address}} • If you did not make this request, please change your password immediately.</p>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Security Team
  </div>
</div>`,
    actionLabel: 'Reset My Password',
    actionUrl: '{{reset_password_url}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Vikram Roy' },
      { key: '{{user_email}}', label: 'User Email', sample: 'vikram.roy@example.com' },
      { key: '{{reset_password_url}}', label: 'Reset Link', sample: 'https://chillyads.com/reset-password?token=sec987' },
      { key: '{{ip_address}}', label: 'Requester IP', sample: '103.21.12.84' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_password_changed',
    name: 'Password Changed Alert',
    category: 'account',
    description: 'Security confirmation after password has been successfully updated.',
    subject: 'Security Alert: Your {{site_name}} password was changed',
    bodyText: 'Hi {{user_name}},\n\nYour password for {{site_name}} was successfully updated on {{timestamp}}.\n\nIf this was not you, please contact support immediately.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Password Successfully Changed</h2>
    <p>Hi {{user_name}},</p>
    <p>This is a confirmation that your account password was changed on <strong>{{timestamp}}</strong> from IP: {{ip_address}}.</p>
    <p>If you made this change, you can safely disregard this email.</p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 14px; border-radius: 6px; font-size: 13px; color: #991b1b; margin-top: 20px;">
      <strong>Did not make this change?</strong> Please secure your account immediately or contact our Trust & Safety team: <a href="mailto:{{support_email}}" style="color: #b91c1c;">{{support_email}}</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Security Team
  </div>
</div>`,
    actionLabel: 'Contact Security Team',
    actionUrl: 'mailto:{{support_email}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Rohan Mehta' },
      { key: '{{timestamp}}', label: 'Timestamp', sample: '22 Sept 2026, 09:30 AM IST' },
      { key: '{{ip_address}}', label: 'IP Address', sample: '49.36.128.90' },
      { key: '{{support_email}}', label: 'Support Email', sample: 'security@chillyads.com' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_account_deactivated',
    name: 'Account Deactivated / Suspended',
    category: 'account',
    description: 'Notice when an account has been suspended or deactivated by moderation.',
    subject: 'Notice regarding your {{site_name}} account status',
    bodyText: 'Hi {{user_name}},\n\nYour {{site_name}} account has been suspended. Reason: {{rejection_reason}}.\n\nIf you believe this is an error, please contact support: {{support_email}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #1e293b; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #e11d48; margin-top: 0;">Account Suspension Notice</h2>
    <p>Hi {{user_name}},</p>
    <p>We are writing to inform you that your {{site_name}} account has been suspended due to policy violations.</p>
    <div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 14px; margin: 18px 0;">
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Reason:</strong> {{rejection_reason}}</p>
    </div>
    <p>All active classified ads linked to this account have been temporarily unlisted.</p>
    <p>If you believe this action was taken in error, you may file an appeal by contacting our compliance desk: <a href="mailto:{{support_email}}" style="color: #002f34; font-weight: bold;">{{support_email}}</a></p>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Moderation & Compliance Desk
  </div>
</div>`,
    actionLabel: 'Contact Support',
    actionUrl: 'mailto:{{support_email}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Account Holder' },
      { key: '{{rejection_reason}}', label: 'Suspension Reason', sample: 'Duplicate spam listings or unverified contact' },
      { key: '{{support_email}}', label: 'Support Email', sample: 'support@chillyads.com' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_account_reactivated',
    name: 'Account Reactivated',
    category: 'account',
    description: 'Notification when an account suspension is lifted.',
    subject: 'Good news: Your {{site_name}} account is reactivated!',
    bodyText: 'Hi {{user_name}},\n\nYour {{site_name}} account has been reactivated. You can now log in and manage your listings:\n{{site_url}}/my-account',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #059669; margin-top: 0;">Account Restored Successfully ✅</h2>
    <p>Hi {{user_name}},</p>
    <p>Following a review by our Trust & Safety team, your account has been fully reactivated. You can resume posting ads and communicating with buyers immediately.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{{site_url}}/my-account" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to Account</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'Log In',
    actionUrl: '{{site_url}}/my-account',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Rajesh Kumar' },
      { key: '{{site_url}}', label: 'Site URL', sample: 'https://chillyads.com' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },

  // =========================================================================
  // 2. CLASSIFIED AD LIFECYCLE EMAILS
  // =========================================================================
  {
    id: 'tpl_ad_submitted',
    name: 'Thank You For Posting / Ad Submitted',
    category: 'ad_lifecycle',
    description: 'Confirmation sent immediately after a user submits a classified ad.',
    subject: 'Thank you! Your ad "{{ad_title}}" has been received 📝',
    bodyText: 'Hi {{seller_name}},\n\nThank you for posting your ad on {{site_name}}!\n\nAd Title: {{ad_title}}\nPrice: {{ad_price}}\nLocation: {{ad_location}}\n\nOur team is reviewing your ad. It will be live shortly.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Ad Submitted Successfully 📝</h2>
    <p>Hi {{seller_name}}, thanks for posting on {{site_name}}!</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #002f34;">{{ad_title}}</h3>
      <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Price:</strong> {{ad_price}}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Category:</strong> {{ad_category}}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Location:</strong> {{ad_location}}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Ad ID:</strong> #{{ad_id}}</p>
    </div>
    <p style="font-size: 14px; color: #334155;">Your ad is now entering our automated verification queue. Most ads go live in under 5 minutes!</p>
    <div style="text-align: center; margin: 24px 0 12px;">
      <a href="{{my_ads_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">View In My Ads</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • 100% Free Classifieds in India
  </div>
</div>`,
    actionLabel: 'View In My Ads',
    actionUrl: '{{my_ads_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Amitabh Sen' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Honda Activa 6G 2022 Low KM' },
      { key: '{{ad_price}}', label: 'Price', sample: '₹58,000' },
      { key: '{{ad_category}}', label: 'Category', sample: 'Bikes & Scooters' },
      { key: '{{ad_location}}', label: 'Location', sample: 'Bandra West, Mumbai' },
      { key: '{{ad_id}}', label: 'Ad ID', sample: 'lst_1092' },
      { key: '{{my_ads_url}}', label: 'My Ads URL', sample: 'https://chillyads.com/my-account?tab=my-ads' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_approved',
    name: 'Ad Approved & Live',
    category: 'ad_lifecycle',
    description: 'Sent when an ad is approved by moderators and visible to public buyers.',
    subject: 'Congratulations! Your ad "{{ad_title}}" is LIVE on {{site_name}} 🚀',
    bodyText: 'Hi {{seller_name}},\n\nGreat news! Your classified ad "{{ad_title}}" is now live and visible to buyers across {{ad_location}}.\n\nView your live ad: {{ad_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      ✓ APPROVED & LIVE
    </div>
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Your Ad is Live! 🚀</h2>
    <p>Hi {{seller_name}}, your ad has passed review and is now featured in searches for <strong>{{ad_location}}</strong>.</p>
    <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 16px; border-radius: 4px; margin: 18px 0;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #002f34;">{{ad_title}}</h3>
      <p style="margin: 0; font-size: 15px; font-weight: bold; color: #059669;">{{ad_price}}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">📍 {{ad_location}} • Ad ID: #{{ad_id}}</p>
    </div>
    <p style="font-size: 14px; color: #334155;">Buyers can now contact you via instant chat and phone. Keep notifications turned on to reply fast!</p>
    <div style="text-align: center; margin: 28px 0 12px;">
      <a href="{{ad_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">View Live Ad</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Fast & Free Selling
  </div>
</div>`,
    actionLabel: 'View Live Ad',
    actionUrl: '{{ad_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Karan Mehra' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'iPhone 15 Pro Max 256GB Natural Titanium' },
      { key: '{{ad_price}}', label: 'Price', sample: '₹92,000' },
      { key: '{{ad_location}}', label: 'Location', sample: 'Connaught Place, New Delhi' },
      { key: '{{ad_id}}', label: 'Ad ID', sample: 'lst_1093' },
      { key: '{{ad_url}}', label: 'Ad URL', sample: 'https://chillyads.com/item/iphone-15-pro-max' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_rejected',
    name: 'Ad Rejected (With Reason)',
    category: 'ad_lifecycle',
    description: 'Sent when an ad violates policies or requires edits before going live.',
    subject: 'Action Required: Updates needed for your ad "{{ad_title}}"',
    bodyText: 'Hi {{seller_name}},\n\nYour ad "{{ad_title}}" was not approved for publication.\n\nReason: {{rejection_reason}}\n\nPlease edit and update your listing: {{edit_ad_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      ⚠️ ACTION REQUIRED
    </div>
    <h2 style="font-size: 18px; color: #991b1b; margin-top: 0;">Listing Update Needed</h2>
    <p>Hi {{seller_name}},</p>
    <p>Your listing <strong>"{{ad_title}}"</strong> (Ad ID: #{{ad_id}}) could not be approved for the following reason:</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 4px; margin: 18px 0; font-size: 14px; color: #7f1d1d;">
      <strong>Moderation Note:</strong> {{rejection_reason}}
    </div>
    <p>Don't worry! You can easily update your photos, price, or description and resubmit it for free instant approval.</p>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{edit_ad_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">Edit & Fix My Ad</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Moderation Desk
  </div>
</div>`,
    actionLabel: 'Edit & Fix My Ad',
    actionUrl: '{{edit_ad_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Deepak Joshi' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Sony Bravia 55 inch 4K TV' },
      { key: '{{rejection_reason}}', label: 'Rejection Reason', sample: 'Please upload clear photos showing the screen turned on' },
      { key: '{{ad_id}}', label: 'Ad ID', sample: 'lst_1094' },
      { key: '{{edit_ad_url}}', label: 'Edit URL', sample: 'https://chillyads.com/my-account?tab=my-ads&edit=lst_1094' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_expiring_soon',
    name: 'Ad Expiring Soon (3-Day Alert)',
    category: 'ad_lifecycle',
    description: 'Gentle reminder sent 3 days before an ad expires to encourage renewal.',
    subject: 'Reminder: Your ad "{{ad_title}}" expires in {{days_remaining}} days ⏳',
    bodyText: 'Hi {{seller_name}},\n\nYour ad "{{ad_title}}" on {{site_name}} will expire in {{days_remaining}} days.\n\nRenew it for FREE now to maintain your listing rank:\n{{renew_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      ⏳ EXPIRING IN {{days_remaining}} DAYS
    </div>
    <h2 style="font-size: 18px; color: #92400e; margin-top: 0;">Keep Receiving Buyer Enquiries!</h2>
    <p>Hi {{seller_name}},</p>
    <p>Your listing <strong>"{{ad_title}}"</strong> will reach the 30-day mark on <strong>{{expiry_date}}</strong>.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Current Views:</strong> {{ad_views}}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;"><strong>Active Inquiries:</strong> {{ad_chats}}</p>
    </div>
    <p>Renew right now for <strong>100% FREE</strong> to ensure seamless continuity in buyer search results.</p>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{renew_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Renew for Free (₹0)</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'Renew for Free (₹0)',
    actionUrl: '{{renew_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Sunita Patel' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: '2 BHK Semi-Furnished Flat in Koramangala' },
      { key: '{{days_remaining}}', label: 'Days Remaining', sample: '3' },
      { key: '{{expiry_date}}', label: 'Expiry Date', sample: '25 Sept 2026' },
      { key: '{{ad_views}}', label: 'Ad Views', sample: '428 views' },
      { key: '{{ad_chats}}', label: 'Active Inquiries', sample: '14 chats' },
      { key: '{{renew_url}}', label: 'Renew URL', sample: 'https://chillyads.com/my-account?tab=my-ads&renew=lst_1095' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_expired',
    name: 'Ad Expired (Free Renewal Notice)',
    category: 'ad_lifecycle',
    description: 'Sent when an ad has reached its 30-day limit and is paused.',
    subject: '⚠️ Your ad "{{ad_title}}" has expired – Renew for FREE now!',
    bodyText: 'Hi {{seller_name}},\n\nYour ad "{{ad_title}}" on {{site_name}} expired on {{expiry_date}}.\n\nYou can renew it right now for 100% FREE without paying any fee: {{renew_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      ⚠️ AD EXPIRED & PAUSED
    </div>
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Reactivate Your Listing Instantly</h2>
    <p>Hi {{seller_name}}, your classified ad <strong>"{{ad_title}}"</strong> reached its validity period and is currently paused.</p>
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 18px 0; color: #065f46;">
      <strong>✓ Great News:</strong> You can reactivate your listing for <strong>100% FREE (₹0)</strong> with a single click. It will be immediately restored for another 30 days!
    </div>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{renew_url}}" style="background: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Renew Ad for Free (₹0)</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'Renew Ad for Free (₹0)',
    actionUrl: '{{renew_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Vikramaditya Roy' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Sony PlayStation 5 Disc Edition + 2 Controllers' },
      { key: '{{expiry_date}}', label: 'Expiry Date', sample: '20 Sept 2026' },
      { key: '{{renew_url}}', label: 'Renew URL', sample: 'https://chillyads.com/my-account?tab=my-ads&renew=lst_1009' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_renewed',
    name: 'Ad Successfully Renewed',
    category: 'ad_lifecycle',
    description: 'Sent after an ad has been renewed and reactivated.',
    subject: '✅ Your ad "{{ad_title}}" is renewed & active for 30 more days!',
    bodyText: 'Hi {{seller_name}},\n\nYour ad "{{ad_title}}" has been successfully renewed and is now active until {{valid_until_date}}.\n\nView ad: {{ad_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      ✓ RENEWED SUCCESSFULLY
    </div>
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Your Ad is Active Again!</h2>
    <p>Hi {{seller_name}}, your listing <strong>"{{ad_title}}"</strong> has been refreshed and is active for another 30 days until <strong>{{valid_until_date}}</strong>.</p>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{ad_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">View Live Listing</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'View Live Listing',
    actionUrl: '{{ad_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Apex Motors Auto Hub' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Honda City ZX i-VTEC 2021 Automatic' },
      { key: '{{valid_until_date}}', label: 'Valid Until', sample: '22 Oct 2026' },
      { key: '{{ad_url}}', label: 'Ad URL', sample: 'https://chillyads.com/item/honda-city-zx' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_featured',
    name: 'Ad Featured / Promoted',
    category: 'ad_lifecycle',
    description: 'Confirmation when a seller purchases a Boost / Featured badge for their ad.',
    subject: '🌟 Your ad "{{ad_title}}" is now BOOSTED to Top on {{site_name}}!',
    bodyText: 'Hi {{seller_name}},\n\nYour ad "{{ad_title}}" has been promoted with {{package_name}}! It is now featured at the top of category feeds for {{duration}}.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <div style="display: inline-block; background: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;">
      🌟 FEATURED BADGE ACTIVATED
    </div>
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Your Ad is Getting 10x More Views!</h2>
    <p>Hi {{seller_name}}, thank you for promoting with <strong>{{package_name}}</strong>.</p>
    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin: 18px 0;">
      <p style="margin: 0; font-size: 14px; color: #78350f;"><strong>Listing:</strong> {{ad_title}}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350f;"><strong>Package:</strong> {{package_name}} ({{duration}})</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350f;"><strong>Transaction ID:</strong> {{payment_id}}</p>
    </div>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{ad_url}}" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">See Promoted Ad</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'See Promoted Ad',
    actionUrl: '{{ad_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Rajesh Motors' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Hyundai Creta SX (O) Diesel 2022' },
      { key: '{{package_name}}', label: 'Package Name', sample: '7-Day Top Boost + Featured Badge' },
      { key: '{{duration}}', label: 'Duration', sample: '7 Days' },
      { key: '{{payment_id}}', label: 'Payment ID', sample: 'pay_rzp_98432' },
      { key: '{{ad_url}}', label: 'Ad URL', sample: 'https://chillyads.com/item/hyundai-creta-sx' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_ad_payment_success',
    name: 'Ad Payment Successful (Invoice)',
    category: 'ad_lifecycle',
    description: 'Official GST tax invoice receipt for featured ads or package purchases.',
    subject: 'Receipt: Payment of {{amount}} for {{package_name}} on {{site_name}} 🧾',
    bodyText: 'Hi {{user_name}},\n\nYour payment of {{amount}} for {{package_name}} (Invoice #{{invoice_no}}) has been confirmed.\n\nThank you for choosing {{site_name}}.',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #059669; margin-top: 0;">Payment Confirmed 🧾</h2>
    <p>Hi {{user_name}}, we have received your payment. Here is your transaction summary:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Invoice Number:</td>
        <td style="padding: 8px 0; font-weight: bold; text-align: right;">{{invoice_no}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Package:</td>
        <td style="padding: 8px 0; font-weight: bold; text-align: right;">{{package_name}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
        <td style="padding: 8px 0; font-weight: bold; color: #059669; text-align: right;">{{amount}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Payment Method:</td>
        <td style="padding: 8px 0; text-align: right;">{{payment_method}}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{receipt_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Download Tax Invoice (PDF)</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • GSTIN: 27AABCO1234F1Z5
  </div>
</div>`,
    actionLabel: 'Download Invoice',
    actionUrl: '{{receipt_url}}',
    variables: [
      { key: '{{user_name}}', label: 'Customer Name', sample: 'Gaurav Sharma' },
      { key: '{{invoice_no}}', label: 'Invoice No', sample: 'INV-2026-9812' },
      { key: '{{package_name}}', label: 'Package Name', sample: 'Featured Ad 30 Days' },
      { key: '{{amount}}', label: 'Total Amount', sample: '₹499 (incl. 18% GST)' },
      { key: '{{payment_method}}', label: 'Payment Gateway', sample: 'Razorpay UPI' },
      { key: '{{receipt_url}}', label: 'Invoice URL', sample: 'https://chillyads.com/my-account?tab=orders' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },

  // =========================================================================
  // 3. USER ACTIVITY & BUYER NOTIFICATIONS
  // =========================================================================
  {
    id: 'tpl_buyer_inquiry',
    name: 'New Message / Someone Contacted You',
    category: 'user_activity',
    description: 'Instant alert when a buyer sends a message or price offer on an ad.',
    subject: '💬 {{buyer_name}} sent a message on "{{ad_title}}"',
    bodyText: 'Hi {{seller_name}},\n\n{{buyer_name}} sent you a message about "{{ad_title}}":\n\n"{{message_snippet}}"\n\nReply now on {{site_name}}: {{chat_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #002f34; margin-top: 0;">New Buyer Message 💬</h2>
    <p>Hi {{seller_name}}, <strong>{{buyer_name}}</strong> has inquired about your listing <strong>"{{ad_title}}"</strong>:</p>
    <div style="background: #f1f5f9; border-left: 4px solid #00a49f; padding: 14px 16px; border-radius: 4px; margin: 18px 0; font-style: italic; color: #334155;">
      "{{message_snippet}}"
    </div>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{chat_url}}" style="background: #00a49f; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Reply in Chat</a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">💡 Tip: Sellers who reply within 15 minutes sell 3x faster!</p>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}} • Instant Buyer Chat
  </div>
</div>`,
    actionLabel: 'Reply in Chat',
    actionUrl: '{{chat_url}}',
    variables: [
      { key: '{{seller_name}}', label: 'Seller Name', sample: 'Aakash Dave' },
      { key: '{{buyer_name}}', label: 'Buyer Name', sample: 'Rahul Verma' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'MacBook Air M2 16GB 512GB' },
      { key: '{{message_snippet}}', label: 'Message Text', sample: 'Is this available for instant pickup in Bandra today? Can offer ₹72,000 cash.' },
      { key: '{{chat_url}}', label: 'Chat Link', sample: 'https://chillyads.com/my-account?tab=messages' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
  {
    id: 'tpl_saved_ad_alert',
    name: 'Saved Ad Price Drop Alert',
    category: 'user_activity',
    description: 'Sent to interested buyers when a saved favorite item drops in price.',
    subject: '🔥 Price Drop: "{{ad_title}}" is now {{new_price}}!',
    bodyText: 'Hi {{user_name}},\n\nGreat news! The seller has dropped the price on an item you saved:\n"{{ad_title}}" was {{old_price}}, now {{new_price}}!\n\nView deal: {{ad_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{{site_name}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #e11d48; margin-top: 0;">🔥 Price Drop Alert</h2>
    <p>Hi {{user_name}}, an item from your favorites just became more affordable!</p>
    <div style="background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 8px; padding: 18px; margin: 18px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #9f1239;">{{ad_title}}</h3>
      <p style="margin: 0; font-size: 14px; color: #881337;">
        Old Price: <span style="text-decoration: line-through;">{{old_price}}</span> → <strong>New Price: {{new_price}}</strong>
      </p>
    </div>
    <div style="text-align: center; margin: 26px 0 12px;">
      <a href="{{ad_url}}" style="background: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">Grab This Deal</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
    © {{year}} {{site_name}}
  </div>
</div>`,
    actionLabel: 'Grab This Deal',
    actionUrl: '{{ad_url}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Simran Kaur' },
      { key: '{{ad_title}}', label: 'Ad Title', sample: 'Royal Enfield Classic 350 Gunmetal Grey' },
      { key: '{{old_price}}', label: 'Old Price', sample: '₹1,65,000' },
      { key: '{{new_price}}', label: 'New Price', sample: '₹1,45,000' },
      { key: '{{ad_url}}', label: 'Ad URL', sample: 'https://chillyads.com/item/royal-enfield-classic' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },

  // =========================================================================
  // 4. MARKETING & NEWSLETTER TEMPLATES
  // =========================================================================
  {
    id: 'tpl_newsletter_default',
    name: 'Standard Marketing Newsletter',
    category: 'marketing',
    description: 'General newsletter template for seasonal deals, trending categories, and announcements.',
    subject: '🌟 {{newsletter_subject}}',
    bodyText: 'Hi {{user_name}},\n\n{{newsletter_content}}\n\nExplore thousands of verified listings on {{site_name}}: {{site_url}}\n\nTo unsubscribe from marketing emails: {{unsubscribe_url}}',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #002f34; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">{{site_name}}</h1>
    <p style="color: #cbd5e1; margin: 4px 0 0 0; font-size: 13px;">India's Trusted Marketplace</p>
  </div>
  <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
    <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">{{newsletter_headline}}</h2>
    <div style="font-size: 15px; color: #334155; margin: 18px 0;">
      {{newsletter_content}}
    </div>
    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="{{cta_url}}" style="background: #002f34; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: bold; display: inline-block;">{{cta_label}}</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
    <p style="margin: 0 0 8px 0;">You are receiving this newsletter because you are a registered user of {{site_name}}.</p>
    <p style="margin: 0 0 8px 0;">{{footer_address}}</p>
    <p style="margin: 0;">
      <a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe from promotional emails</a> • 
      <a href="{{site_url}}/privacy" style="color: #64748b; text-decoration: underline;">Privacy Policy</a>
    </p>
  </div>
</div>`,
    actionLabel: 'Explore Trending Deals',
    actionUrl: '{{site_url}}',
    variables: [
      { key: '{{user_name}}', label: 'User Name', sample: 'Priya Nambiar' },
      { key: '{{newsletter_headline}}', label: 'Headline', sample: 'Festive Deals & Top Verified Cars Near You!' },
      { key: '{{newsletter_content}}', label: 'Content Body', sample: 'Get ready for the festive season with thousands of certified used cars, laptops, and mobile phones at unbeatable local prices across India.' },
      { key: '{{cta_label}}', label: 'CTA Button Text', sample: 'Explore Festive Deals' },
      { key: '{{cta_url}}', label: 'CTA URL', sample: 'https://chillyads.com' },
      { key: '{{site_name}}', label: 'Site Name', sample: 'Chillyads' },
      { key: '{{site_url}}', label: 'Site URL', sample: 'https://chillyads.com' },
      { key: '{{unsubscribe_url}}', label: 'Unsubscribe Link', sample: 'https://chillyads.com/unsubscribe?email=priya@example.com' },
      { key: '{{footer_address}}', label: 'Footer Address', sample: 'Chillyads Tech Pvt Ltd, Bandra Kurla Complex, Mumbai' },
      { key: '{{year}}', label: 'Current Year', sample: '2026' },
    ],
    isActive: true,
    lastUpdated: '2026-09-21',
    isSystemDefault: true,
  },
];

export const INITIAL_EMAIL_TEMPLATES = DEFAULT_EMAIL_TEMPLATES;

