import { Router } from "express";
import { authMiddleware, isAdmin } from "../middleware/authMiddleware";
const router = Router();
import upload from "../multerConfig";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/forms/CategoryController";

// Category routes
router.post("/categories/create", createCategory);
router.get("/categories", authMiddleware, getCategories);
router.get("/categories/:id", getCategoryById);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

import {
  createForm,
  getAllForms,
  getFormById,
  deleteForm,
  exportForm
} from "../controllers/forms/FormController";

// Form routes
router.post("/create", authMiddleware, createForm);
router.get("/", authMiddleware, getAllForms);
router.get("/:id", authMiddleware, getFormById);
router.delete("/:id", authMiddleware, deleteForm);
router.post('/export/:id', authMiddleware, exportForm);

import {
  createSubmission,
  getAllSubmissions,
  getSubmissionById,
  updateSubmission,
  addCommentToSubmission,
  getSubmissionComments,
  getSubmissions
} from "../controllers/forms/SubmissionController";

// Submission routes
router.post("/submissions/create", authMiddleware, createSubmission);
router.get("/submissions", authMiddleware, getAllSubmissions);
router.get("/submissions/:id", authMiddleware, getSubmissionById);
router.put("/submissions/:id", authMiddleware, updateSubmission);
router.get("/submissions/filter", authMiddleware, getSubmissions);
// Comment routes for submissions
router.post("/submissions/:id/comments", authMiddleware, addCommentToSubmission);
router.get("/submissions/:id/comments", authMiddleware, getSubmissionComments);


import {
  createFormWithFields,
  getFields,
  editFormWithFields,
  deleteField
} from '../controllers/forms/FieldController';

router.post('/fields', authMiddleware,upload.array('files'), createFormWithFields);
router.get('/fields/:formId', getFields);
router.put('/fields/edit', authMiddleware, upload.array('files'), editFormWithFields); 
router.delete('/fields/:formId/:fieldId',authMiddleware, deleteField);

import {
  createFormConfigure,
  getAllFormConfigures,
  getFormConfigureById,
  updateFormConfigure,
  deleteFormConfigure,
  getFormConfigureByFormId
} from '../controllers/forms/FormConfigureController';

router.post('/form-configure', createFormConfigure); // Create
router.get('/form-configure/form/:formId', getFormConfigureByFormId); // Read one by form_id
router.put('/form-configure/form/:formId', updateFormConfigure); // Update by form_id
router.delete('/form-configure/form/:formId', deleteFormConfigure); // Delete by form_id

import {
  createFormDistribute,
  updateFormDistributeByFormId,
  deleteFormDistributeByFormId,
  getFormDistributeByFormId,
} from '../controllers/forms/FormDistributeController'; 

router.post('/form-distributes', createFormDistribute);
router.put('/form-distributes/:form_id', updateFormDistributeByFormId);
router.delete('/form-distributes/:form_id', deleteFormDistributeByFormId);
router.get('/form-distributes/:form_id', getFormDistributeByFormId);
// router.get('/form-distributes', getAllFormDistributes);

import {
  createTrigger,
  getAllTriggers,
  getTriggerById,
  getTriggersByFormId,
  updateTrigger,
  deleteTrigger,
} from '../controllers/forms/TriggerController'; 
router.post('/triggers', createTrigger);
router.get('/triggers', getAllTriggers);
router.get('/triggers/:id', getTriggerById);
router.get('/triggers/form/:form_id', getTriggersByFormId);
router.put('/triggers/:id', updateTrigger);
router.delete('/triggers/:id', deleteTrigger);

import {
  createFormSubmissionTrigger,
  editFormSubmissionTrigger,
  deleteFormSubmissionTrigger,
  getFormSubmissionTrigger
} from '../controllers/forms/formSubmissionTriggersController';

router.post('/formSubmissionTriggers', createFormSubmissionTrigger); 
router.put('/formSubmissionTriggers/:form_id', editFormSubmissionTrigger);
router.delete('/formSubmissionTriggers/:form_id', deleteFormSubmissionTrigger);
router.get('/formSubmissionTriggers/:form_id', getFormSubmissionTrigger); 


import { getFormDetails } from '../controllers/forms/getFormDetails';
router.get('/details/:formId', getFormDetails);

export default router;
