const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const adsmRouter = require('./routes/adsmRouter');
const globalErrorHandler = require('./models/globalErrorHandler');

const app = express();
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));

app.use('/api/v1/adsm/autnN', adsmRouter);

app.use(globalErrorHandler);

module.exports = app;
