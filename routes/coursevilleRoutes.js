const express = require("express");
const coursevilleController = require("../controller/coursevilleController");

const router = express.Router();

router.get("/auth_app", coursevilleController.authApp);
router.get("/access_token", coursevilleController.accessToken);
router.get("/get_profile_info", coursevilleController.getProfileInformation);
router.get("/getAllAssignments", coursevilleController.getAllAssignments);
router.get("/getCourseAssignments/:cv_cid", coursevilleController.getCourseAssignments);
router.get("/logout", coursevilleController.logout);

module.exports = router;
