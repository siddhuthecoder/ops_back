import { Router } from "express";
import { authMiddleware, isAdmin } from "../middleware/authMiddleware";

const router = Router();

// -------------------------
// User Routes
// -------------------------
import {
  createUserByAdmin,
  getAllUsers,
  getUserProfile,
  loginUser,
  setPassword,
  updateUserProfile,
} from "../controllers/userController";

router.post("/users/login", loginUser);
router.get("/users/profile", authMiddleware, getUserProfile);
router.put("/users/updateProfile", authMiddleware, updateUserProfile);
router.get("/users/getAll", authMiddleware, isAdmin, getAllUsers);
router.post("/users/admin/create", authMiddleware, isAdmin, createUserByAdmin);
router.post("/users/updateDetails", authMiddleware, setPassword);

// -------------------------
// Role Routes
// -------------------------
import {
  createHierarchyRole,
  deleteHierarchyRole,
  getAllHierarchyRoles,
  updateHierarchyRole,
} from "../controllers/roleController";

router.post("/roles/create", authMiddleware, isAdmin, createHierarchyRole);
router.get("/roles/getAll", authMiddleware, isAdmin, getAllHierarchyRoles);
router.put("/roles/update/:id", authMiddleware, isAdmin, updateHierarchyRole);
router.delete("/roles/delete/:id", authMiddleware, isAdmin, deleteHierarchyRole);

// -------------------------
// Location Routes
// -------------------------
import {
  createLocation,
  deleteLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
} from "../controllers/LocationController";

router.post("/locations/create", authMiddleware, isAdmin, createLocation);
router.get("/locations/getAll", authMiddleware, getAllLocations);
router.put("/locations/update/:locationId", authMiddleware, isAdmin, updateLocation);
router.get("/locations/get/:locationId", authMiddleware, getLocationById);
router.delete("/locations/delete/:locationId", authMiddleware, isAdmin, deleteLocation);

// -------------------------
// Team Routes
// -------------------------
import {
  createTeam,
  deleteTeam,
  getAllTeams,
  getAllTeamsInHierarchy,
  getTeamById,
  getUserByTeam,
  updateTeam,
} from "../controllers/TeamController";

router.post("/teams/create", authMiddleware, isAdmin, createTeam);
router.get("/teams/getAll", authMiddleware, getAllTeams);
router.get("/teams/get/:teamId", authMiddleware, getTeamById);
router.put("/teams/update/:teamId", authMiddleware, isAdmin, updateTeam);
router.delete("/teams/delete/:teamId", authMiddleware, isAdmin, deleteTeam);
router.get("/teams/:teamId/users", authMiddleware, getUserByTeam);
router.get("/teams/getAllInHierarchy", authMiddleware, getAllTeamsInHierarchy);

// -------------------------
// Announcement Routes
// -------------------------
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getSentAnnouncementsForUser,
  sendEmailsToUnviewedUsers,
  trackAnnouncementOpen,
  updateAnnouncement
} from "../controllers/announcementController";

router.post("/announcement/create", authMiddleware, isAdmin, createAnnouncement);
router.get("/announcement/getAll", authMiddleware, getAllAnnouncements);
router.get("/announcement/get/:id", authMiddleware, getAnnouncementById);
router.put("/announcement/update/:id", authMiddleware, isAdmin, updateAnnouncement);
router.delete("/announcement/delete/:id", authMiddleware, isAdmin, deleteAnnouncement);
router.post("/announcement/:announcementId/open/:userId", trackAnnouncementOpen);
router.post("/announcement/resend/:announcementId", authMiddleware, isAdmin, sendEmailsToUnviewedUsers);
router.get("/announcement/user/:userId/sent", authMiddleware, getSentAnnouncementsForUser);

// -------------------------
// Task Routes
// -------------------------
import {
  addCommentToTask,
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByFilter,
  updateTask,
} from "../controllers/taskController";

router.post("/tasks/create", authMiddleware, isAdmin, createTask);
router.get("/tasks/getAll", authMiddleware, getAllTasks);
router.get("/tasks/get/:taskId", authMiddleware, getTaskById);
router.put("/tasks/update/:taskId", authMiddleware, isAdmin, updateTask);
router.delete("/tasks/delete/:taskId", authMiddleware, isAdmin, deleteTask);
router.post("/tasks/:taskId/addComment", authMiddleware, addCommentToTask);
router.get("/tasks/filter", authMiddleware, getTasksByFilter);

// -------------------------
// Project Routes
// -------------------------
import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getParentProjects,
  getChildProjects,
} from "../controllers/projectController";

// Create a new project (Admin only)
router.post("/projects/create", authMiddleware, isAdmin, createProject);
router.get("/projects/getAll", authMiddleware, getAllProjects);
router.get("/projects/get/:projectId", authMiddleware, getProjectById);
router.delete("/projects/delete/:projectId", authMiddleware, isAdmin, deleteProject);
router.get('/projects/parents',authMiddleware, getParentProjects);
router.get('/projects/children/:parentProjectId', authMiddleware,getChildProjects);

export default router;
