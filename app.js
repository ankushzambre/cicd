const rateLimit = require("express-rate-limit");
const compression = require("compression");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");

/* variables */
// express app instance
const app = express();

// holds all the allowed origins for cors access
let allowedOrigins = [
  "http://localhost:3000",
  "https://aragma.vercel.app",
  "https://aragma-web.vercel.app"
];

// limit the number of requests from a single IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  standardHeaders: false, // Disable rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/* Middleware */
// for compressing the response body
app.use(compression());
// helmet: secure express app by setting various HTTP headers. And serve cross origin resources.
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
// morgan: log requests to console in dev environment
app.use(morgan("dev"));
// allows cors access from allowedOrigins array
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

// parse requests of content-type - application/json
app.use(express.json({ extended: true }));

/* Routes */
app.use(
  "/role-permission",
  require("./routes/hr/rolePermission/rolePermission.routes")
);
app.use("/permission", require("./routes/hr/permission/permission.routes"));
app.use("/table", require("./routes/crm/table/table.routes"));
app.use("/user", limiter, require("./routes/user/user.routes"));
app.use("/role", require("./routes/hr/role/role.routes"));
app.use("/settings", require("./routes/settings/settings.routes"));
app.use("/email", require("./routes/email/email.routes"));
app.use("/email-config", require("./routes/emailConfig/emailConfig.routes"));
app.use("/crm-email", require("./routes/crm/crmEmail/crmEmail.routes"));
app.use(
  "/vouchers",
  require("./routes/crm/vouchers/vouchers.routes")
);
app.use(
  "/holiday",
  require("./routes/crm/holiday/holiday.routes")
);
app.use("/menu", require("./routes/menu/menu.routes"));
app.use("/daily-menu", require("./routes/dailyMenu/dailyMenu.routes"));
app.use("/taste-menu", require("./routes/tasteMenu/tasteMenu.routes"));
app.use("/branch", require("./routes/branch/branch.routes"));
app.use("/reservation", require("./routes/reservation/reservation.routes"));
app.use("/waiting", require("./routes/crm/waitingList/waitingList.routes"));
app.use("/files", require("./routes/files/files.routes"));

module.exports = app;
