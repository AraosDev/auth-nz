const { PORT, NODE_ENV } = process.env;

exports.DB_CONNECTION_SUCCESS = 'Master DB is connected sucessfully';
exports.SERVER_CONNECTED = `Server Running in port: ${PORT} on ${NODE_ENV} environment`;
