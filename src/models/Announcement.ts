import mongoose, { Schema, Document } from 'mongoose';

// Define the Announcement interface
export interface IAnnouncement extends Document {
    title: string;
    message: string;
    attachment?: string; // URL or file identifier
    recipients: mongoose.Types.ObjectId[]; // List of user IDs receiving the announcement
    deliveryTime?: Date; // When to send the announcement
    sendImmediately: boolean; // Whether to send the announcement immediately
    isBanner: boolean; // Whether to display the announcement as a banner in the mobile app
    totalRecipients: number; // Total number of users targeted
    openCount: number; // Count of how many users opened the announcement
    viewedBy: mongoose.Types.ObjectId[]; // List of users who viewed the announcement
    viewedByDetails: {
        user: mongoose.Types.ObjectId;
        dateViewed: Date;
    }[];
    createdBy: mongoose.Types.ObjectId; // User ID of the creator
    sentDate?: Date; // When the announcement was sent
    status: 'Sent' | 'Scheduled'; // Status of the announcement
    sentTo: {
        teamIds: mongoose.Types.ObjectId[]; // List of team IDs
        roleIds: mongoose.Types.ObjectId[]; // List of role IDs
        userIds: mongoose.Types.ObjectId[]; // List of specific user IDs
    }; 
}

// Define the Announcement schema
const AnnouncementSchema: Schema<IAnnouncement> = new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    attachment: { type: String },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    deliveryTime: { type: Date },
    sendImmediately: { type: Boolean, default: true },
    isBanner: { type: Boolean, default: false },
    totalRecipients: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewedByDetails: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            dateViewed: { type: Date, default: Date.now },
        },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentDate: { type: Date },
    status: { type: String, enum: ['Sent', 'Scheduled'], default: 'Scheduled' },
    sentTo: {
        teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
        roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
        userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
});

// Export the Announcement model
export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
