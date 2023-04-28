module.exports = async(req, res, next) => {
    try {
        const profileOptions = {
            headers: {
                Authorization: `Bearer ${req.session.token.access_token}`,
            },
        };
        axios.get("https://www.mycourseville.com/api/v1/public/get/user/info", profileOptions)
        next();
    } catch (err) {
        console.log(err);
        res.status(401).send("Don't have permission to access this page.");
    }

}