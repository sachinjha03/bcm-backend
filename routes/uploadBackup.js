const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');


const router = express.Router();
const upload = multer();  // Store file in memory

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

router.post('/upload-backup', upload.single('file'), async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,  // Use env var here
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: req.file.originalname,
    };

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferToStream(req.file.buffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    res.status(200).json({ success: true, fileId: file.data.id });
  } catch (error) {
    console.error('Drive Upload Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
