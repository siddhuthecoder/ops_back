    import nodemailer, { Transporter } from 'nodemailer';

    // Configure the email transport service
    const transporter: Transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your email address
            pass: process.env.EMAIL_PASS  // Your email password
        }
    });

    /**
     * Sends an email with the given options.
     * @param to - Recipient's email address
     * @param subject - Subject of the email
     * @param text - Email body
     * @returns {Promise<void>}
     */
    const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                text
            });
            console.log('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Email sending failed');
        }
    };

    export default sendEmail;
