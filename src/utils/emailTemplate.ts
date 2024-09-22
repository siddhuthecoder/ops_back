export const registrationEmailTemplate = (
  userId: string
): { subject: string; text: string } => {
  const subject = "Complete Your Registration";
  const text = `Please set your password by filling out the form at: http://example.com/set-password/${userId}`;

  return { subject, text };
};

// Announcement email template
export const announcementEmailTemplate = (
  title: string,
  description: string
): { subject: string; text: string } => {
  const subject = `New Announcement: ${title}`;
  const text = `Dear user,

We are excited to share a new announcement with you: 

Title: ${title}

Description: ${description}

Please stay tuned for further updates.

Best regards,
[OPS-360]`;

  return { subject, text };
};

// Unviewed users email template
export const unviewedAnnouncementEmailTemplate = (
    title: string,
    description: string
  ): { subject: string; text: string } => {
    const subject = `Reminder: ${title}`;
    const text = `Dear user,
  
  We noticed that you haven't viewed the recent announcement yet:
  
  Title: ${title}
  
  Description: ${description}
  
  Please check it out at your earliest convenience.
  
  Best regards,
  [OPS-360]`;
  
    return { subject, text };
  };
  
  
  // Comment notification email template
export const commentNotificationEmailTemplate = (
  taskTitle: string,
  comment: string,
  commenterName: string
): { subject: string; text: string } => {
  const subject = `New Comment on Task: ${taskTitle}`;
  const text = `Dear user,

${commenterName} has added a new comment to the task "${taskTitle}":

"${comment}"

Please check the task for further details.

Best regards,
[OPS-360]`;

  return { subject, text };
};

// Reminder email template
export const taskReminderEmailTemplate = (
  taskTitle: string,
  dueDate: Date
): { subject: string; text: string } => {
  const subject = `Reminder: Task "${taskTitle}" is due soon`;
  const text = `Dear user,

This is a reminder that the task "${taskTitle}" is due on ${dueDate.toLocaleDateString()}.

Please ensure that the necessary actions are taken before the deadline.

Best regards,
[OPS-360]`;

  return { subject, text };
};

// Missed task email template
export const missedTaskEmailTemplate = (
  taskTitle: string
): { subject: string; text: string } => {
  const subject = `Missed Task: "${taskTitle}"`;
  const text = `Dear user,

The task "${taskTitle}" has been marked as missed because the due date has passed and it was not completed.

Please take appropriate actions as needed.

Best regards,
[OPS-360]`;

  return { subject, text };
};

// Task completion email template
export const taskCompletionEmailTemplate = (
  taskTitle: string
): { subject: string; text: string } => {
  const subject = `Task Completed: "${taskTitle}"`;
  const text = `Dear user,

We are pleased to inform you that the task "${taskTitle}" has been successfully completed.

Thank you for your effort!

Best regards,
[OPS-360]`;

  return { subject, text };
};
