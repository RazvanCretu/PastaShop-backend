module.exports = ({ env }) => ({
  connection: {
    client: "mysql",
    connection: {
      connectionString: env("STRAPI_MYSQL_STRING"),
    },
  },
});
