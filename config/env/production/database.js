const mysql = require("mysql");

const connection = mysql.createConnection(
  `${process.env.STRAPI_CLEARDB_STRING}`
);

module.exports = ({ env }) => ({
  connection: {
    client: "mysql",
    connection: {
      host: connection.config.host,
      port: connection.config.port,
      database: connection.config.database,
      user: connection.config.user,
      password: connection.config.password,
      ssl: {
        rejectUnauthorized: env.bool("CLEARDB_SSL", false), // For self-signed certificates
      },
    },
  },
});
