const dotenv = require("dotenv");
dotenv.config();
const https = require("https");
const url = require("url");
const querystring = require("querystring");

const redirect_uri = `http://${process.env.backendIPAddress}/courseville/access_token`;
const authorization_url = `https://www.mycourseville.com/api/oauth/authorize?response_type=code&client_id=${process.env.client_id}&redirect_uri=${redirect_uri}`;
const access_token_url = "https://www.mycourseville.com/api/oauth/access_token";
const axios = require("axios");

exports.authApp = (req, res) => {
  res.redirect(authorization_url);
};

exports.accessToken = (req, res) => {
  const parsedUrl = url.parse(req.url);
  const parsedQuery = querystring.parse(parsedUrl.query);

  if (parsedQuery.error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization error: ${parsedQuery.error_description}`);
    return;
  }

  if (parsedQuery.code) {
    const postData = querystring.stringify({
      grant_type: "authorization_code",
      code: parsedQuery.code,
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      redirect_uri: redirect_uri,
    });

    const tokenOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": postData.length,
      },
    };

    const tokenReq = https.request(
      access_token_url,
      tokenOptions,
      (tokenRes) => {
        let tokenData = "";
        tokenRes.on("data", (chunk) => {
          tokenData += chunk;
        });
        tokenRes.on("end", () => {
          const token = JSON.parse(tokenData);
          req.session.token = token;
          console.log(req.session);
          if (token) {
            res.writeHead(302, {
              Location: `http://${process.env.frontendIPAddress}/home.html`,
            });
            res.end();
          }
        });
      }
    );
    tokenReq.on("error", (err) => {
      console.error(err);
    });
    tokenReq.write(postData);
    tokenReq.end();
  } else {
    res.writeHead(302, { Location: authorization_url });
    res.end();
  }
};

// Example: Send "GET" request to CV endpoint to get user profile information
exports.getProfileInformation = (req, res) => {
  try {
    const profileOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };
    const profileReq = https.request(
      "https://www.mycourseville.com/api/v1/public/users/me",
      profileOptions,
      (profileRes) => {
        let profileData = "";
        profileRes.on("data", (chunk) => {
          profileData += chunk;
        });
        profileRes.on("end", () => {
          const profile = JSON.parse(profileData);
          res.send(profile);
          res.end();
        });
      }
    );
    profileReq.on("error", (err) => {
      console.error(err);
    });
    profileReq.end();
  } catch (error) {
    console.log(error);
    console.log("Please logout, then login again.");
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const courseOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };
    const courseReq = await axios.get("https://www.mycourseville.com/api/v1/public/get/user/courses?detail=1", courseOptions);

    let courses_cv_cid = [];

    for (const element of courseReq.data.data.student) {
      const course = element;
      const course_cv_cid = course.cv_cid;
      courses_cv_cid.push(course_cv_cid);
    }

    let assignments = [];

    for (let i = 0; i < courses_cv_cid.length; i++) {
      const course_cv_cid = courses_cv_cid[i];
      const assignmentReq = await axios.get(`https://www.mycourseville.com/api/v1/public/get/course/assignments?cv_cid=${course_cv_cid}&detail=1`, courseOptions);
      const assignment1 = assignmentReq.data.data;

      const informationOfAssignment = {
          course_cv_cid: courses_cv_cid[i],
          title: courseReq.data.data.student[i].title,
          semester: courseReq.data.data.student[i].semester,
          year: courseReq.data.data.student[i].year,
          course_icon: courseReq.data.data.student[i].course_icon,
          assignment_lenght: assignment1.length,
          assignment: assignment1,
      }

      assignments.push(informationOfAssignment);
    }

    res.status(200).send(assignments);

  } catch (error) {
    res.status(401).send(error);
    console.log(error);
    console.log("Please logout, then login again.");
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect(`http://${process.env.frontendIPAddress}/login.html`);
  res.end();
};
