const dotenv = require("dotenv");
dotenv.config();
const https = require("https");
const url = require("url");
const querystring = require("querystring");

const redirect_uri = `http://${process.env.backendIPAddress}/courseville/access_token`;
const authorization_url = `https://www.mycourseville.com/api/oauth/authorize?response_type=code&client_id=${process.env.client_id}&redirect_uri=${redirect_uri}`;
const access_token_url = "https://www.mycourseville.com/api/oauth/access_token";
const axios = require("axios");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  ExecuteStatementCommand,
} = require("@aws-sdk/lib-dynamodb");
const docClient = new DynamoDBClient({ regions: process.env.AWS_REGION });

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
              Location: `http://${process.env.frontendIPAddress}/index.html`,
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
      "https://www.mycourseville.com/api/v1/public/get/user/info",
      profileOptions,
      (profileRes) => {
        let profileData = "";
        profileRes.on("data", (chunk) => {
          profileData += chunk;
        });
        profileRes.on("end", () => {
          const profile = JSON.parse(profileData).data;
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

exports.getAllAssignments = async (req, res) => {
  try {
    const filter_year = req.query.year || "";
    const filter_semester = req.query.semester || "";
    
    console.log("filter_year: " + filter_year)
    console.log("filter_semester: " + filter_semester)

    const courseOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };
    const courseReq = await axios.get("https://www.mycourseville.com/api/v1/public/get/user/courses?detail=1", courseOptions);

    let courses_cv_cid = [];
    let assignments = [];
    if (filter_year == "" && filter_semester == "") {
      console.log("filter_year == '' && filter_semester == ''")
      for (const element of courseReq.data.data.student) {
        courses_cv_cid.push(element);
      }
    } else if (filter_semester == "") {
      console.log("filter_semester == ''")
      for (const element of courseReq.data.data.student) {
        if (element.year == filter_year) {
          courses_cv_cid.push(element);
        }
      }
    } else if (filter_year == "") {
      console.log("filter_year == ''")
      for (const element of courseReq.data.data.student) {
        // console.log(element.semester + " " + filter_semester)
        // console.log(element.semester == filter_semester)
        if (element.semester == filter_semester) {
          courses_cv_cid.push(element);
        }
      }
    } else {
      console.log("filter_year != '' && filter_semester != ''")
      for (const element of courseReq.data.data.student) {
        if (element.year == filter_year && element.semester == filter_semester) {
          courses_cv_cid.push(element);
        }
      }
    }
    
    for (const element of courses_cv_cid) {
      const assignmentReq = await axios.get(`https://www.mycourseville.com/api/v1/public/get/course/assignments?cv_cid=${element.cv_cid}&detail=1`, courseOptions);
      const assignment1 = assignmentReq.data.data;

      const informationOfAssignment = {
        course_cv_cid: element.cv_cid,
        title: element.title,
        semester: element.semester,
        year: element.year,
        course_icon: element.course_icon,
        assignment_length: assignment1.length,
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

exports.getCourseAssignments = async (req, res) => {
  try {
    const cv_cid = req.params.cv_cid;
    const courseOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };
    const courseReq = await axios.get("https://www.mycourseville.com/api/v1/public/get/user/courses?detail=1", courseOptions);

    let courses_cv_cid = [];
    let assignments = [];
    for (const element of courseReq.data.data.student) {
      if (element.cv_cid == cv_cid) {
        courses_cv_cid.push(element);
        break;
      }
    }
    
    for (const element of courses_cv_cid) {
      const assignmentReq = await axios.get(`https://www.mycourseville.com/api/v1/public/get/course/assignments?cv_cid=${element.cv_cid}&detail=1`, courseOptions);
      const assignment1 = assignmentReq.data.data;

      const informationOfAssignment = {
        course_cv_cid: element.cv_cid,
        title: element.title,
        semester: element.semester,
        year: element.year,
        course_icon: element.course_icon,
        assignment_length: assignment1.length,
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
  res.redirect(`http://${process.env.frontendIPAddress}/index.html`);
  res.end();
};

exports.getAssignmentSent = async (req, res) => {
  const params = {
    TableName: process.env.aws_sendStatus_table,
  };
  try {
    const data = await docClient.send(new ScanCommand(params));
    res.send(data.Items);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
}

exports.addAssignment = async (req, res) => {
  const item = { ...req.body };
  const params = {
    TableName: process.env.aws_sendStatus_table,
    Item: {
      user_id: item.user_id,
      assignment_id: item.assignment_id,
    },
  };

  try {
    const data = await docClient.send(new PutCommand(params));
    res.send(data);
  } catch (err) {
    console.error(err);
    res.send("This route should add an item in DynamoDB.");
  }
}
exports.deleteAssignment = async (req, res) => {
  const params = {
    TableName: process.env.aws_sendStatus_table,
    Key: {
      user_id: req.body.user_id,
      assignment_id: req.body.assignment_id,
    },
  };

  try {
    const data = await docClient.send(new DeleteCommand(params));
    res.send(data);
  } catch (err) {
    console.error(err);
    res.send("This route should delete an item in DynamoDB.");
  }
}
