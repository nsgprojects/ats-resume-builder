const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // store in buffer, no disk writes

const fileFilter = (req, file, cb) => {
  const allowed = ['.docx', '.txt', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported. Allowed: ${allowed.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

module.exports = upload;
