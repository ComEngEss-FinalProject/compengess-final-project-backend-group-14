const express = require("express");
const coursevilleController = require("../controller/coursevilleController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/auth_app", coursevilleController.authApp);
router.get("/access_token", coursevilleController.accessToken);

// สำหรับเอาไว้ดึงข้อมูลพวกชื่อของ user ที่ login แล้ว
router.get("/get_profile_info", auth, coursevilleController.getProfileInformation);

//สำหรับดึงข้อมูลของ course ทั้งหมด ถ้าใส่ query string แล้วก็จะ filter ตาม query string นั้น มี year กับ semester
router.get("/getAllAssignments", auth, coursevilleController.getAllAssignments);

//สำหรับดึงข้อมูลของ course ที่เลือก
router.get("/getCourseAssignments/:cv_cid", auth, coursevilleController.getCourseAssignments);

router.post("/addAssignment", coursevilleController.addAssignment);
router.get("/getAssignmentSent", coursevilleController.getAssignmentSent);
router.delete("/deleteAssignment", coursevilleController.deleteAssignment);

router.get("/logout", auth, coursevilleController.logout);

module.exports = router;
