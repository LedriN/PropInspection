const multer = require('multer');

// Memory storage - files will be stored in memory as Buffer
// and then saved to MongoDB GridFS
const storage = multer.memoryStorage();

// Accept images and PDFs
function fileFilter(_req, file, cb) {
	if (/^image\/(jpeg|png|webp|gif|jpg)$/i.test(file.mimetype) || 
	    file.mimetype === 'application/pdf') {
		cb(null, true);
	} else {
		cb(new Error('Only images and PDF files are allowed'));
	}
}

const upload = multer({
	storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB per file
		files: 50
	}
});

module.exports = {
	upload
};


