import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

// Configure the email transport service
const transporter: Transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS,  // Your email password
    },
});

/**
 * Sends an email with the given options.
 * @param to - Recipient's email address
 * @param subject - Subject of the email
 * @param text - Email body
 * @param attachments - Optional attachments for the email
 * @returns {Promise<void>}
 */
const sendEmail = async (
    to: string,
    subject: string,
    text: string,
    attachments?: { filename: string; path: string }[] | { filename: string; content: Buffer }[]
): Promise<void> => {
    try {
        const mailOptions: SendMailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            attachments,  // Add attachments here
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email sending failed');
    }
};

export default sendEmail;
