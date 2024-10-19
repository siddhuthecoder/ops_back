import { Request, Response, Router } from "express";
import { authMiddleware, isAdmin } from "../middleware/authMiddleware";
import formRoutes from './form.route';
const router = Router();
import upload from "../multerConfig";
import {
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createUserByAdmin,
  setPassword,
  deleteUser,
  exportUsersAsExcel
} from "../controllers/userController";
// User routes
router.post("/users/login", loginUser);
router.get("/users/profile", authMiddleware, getUserProfile);
router.put("/users/Updateprofile", authMiddleware, updateUserProfile);
router.get("/users/getAllUsers", authMiddleware, isAdmin, getAllUsers);
router.post("/users/admin/create-user", createUserByAdmin);
router.post("/users/updateDetails", setPassword);
router.delete("/users/deleteUser/:id", authMiddleware, isAdmin, deleteUser);
router.post("/users/exportUsers/:id", authMiddleware, exportUsersAsExcel);

import {
  createHierarchyRole,
  getAllHierarchyRoles,
  updateHierarchyRole,
  deleteHierarchyRole,
} from "../controllers/roleController";
// Hierarchy routes
router.post("/roles/add-role", authMiddleware, isAdmin, createHierarchyRole);
router.get("/roles/getAllRoles", getAllHierarchyRoles);
router.put("/roles/updateRole/:id", updateHierarchyRole);
router.delete("/roles/deleteRoles/:id", deleteHierarchyRole);

import {
  createLocation,
  updateLocation,
  getAllLocations,
  getLocationById,
  deleteLocation,
} from "../controllers/LocationController";
// Location routes
router.post("/locations/create", authMiddleware, isAdmin, createLocation);
router.get("/locations/getAllLocations", authMiddleware, getAllLocations);
router.put(
  "/locations/updateLocation/:locationId",
  authMiddleware,
  isAdmin,
  updateLocation
);
router.get(
  "/locations/getLocation/:locationId",
  authMiddleware,
  getLocationById
);
router.delete(
  "/locations/deleteLocation/:locationId",
  authMiddleware,
  isAdmin,
  deleteLocation
);

//Team Routes
import {
  createTeam,
  updateTeam,
  deleteTeam,
  getAllTeams,
  getTeamById,
  getUserByTeam,
  getAllTeamsInHierarchy,
} from "../controllers/TeamController";

router.post("/teams/create", authMiddleware, isAdmin, createTeam);
router.get("/teams/getAllTeams", authMiddleware, getAllTeams);
router.get("/teams/getTeam/:teamId", authMiddleware, getTeamById);
router.put("/teams/updateTeam/:teamId", authMiddleware, isAdmin, updateTeam);
router.delete("/teams/delteTeam/:teamId", authMiddleware, isAdmin, deleteTeam);
router.get("/teams/:teamId/users", authMiddleware, getUserByTeam);
router.get(
  "/teams/getAllTeamsInHierarchy",
  authMiddleware,
  getAllTeamsInHierarchy
);

// Announcement routes
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  trackAnnouncementOpen,
  getAnnouncementsViewedByUser,
  getSentAnnouncementsForUser,
  sendEmailsToUnviewedUsers,
} from "../controllers/announcementController";


router.post(
  "/announcement/create",
  authMiddleware,
  isAdmin,
  upload.single("attachment"),
  createAnnouncement
);
router.get(
  "/announcement/getAllAnnouncements",
  authMiddleware,
  getAllAnnouncements
);
router.get(
  "/announcement/getAnnouncementById/:id",
  authMiddleware,
  getAnnouncementById
);
router.put(
  "/announcement/updateAnnouncement/:id",
  authMiddleware,
  updateAnnouncement
);
router.delete(
  "/announcement/deleteAnnouncement/:id",
  authMiddleware,
  deleteAnnouncement
);
router.post(
  "/announcement/:announcementId/open/:userId",
  trackAnnouncementOpen
);
router.post(
  "/announcement/resend/:announcementId",
  authMiddleware,
  sendEmailsToUnviewedUsers
);
router.get("/announcement/user/:userId/sent", getSentAnnouncementsForUser);



// -------------------------
// Task Routes
// -------------------------
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByFilter,
  updateTask,
  taskCompletion,
  addCommentToTask,
  getCommentsForTask,
  exportTaskAsExcel
} from "../controllers/taskController";

router.post(
  "/tasks/create",
  authMiddleware,
  isAdmin,
  upload.array("images", 5),
  createTask
);
router.get("/tasks/getAll", authMiddleware, getAllTasks);
router.get("/tasks/get/:taskId", authMiddleware, getTaskById);
router.put("/tasks/update/:taskId", authMiddleware, isAdmin, updateTask);
router.delete("/tasks/delete/:taskId", authMiddleware, isAdmin, deleteTask);
router.get("/tasks/filter", authMiddleware, getTasksByFilter);
router.post("/tasks/complete/:taskId",authMiddleware,taskCompletion)
router.post("/tasks/:taskId/comments",authMiddleware, addCommentToTask); 
router.get("/tasks/:taskId/comments", authMiddleware,getCommentsForTask);
router.get("/tasks/exportTask/:id",authMiddleware,exportTaskAsExcel);


//Dashboard Routes
import { getTeamTasks } from '../controllers/dashboardController';
router.get('/dashboard/tasks/:teamId?', getTeamTasks);

//Form Routes
router.use("/forms", formRoutes);

export default router;
