const express = require('express');
const path = require('path');

// Serve static files from the uploads directory
const serveStaticFiles = express.static(path.join(__dirname, '../../uploads'));

module.exports = serveStaticFiles; 