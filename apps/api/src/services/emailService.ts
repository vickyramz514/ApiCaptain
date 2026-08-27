import { getApiConfig } from '@apicaptain/config';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

/**
 * Development-safe email abstraction. Phase 5 does not integrate a provider.
 * Password reset links are logged in non-production environments only.
 */
export class EmailService {
  async send(payload: EmailPayload): Promise<void> {
    const config = getApiConfig();
    if (config.nodeEnv === 'production') {
      // No provider configured yet — no-op rather than failing auth flows.
      console.info('[email] skipped (no provider configured)');
      return;
    }
    console.info(`[email:dev] to=${payload.to} subject=${payload.subject}`);
    console.info(payload.text);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your ApiCaptain password',
      text: `Reset your password using this link (expires soon):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
  }
}

export const emailService = new EmailService();
