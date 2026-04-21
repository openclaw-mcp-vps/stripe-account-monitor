import { Resend } from "resend";

type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export async function sendAlertEmail(input: SendEmailInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!key) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  if (!from) {
    return { sent: false, reason: "ALERT_FROM_EMAIL is not configured" };
  }

  const recipients = input.to.filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, reason: "No recipients configured" };
  }

  const resend = new Resend(key);

  await resend.emails.send({
    from,
    to: recipients,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { sent: true };
}
