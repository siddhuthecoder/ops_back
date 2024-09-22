import { Request, Response } from "express";
import mongoose from "mongoose";
import { Announcement } from "../models/Announcement";
import Team from "../models/Team";
import User, { IUser } from "../models/User"; // Adjust the path as necessary
import Hierarchy from "../models/Role"; // Import your Role model
import schedule from "node-schedule";
import moment from "moment-timezone";
import { announcementEmailTemplate ,unviewedAnnouncementEmailTemplate} from '../utils/emailTemplate';
import sendEmail from '../utils/emailService';


interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const getChildTeams = async (
  teamId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> => {
  const allTeams: mongoose.Types.ObjectId[] = [];
  const queue = [teamId];

  while (queue.length > 0) {
    const currentTeamId = queue.shift();
    if (currentTeamId) {
      const childTeams = await Team.find({ parent_team: currentTeamId });
      const childTeamIds = childTeams.map(
        (team) => team._id as mongoose.Types.ObjectId
      );
      queue.push(...childTeamIds);
      allTeams.push(...childTeamIds);
    }
  }

  return allTeams;
};

// Helper to get recipients from role, team, or specific users
const getRecipients = async ({
  roleIds,
  teamIds,
  userIds,
}: {
  roleIds?: string[];
  teamIds?: string[];
  userIds?: string[];
}): Promise<mongoose.Types.ObjectId[]> => {
  let recipients: mongoose.Types.ObjectId[] = [];

  // Get users by roles
  if (roleIds && roleIds.length > 0) {
    const roleUsers = await User.find({ role: { $in: roleIds } });
    recipients = recipients.concat(
      roleUsers.map((user) => user._id as mongoose.Types.ObjectId)
    );
  }

  // Get users by teams (including child teams)
  if (teamIds && teamIds.length > 0) {
    let allTeamIds: mongoose.Types.ObjectId[] = [];
    allTeamIds = allTeamIds.concat(
      teamIds.map((id) => new mongoose.Types.ObjectId(id))
    ); // Convert teamIds to ObjectIds
    for (const teamId of teamIds) {
      const teamObjectId = new mongoose.Types.ObjectId(teamId);
      const childTeams = await getChildTeams(teamObjectId);
      allTeamIds = allTeamIds.concat(childTeams);
    }
    const teamUsers = await User.find({ team: { $in: allTeamIds } });
    recipients = recipients.concat(
      teamUsers.map((user) => user._id as mongoose.Types.ObjectId)
    );
  }

  // Add specific users
  if (userIds && userIds.length > 0) {
    recipients = recipients.concat(
      userIds.map((id) => new mongoose.Types.ObjectId(id))
    );
  }

  // Remove duplicate users
  return [...new Set(recipients)];
};

const sendAnnouncementEmails = async (recipients: Array<{ email: string }>, title: string, description: string): Promise<void> => {
  try {
      console.log(recipients);
      const { subject, text } = announcementEmailTemplate(title, description);
      
      // Sending emails to all recipients
      await Promise.all(recipients.map(async (recipient) => {
          await sendEmail(recipient.email, subject, text);
      }));

      console.log('Emails sent successfully to all recipients');
  } catch (error) {
      console.error('Error sending announcement emails:', error);
      throw new Error('Failed to send announcement emails');
  }
};

const scheduleAnnouncement = (
  announcementId: mongoose.Types.ObjectId,
  deliveryTime: Date,
  recipients: mongoose.Types.ObjectId[]
) => {

  schedule.scheduleJob(deliveryTime, async () => {
    console.log(`Scheduled job running at ${deliveryTime}`);
    const announcement = await Announcement.findByIdAndUpdate(
      announcementId,
      { status: "Sent", sentDate: new Date() },
      { new: true }
    );
    console.log(announcement);

    if (announcement) {
      await User.updateMany(
        { _id: { $in: recipients } },
        { $push: { announcements: announcement._id } }
      );
      console.log(
        "Scheduled announcement sent and users' announcements array updated"
      );
    }
  });
};

export const createAnnouncement = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      title,
      message,
      attachment,
      roleIds,
      teamIds,
      userIds,
      sendImmediately,
      deliveryTime,
      isBanner,
    } = req.body;

    // Ensure only one type of recipient group is selected
    if (
      (roleIds && roleIds.length > 0) +
        (teamIds && teamIds.length > 0) +
        (userIds && userIds.length > 0) >
      1
    ) {
      return res.status(400).json({
        message: "Please select only one of roleIds, teamIds, or userIds",
      });
    }

    // Get the recipients
    const recipients = await getRecipients({ roleIds, teamIds, userIds });
    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ message: "No recipients found for the announcement" });
    }

    // Determine whether to send immediately or schedule
    let actualDeliveryTime = new Date();
    let status: "Sent" | "Scheduled" = "Scheduled"; // Default status
    if (sendImmediately) {
      status = "Sent";
      actualDeliveryTime = new Date();
    } else if (deliveryTime) {
      actualDeliveryTime = new Date(deliveryTime);
    } else {
      return res.status(400).json({
        message: "Either send immediately or provide a delivery time",
      });
    }

    // Create the announcement
    const announcement = new Announcement({
      title,
      message,
      attachment,
      recipients,
      deliveryTime: actualDeliveryTime,
      sendImmediately,
      isBanner,
      totalRecipients: recipients.length,
      createdBy: req.user!._id,
      sentDate: sendImmediately ? new Date() : undefined,
      status,
      sentTo: { teamIds, roleIds, userIds }, // Add sentTo field
    });

    await announcement.save();

    // Schedule the announcement if not sent immediately
    if (!sendImmediately && deliveryTime) {
      scheduleAnnouncement(
        announcement._id as mongoose.Types.ObjectId,
        actualDeliveryTime,
        recipients
      );
    }

    // If immediate sending, trigger notifications (e.g., push notifications, emails, etc.)
    if (sendImmediately) {
      await User.updateMany(
        { _id: { $in: recipients } },
        { $push: { announcements: announcement._id } }
      );
      let recipientEmails: string[] = [];
      const recipientUserIds = recipients.map(recipient => recipient._id);
      if (recipientUserIds.length > 0) {
        const users = await User.find({ _id: { $in: recipientUserIds } }, 'email');
        recipientEmails = users.map(user => user.email);
      }
      await sendAnnouncementEmails(
        recipientEmails.map(email => ({ email })),
        title,
        message
      );
    }

    return res
      .status(201)
      .json({ message: "Announcement created successfully", announcement });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

export const getAllAnnouncements = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Extract the status from the query parameters
    const { status } = req.query;

    // Validate status input (optional step)
    const validStatuses = ["Sent", "Scheduled"];
    if (status && !validStatuses.includes(status as string)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find announcements based on the status query
    const filter: any = {};
    if (status) {
      filter.status = status; // Apply status filter if present
    }

    // Find all announcements matching the filter and populate the related fields
    const announcements = await Announcement.find(filter)
      .populate("recipients", "email firstname lastname")
      .populate("createdBy", "email firstname lastname")
      .populate({
        path: "viewedByDetails.user",
        select: "email firstname lastname",
      })
      .exec();

    // Fetch additional details for sentTo field
    const enrichedAnnouncements = await Promise.all(
      announcements.map(async (announcement) => {
        // Populate teams
        const teams = await Team.find({
          _id: { $in: announcement.sentTo.teamIds },
        }).select("team_name");

        // Populate roles
        const roles = await Hierarchy.find({
          _id: { $in: announcement.sentTo.roleIds },
        }).select("role");

        // Populate users
        const users = await User.find({
          _id: { $in: announcement.sentTo.userIds },
        }).select("email");

        // Calculate unviewed users (recipients not present in viewedByDetails)
        const recipientIds = announcement.recipients.map((recipient) =>
          recipient._id.toString()
        );
        const viewedUserIds = announcement.viewedByDetails.map((viewed) =>
          viewed.user._id.toString()
        );

        const unviewedUserIds = recipientIds.filter(
          (recipientId) => !viewedUserIds.includes(recipientId)
        );

        // Fetch unviewed user details
        const unviewedUsers = await User.find({
          _id: { $in: unviewedUserIds },
        }).select("email firstname lastname");

        const totalRecipients = recipientIds.length;
        const viewedCount = viewedUserIds.length;
        const viewPercentage =
          totalRecipients > 0 ? (viewedCount / totalRecipients) * 100 : 0;

        return {
          ...announcement.toObject(),
          sentTo: {
            teams: teams.map((team) => ({
              teamId: team._id,
              team_name: team.team_name,
            })),
            roles: roles.map((role) => ({
              roleId: role._id,
              role_name: role.role,
            })),
            users: users.map((user) => ({
              userId: user._id,
              email: user.email,
            })),
          },

          unviewedUsers: unviewedUsers.map((user) => ({
            userId: user._id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
          })),
          viewPercentage: viewPercentage.toFixed(2),
        };
      })
    );

    return res.status(200).json(enrichedAnnouncements);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};


// Get a specific announcement by ID
export const getAnnouncementById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Find the announcement by ID and populate necessary fields
    const announcement = await Announcement.findById(req.params.id)
      .populate("recipients", "email firstname lastname")
      .populate("createdBy", "email firstname lastname")
      .populate({
        path: "viewedByDetails.user",
        select: "email firstname lastname", // Populating user info for viewedByDetails
      })
      .exec();

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Populate teams
    const teams = await Team.find({
      _id: { $in: announcement.sentTo.teamIds },
    }).select("team_name");

    // Populate roles
    const roles = await Hierarchy.find({
      _id: { $in: announcement.sentTo.roleIds },
    }).select("role");

    // Populate users
    const users = await User.find({
      _id: { $in: announcement.sentTo.userIds },
    }).select("email");

    // Calculate unviewed users (recipients not present in viewedByDetails)
    const recipientIds = announcement.recipients.map((recipient) => recipient._id.toString());
    const viewedUserIds = announcement.viewedByDetails.map((viewed) => viewed.user._id.toString());

    const unviewedUserIds = recipientIds.filter((recipientId) => !viewedUserIds.includes(recipientId));

    // Fetch unviewed user details
    const unviewedUsers = await User.find({
      _id: { $in: unviewedUserIds },
    }).select("email firstname lastname");

    // Calculate the view percentage
    const totalRecipients = recipientIds.length;
    const viewedCount = viewedUserIds.length;
    const viewPercentage = totalRecipients > 0 ? (viewedCount / totalRecipients) * 100 : 0;

    // Construct the response object
    const enrichedAnnouncement = {
      ...announcement.toObject(),
      sentTo: {
        teams: teams.map((team) => ({
          teamId: team._id,
          team_name: team.team_name,
        })),
        roles: roles.map((role) => ({
          roleId: role._id,
          role_name: role.role,
        })),
        users: users.map((user) => ({
          userId: user._id,
          email: user.email,
        })),
      },
      // Add unviewedUsers field
      unviewedUsers: unviewedUsers.map((user) => ({
        userId: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
      })),
      // Add viewPercentage field
      viewPercentage: viewPercentage.toFixed(2), // Rounded to two decimal places
    };

    return res.status(200).json(enrichedAnnouncement);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

// Update an announcement
export const updateAnnouncement = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      title,
      message,
      attachment,
      roleIds,
      teamIds,
      userIds,
      sendImmediately,
      deliveryTime,
      isBanner,
    } = req.body;

    // Get recipients
    const recipients = await getRecipients({ roleIds, teamIds, userIds });
    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ message: "No recipients found for the announcement" });
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        title,
        message,
        attachment,
        recipients,
        deliveryTime,
        sendImmediately,
        isBanner,
        totalRecipients: recipients.length,
        sentDate: sendImmediately ? new Date() : undefined,
        sentTo: { teamIds, roleIds, userIds }, // Update sentTo field
      },
      { new: true }
    );

    if (!updatedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.status(200).json({
      message: "Announcement updated successfully",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

// Delete an announcement
export const deleteAnnouncement = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const deletedAnnouncement = await Announcement.findByIdAndDelete(
      req.params.id
    );
    if (!deletedAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    return res
      .status(200)
      .json({ message: "Announcement deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

// Track when a user opens an announcement
export const trackAnnouncementOpen = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { announcementId, userId } = req.params;

    // Get the announcement
    const announcement = await Announcement.findById(announcementId);

    if (
      !announcement ||
      !announcement.recipients.includes(new mongoose.Types.ObjectId(userId))
    ) {
      return res
        .status(404)
        .json({ message: "User is not a recipient of this announcement" });
    }

    // Track the view
    if (!announcement.viewedBy.includes(new mongoose.Types.ObjectId(userId))) {
      announcement.viewedBy.push(new mongoose.Types.ObjectId(userId));
      announcement.viewedByDetails.push({
        user: new mongoose.Types.ObjectId(userId),
        dateViewed: new Date(),
      });
      announcement.openCount += 1;
      await announcement.save();
    }

    return res
      .status(200)
      .json({ message: "Announcement opened successfully" });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

// Get all announcements viewed by a user
export const getAnnouncementsViewedByUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.params.userId;
    const announcements = await Announcement.find({
      viewedBy: userId,
    }).populate("viewedBy", "email");

    return res.status(200).json(announcements);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

export const getSentAnnouncementsForUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.params.userId;

    // Ensure the user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find all announcements where the user is a recipient and the status is 'sent'
    const announcements = await Announcement.find({
      recipients: userId,
      status: "Sent",
    }).populate("createdBy", "firstname lastname email");

    if (announcements.length === 0) {
      return res
        .status(404)
        .json({ message: "No sent announcements found for this user" });
    }

    return res.status(200).json(announcements);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};

export const sendEmailsToUnviewedUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { announcementId } = req.params;

    // Find the announcement
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Get the list of users who have not viewed the announcement
    const unviewedUsers = await User.find({
      _id: { $nin: announcement.viewedBy }, // Exclude users who have already viewed
      announcements: { $in: [announcementId] } // Include users who are supposed to see the announcement
    }, 'email');

    if (unviewedUsers.length === 0) {
      return res.status(404).json({ message: 'No unviewed users found for this announcement' });
    }

    // Send reminder emails to unviewed users
    const { subject, text } = unviewedAnnouncementEmailTemplate(announcement.title, announcement.message);
    
    await Promise.all(unviewedUsers.map(async (user) => {
      await sendEmail(user.email, subject, text);
    }));

    console.log('Reminder emails sent successfully to unviewed users');
    return res.status(200).json({ message: 'Reminder emails sent successfully' });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
};
