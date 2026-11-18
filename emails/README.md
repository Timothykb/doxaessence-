# Launch email — prepared, not connected
The English confirmation copy is ready in launch-confirmation.txt.
Do not send until a sender and email service are approved/configured.
The sender must use server-side credentials, escape the first name in HTML,
and replace unsubscribe_url with a working recipient-specific provider link.
Never expose an API key in frontend code. Respect provider suppression lists.
Send only after successful signup, with idempotency to prevent duplicate mail.
Every newsletter must contain the same working unsubscribe mechanism.
No email is currently sent and the thank-you page does not claim otherwise.
